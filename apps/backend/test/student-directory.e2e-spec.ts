import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as argon2 from "argon2";
import cookieParser from "cookie-parser";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/infrastructure/database/prisma.service";

const database = process.env.STUDENT_DIRECTORY_E2E_DATABASE_URL;
const run = database ? describe : describe.skip;

run("student directory (isolated PostgreSQL)", () => {
  jest.setTimeout(30000);
  let app: INestApplication;
  let prisma: PrismaService;
  let schoolId: string;
  let foreignYear: string;
  let yearId: string;
  let classId: string;
  let sectionId: string;
  let reader: { cookies: string[]; csrf: string };
  let denied: { cookies: string[]; csrf: string };
  let noCapacitySectionId: string;
  const origin = "http://localhost:3000";
  const password = "synthetic-directory-test-password";

  function cookies(response: request.Response) {
    const values: unknown = response.headers["set-cookie"];
    if (!Array.isArray(values) || !values.every((value: unknown) => typeof value === "string")) {
      throw new Error("Missing test cookies");
    }
    const csrf = values.find((value) => value.startsWith("dashify_csrf="))?.split(";")[0].split("=")[1];
    if (!csrf) throw new Error("Missing test CSRF cookie");
    return { cookies: values as string[], csrf: decodeURIComponent(csrf) };
  }

  async function login(email: string) {
    const initial = cookies(await request(app.getHttpServer()).post("/api/v1/auth/login")
      .set("Origin", origin).send({ email, password }).expect(200));
    return cookies(await request(app.getHttpServer()).post("/api/v1/auth/active-school")
      .set("Origin", origin).set("Cookie", initial.cookies).set("X-CSRF-Token", initial.csrf)
      .send({ schoolId, workspaceRole: "school_admin" }).expect(200));
  }

  function search(session = reader) {
    return request(app.getHttpServer()).post("/api/v1/students/search")
      .set("Origin", origin).set("Cookie", session.cookies).set("X-CSRF-Token", session.csrf);
  }

  beforeAll(async () => {
    const url = new URL(database!);
    if (!["127.0.0.1", "localhost"].includes(url.hostname) ||
      !/^\/dashify_students_test_[0-9a-f]{12}$/.test(url.pathname) ||
      process.env.DATABASE_URL !== database || process.env.DIRECT_URL !== database) {
      throw new Error("Student directory e2e requires a unique isolated loopback test database");
    }
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true, forbidNonWhitelisted: true, transform: true,
      transformOptions: { enableImplicitConversion: true },
    }));
    await app.init();
    prisma = app.get(PrismaService);

    schoolId = (await prisma.school.create({ data: { name: "Synthetic School", code: "STUDENTS-A" } })).id;
    const otherSchoolId = (await prisma.school.create({ data: { name: "Other Synthetic School", code: "STUDENTS-B" } })).id;
    const year = await prisma.academicYear.create({ data: { schoolId, name: "Synthetic year", startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31") } });
    yearId = year.id;
    foreignYear = (await prisma.academicYear.create({ data: { schoolId: otherSchoolId, name: "Other year", startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31") } })).id;
    classId = (await prisma.schoolClass.create({ data: { schoolId, name: "Synthetic class", code: "S" } })).id;
    sectionId = (await prisma.section.create({ data: { schoolId, classId, name: "Synthetic section", code: "S" } })).id;
    const otherSection = await prisma.section.create({ data: { schoolId, classId, name: "Second section", code: "T" } });
    noCapacitySectionId = otherSection.id;

    const students = await Promise.all(Array.from({ length: 22 }, (_, index) =>
      prisma.student.create({ data: {
        schoolId, firstName: index === 21 ? "Needle" : `Synthetic${index}`,
        lastName: "Example", admissionNumber: `TEST-${index}`, admissionDate: new Date("2026-01-01"),
        status: index === 1 ? "INACTIVE" : "ACTIVE",
      } }),
    ));
    await prisma.student.create({ data: { schoolId, firstName: "Literal%_Value", lastName: "Example", admissionNumber: "TEST-LITERAL", admissionDate: new Date("2026-01-01") } });
    await prisma.student.create({ data: { schoolId, firstName: "Needle", lastName: "Archived", admissionNumber: "TEST-ARCHIVED", admissionDate: new Date("2026-01-01"), status: "ARCHIVED" } });
    await prisma.student.create({ data: { schoolId: otherSchoolId, firstName: "Needle", lastName: "Foreign", admissionNumber: "FOREIGN", admissionDate: new Date("2026-01-01") } });
    await prisma.studentEnrolment.createMany({ data: [
      { schoolId, studentId: students[0].id, academicYearId: yearId, classId, sectionId, startDate: new Date("2026-01-01") },
      { schoolId, studentId: students[1].id, academicYearId: yearId, classId, sectionId: otherSection.id, startDate: new Date("2026-01-01") },
      { schoolId, studentId: students[2].id, academicYearId: yearId, classId, sectionId, startDate: new Date("2026-01-01"), isActive: false },
      { schoolId, studentId: students[3].id, academicYearId: yearId, classId, sectionId, startDate: new Date("2026-01-01") },
      { schoolId, studentId: students[3].id, academicYearId: yearId, classId, sectionId: otherSection.id, startDate: new Date("2026-01-01") },
    ] });

    const permission = await prisma.permission.create({ data: { key: "students.read" } });
    const readRole = await prisma.role.create({ data: { schoolId, key: "SCHOOL_ADMIN", name: "Reader", permissions: { create: { permissionId: permission.id } } } });
    for (const key of ["students.create", "students.update", "school.update", "academic_structure.read", "academic_structure.manage"]) {
      const grant = await prisma.permission.create({ data: { key } });
      await prisma.rolePermission.create({ data: { roleId: readRole.id, permissionId: grant.id } });
    }
    const deniedRole = await prisma.role.create({ data: { schoolId, key: "SCHOOL_ADMIN_DENIED", name: "Denied" } });
    const schoolUpdate = await prisma.permission.findUniqueOrThrow({ where: { key: "school.update" } });
    await prisma.rolePermission.create({ data: { roleId: deniedRole.id, permissionId: schoolUpdate.id } });
    const passwordHash = await argon2.hash(password);
    for (const [email, roleId] of [["reader@example.test", readRole.id], ["denied@example.test", deniedRole.id]]) {
      const user = await prisma.user.create({ data: { email, firstName: "Synthetic", passwordHash } });
      await prisma.schoolMembership.create({ data: { schoolId, userId: user.id, status: "ACTIVE", roles: { create: { roleId } } } });
    }
    reader = await login("reader@example.test");
    const initial = cookies(await request(app.getHttpServer()).post("/api/v1/auth/login").set("Origin", origin)
      .send({ email: "denied@example.test", password }).expect(200));
    denied = cookies(await request(app.getHttpServer()).post("/api/v1/auth/active-school")
      .set("Origin", origin).set("Cookie", initial.cookies).set("X-CSRF-Token", initial.csrf)
      .send({ schoolId, workspaceRole: "school_admin_denied" }).expect(200));
  });

  afterAll(async () => { if (app) await app.close(); });

  it("searches the whole school, handles literal wildcard characters, and excludes archived and foreign records", async () => {
    const page = await search().send({ page: 1, pageSize: 2 }).expect(200);
    expect(page.body.meta).toEqual({ page: 1, pageSize: 2, total: 23, totalPages: 12 });
    const nextPage = await search().send({ page: 2, pageSize: 2 }).expect(200);
    expect(nextPage.body.data.every((student: { id: string }) =>
      !page.body.data.some((first: { id: string }) => first.id === student.id))).toBe(true);
    expect(page.headers["cache-control"]).toBe("no-store");
    const match = await search().send({ query: "needle example" }).expect(200);
    expect(match.body.data.map((student: { admissionNumber: string }) => student.admissionNumber)).toEqual(["TEST-21"]);
    const literal = await search().send({ query: "%_" }).expect(200);
    expect(literal.body.data.map((student: { admissionNumber: string }) => student.admissionNumber)).toEqual(["TEST-LITERAL"]);
    expect((await search().send({ query: "FOREIGN" }).expect(200)).body.meta.total).toBe(0);
    expect((await search().send({ academicYearId: foreignYear }).expect(200)).body.meta.total).toBe(0);
  });

  it("combines placement and status filters and returns only matching active placements", async () => {
    const filtered = await search().send({ academicYearId: yearId, classId, sectionId, status: "ACTIVE" }).expect(200);
    expect(filtered.body.meta.total).toBe(2);
    expect(filtered.body.data.every((student: { enrolments: { sectionId: string; isActive: boolean }[] }) =>
      student.enrolments.length === 1 && student.enrolments[0].sectionId === sectionId && student.enrolments[0].isActive)).toBe(true);
    const ambiguous = await search().send({ query: "TEST-3" }).expect(200);
    expect(ambiguous.body.data[0].enrolments).toHaveLength(2);
    expect((await search().send({ status: "INACTIVE" }).expect(200)).body.meta.total).toBe(1);
  });

  it("enforces authentication, permission, CSRF, and bounded input", async () => {
    await request(app.getHttpServer()).post("/api/v1/students/search").send({}).expect(401);
    await search(denied).send({}).expect(403);
    await request(app.getHttpServer()).post("/api/v1/students/search").set("Origin", origin)
      .set("Cookie", reader.cookies).send({}).expect(403);
    for (const body of [{ page: 0 }, { page: true }, { pageSize: "2" }, { pageSize: 101 }, { status: "ARCHIVED" }, { classId: "invalid" }, { query: 42 }, { query: "a".repeat(101) }, { extra: true }]) {
      await search().send(body).expect(400);
    }
  });

  it("creates admissions with annual IDs, contacts and school-scoped settings", async () => {
    const settings = () => request(app.getHttpServer()).get("/api/v1/schools/current/admission-settings").set("Cookie", reader.cookies);
    expect((await settings().expect(200)).body.prefix).toBe("STUDENTS-A");
    const patch = () => request(app.getHttpServer()).patch("/api/v1/schools/current/admission-settings")
      .set("Origin", origin).set("Cookie", reader.cookies).set("X-CSRF-Token", reader.csrf);
    await patch().send({ prefix: " admission " }).expect(200, { prefix: "ADMISSION" });
    await request(app.getHttpServer()).get("/api/v1/schools/current/admission-settings").set("Cookie", denied.cookies).expect(403);
    await request(app.getHttpServer()).patch("/api/v1/schools/current/admission-settings")
      .set("Origin", origin).set("Cookie", reader.cookies).send({ prefix: "TEST" }).expect(403);
    await patch().send({ prefix: "bad prefix" }).expect(400);
    await patch().send({ prefix: 123 }).expect(400);

    await prisma.student.create({ data: { schoolId, firstName: "Synthetic", admissionNumber: "ADMISSION-2026-0001", admissionDate: new Date("2026-01-01") } });
    const body = admissionBody(noCapacitySectionId);
    const created = await create().send(body).expect(201);
    expect(created.body).toMatchObject({
      admissionNumber: "ADMISSION-2026-0002", status: "ACTIVE",
      emergencyContactKind: "OTHER", emergencyContactName: "Synthetic Contact",
      address: { city: "Synthetic City" },
    });
    const detail = await request(app.getHttpServer()).get(`/api/v1/students/${created.body.id}`).set("Cookie", reader.cookies).expect(200);
    expect(detail.body.enrolments[0].rollNumber).toBe("A1");
    expect(detail.body.guardians).toHaveLength(1);
    const nextYear = await create().send({
      ...body, admissionDate: "2027-01-01", rollNumber: undefined,
      emergencyContact: { kind: "PRIMARY_GUARDIAN" },
    }).expect(201);
    expect(nextYear.body.admissionNumber).toBe("ADMISSION-2027-0001");
    expect(nextYear.body.emergencyContactKind).toBe("PRIMARY_GUARDIAN");
    expect(nextYear.body.emergencyContactPhone).toBeNull();
    const directory = await search().send({ query: created.body.admissionNumber }).expect(200);
    expect(directory.body.data[0]).not.toHaveProperty("emergencyContactPhone");
    expect(directory.body.data[0]).not.toHaveProperty("address");
    const audit = await prisma.auditLog.findFirstOrThrow({ where: { resourceId: created.body.id, action: "STUDENT_CREATED" } });
    expect(JSON.stringify(audit)).not.toContain("Synthetic Contact");
    expect(JSON.stringify(audit)).not.toContain(created.body.admissionNumber);
  });

  it("validates admissions and serializes concurrent capacity and roll reservations", async () => {
    const section = await prisma.section.create({ data: { schoolId, classId, name: "Limited", code: "LIMIT", capacity: 1 } });
    const body = admissionBody(section.id);
    await create().send({ ...body, guardians: [] }).expect(400);
    await create().send({ ...body, dateOfBirth: "2027-01-01" }).expect(400);
    await create().send({ ...body, dateOfBirth: "2016-02-30" }).expect(400);
    await create().send({ ...body, firstName: 123 }).expect(400);
    await create().send({ ...body, guardians: [...body.guardians, ...body.guardians] }).expect(400);
    await create().send({ ...body, emergencyContact: { kind: "PRIMARY_GUARDIAN", phone: "+14155552671" } }).expect(400);
    await create().send({ ...body, admissionNumber: "MANUAL" }).expect(400);
    await create().send({ ...body, academicYearId: foreignYear }).expect(404);
    await create(denied).send(body).expect(403);
    const capacity = await Promise.all([create().send({ ...body, rollNumber: "R1" }), create().send({ ...body, rollNumber: "R2" })]);
    expect(capacity.map((response) => response.status).sort()).toEqual([201, 409]);
    const rolls = await Promise.all([create().send({ ...body, sectionId: noCapacitySectionId, rollNumber: "RACE" }), create().send({ ...body, sectionId: noCapacitySectionId, rollNumber: "RACE" })]);
    expect(rolls.map((response) => response.status).sort()).toEqual([201, 409]);
    const enrolment = await prisma.studentEnrolment.findFirstOrThrow({ where: { schoolId, rollNumber: "RACE" } });
    await prisma.studentEnrolment.update({ where: { id: enrolment.id }, data: { endDate: new Date("2026-02-01") } });
    await create().send({ ...body, sectionId: noCapacitySectionId, rollNumber: "RACE" }).expect(201);
    const occupiedStudent = capacity.find((response) => response.status === 201)!.body.id;
    await prisma.student.update({ where: { id: occupiedStudent }, data: { status: "ARCHIVED" } });
    await create().send({ ...body, rollNumber: "AFTER-ARCHIVE" }).expect(201);
    const target = await prisma.student.create({ data: {
      schoolId, firstName: "Synthetic", admissionNumber: "SYNTHETIC-CORRECTION",
      admissionDate: new Date("2028-01-01"),
    } });
    const correction = request(app.getHttpServer()).patch(`/api/v1/students/${target.id}`)
      .set("Origin", origin).set("Cookie", reader.cookies).set("X-CSRF-Token", reader.csrf)
      .send({ admissionNumber: "ADMISSION-2028-0001" });
    const [createResult, correctionResult] = await Promise.all([
      create().send({ ...body, sectionId: noCapacitySectionId, admissionDate: "2028-01-01", rollNumber: undefined }),
      correction,
    ]);
    expect(createResult.status).toBe(201);
    expect([200, 409]).toContain(correctionResult.status);
    if (correctionResult.status === 200) expect(createResult.body.admissionNumber).toBe("ADMISSION-2028-0002");
  });

  it("edits school-scoped classes and sections and serializes capacity changes with admission", async () => {
    const put = (path: string, session = reader) => request(app.getHttpServer()).put(path)
      .set("Origin", origin).set("Cookie", session.cookies).set("X-CSRF-Token", session.csrf);
    const section = await prisma.section.create({ data: {
      schoolId, classId, name: "Capacity race", code: "CAP-RACE", capacity: 2,
    } });
    const path = `/api/v1/classes/${classId}/sections/${section.id}`;
    const edit = { name: "Capacity race", code: "CAP-RACE", capacity: 1 };
    await create().send({ ...admissionBody(section.id), rollNumber: "CAP-1" }).expect(201);
    await put(path, denied).send(edit).expect(403);
    await request(app.getHttpServer()).put(path).set("Origin", origin).set("Cookie", reader.cookies).send(edit).expect(403);
    await put(path).send({ ...edit, capacity: 0 }).expect(400);
    await put(path).send({ ...edit, schoolId }).expect(400);
    await put(`/api/v1/classes/${classId}/sections/00000000-0000-4000-8000-000000000000`).send(edit).expect(404);
    const foreignSchool = (await prisma.academicYear.findUniqueOrThrow({ where: { id: foreignYear } })).schoolId;
    const foreignClass = await prisma.schoolClass.create({ data: { schoolId: foreignSchool, name: "Foreign", code: "FOREIGN" } });
    const foreignSection = await prisma.section.create({ data: { schoolId: foreignSchool, classId: foreignClass.id, name: "Foreign", code: "F" } });
    await put(`/api/v1/classes/${foreignClass.id}`).send({ name: "Foreign", code: "F", sortOrder: 1 }).expect(404);
    await put(`/api/v1/classes/${foreignClass.id}/sections/${foreignSection.id}`).send(edit).expect(404);
    await put(path).send({ ...edit, code: "S" }).expect(409);
    const [admission, update] = await Promise.all([
      create().send({ ...admissionBody(section.id), rollNumber: "CAP-2" }),
      put(path).send(edit),
    ]);
    expect([[201, 409], [409, 200]]).toContainEqual([admission.status, update.status]);
    const saved = await prisma.section.findUniqueOrThrow({ where: { id: section.id } });
    const count = await prisma.studentEnrolment.count({
      where: { schoolId, sectionId: section.id, academicYearId: yearId, isActive: true, endDate: null, student: { is: { schoolId, status: { not: "ARCHIVED" } } } },
    });
    expect(saved.capacity).not.toBeNull();
    expect(count).toBeLessThanOrEqual(saved.capacity ?? 0);
    await put(path).send({ ...edit, capacity: null }).expect(200);
    await put(`/api/v1/classes/${classId}`).send({ name: "Edited class", code: "S", sortOrder: 5 }).expect(200);
    expect(await prisma.auditLog.count({ where: { schoolId, resourceId: classId, action: "CLASS_UPDATED" } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { schoolId, resourceId: section.id, action: "SECTION_UPDATED" } })).toBeGreaterThan(0);
  });

  function create(session = reader) {
    return request(app.getHttpServer()).post("/api/v1/students")
      .set("Origin", origin).set("Cookie", session.cookies).set("X-CSRF-Token", session.csrf);
  }

  function admissionBody(section: string) {
    return {
      firstName: "Synthetic", lastName: "Learner", dateOfBirth: "2016-01-01", admissionDate: "2026-01-01",
      academicYearId: yearId, classId, sectionId: section, rollNumber: "A1",
      guardians: [{ firstName: "Synthetic Guardian", relationship: "GUARDIAN", phone: "+14155552671", isPrimary: true }],
      emergencyContact: { kind: "OTHER", name: "Synthetic Contact", phone: "+14155552671" },
      address: { city: "Synthetic City" },
    };
  }
});
