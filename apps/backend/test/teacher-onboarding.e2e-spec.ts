import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as argon2 from "argon2";
import cookieParser from "cookie-parser";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/infrastructure/database/prisma.service";

const database = process.env.TEACHER_ONBOARDING_E2E_DATABASE_URL;
const run = database ? describe : describe.skip;

run("teacher onboarding (isolated PostgreSQL)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let schoolA: string;
  let schoolB: string;
  let adminA: { cookies: string[]; csrf: string };
  let adminB: { cookies: string[]; csrf: string };
  let principal: { cookies: string[]; csrf: string };
  const origin = "http://localhost:3000";
  const password = "Synthetic-test-password-123";

  function cookies(response: request.Response) {
    const values: unknown = response.headers["set-cookie"];
    if (!Array.isArray(values) || !values.every((value: unknown) => typeof value === "string")) {
      throw new Error("Missing session cookies");
    }
    const csrf = values.find((value) => value.startsWith("dashify_csrf="))?.split(";")[0].split("=")[1];
    if (!csrf) throw new Error("Missing CSRF cookie");
    return { cookies: values as string[], csrf: decodeURIComponent(csrf) };
  }

  async function login(email: string, schoolId: string, workspaceRole: string) {
    const initial = cookies(await request(app.getHttpServer()).post("/api/v1/auth/login")
      .set("Origin", origin).send({ email, password }).expect(200));
    return cookies(await request(app.getHttpServer()).post("/api/v1/auth/active-school")
      .set("Origin", origin).set("Cookie", initial.cookies).set("X-CSRF-Token", initial.csrf)
      .send({ schoolId, workspaceRole }).expect(200));
  }

  async function createActor(schoolId: string, email: string, roleKey: string) {
    const passwordHash = await argon2.hash(password);
    const role = await prisma.role.create({
      data: {
        schoolId, key: roleKey, name: roleKey, isSystem: true,
        permissions: { create: ["staff.read", "staff.manage", "school.update"].map((key) => ({
          permission: { connectOrCreate: { where: { key }, create: { key } } },
        })) },
      },
    });
    await prisma.user.create({
      data: {
        email, firstName: "Synthetic", passwordHash,
        memberships: { create: {
          schoolId, status: "ACTIVE", joinedAt: new Date(), roles: { create: { roleId: role.id } },
        } },
      },
    });
  }

  beforeAll(async () => {
    const url = new URL(database!);
    if (!["127.0.0.1", "localhost"].includes(url.hostname) ||
      !/^\/dashify_teacher_test_[0-9a-f]{12}$/.test(url.pathname) ||
      process.env.DATABASE_URL !== database || process.env.DIRECT_URL !== database) {
      throw new Error("Teacher onboarding e2e requires a unique isolated loopback test database");
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
    schoolA = (await prisma.school.create({ data: { name: "Synthetic A", code: "TEST-A" } })).id;
    schoolB = (await prisma.school.create({ data: { name: "Synthetic B", code: "TEST-B" } })).id;
    await createActor(schoolA, "admin-a@example.test", "SCHOOL_ADMIN");
    await createActor(schoolB, "admin-b@example.test", "SCHOOL_ADMIN");
    await createActor(schoolA, "principal@example.test", "PRINCIPAL");
    adminA = await login("admin-a@example.test", schoolA, "school_admin");
    adminB = await login("admin-b@example.test", schoolB, "school_admin");
    principal = await login("principal@example.test", schoolA, "principal");
  });

  afterAll(async () => { if (app) await app.close(); });

  it("creates a scoped Teacher account, provisions the standard role and supports login", async () => {
    const departmentResponse = await request(app.getHttpServer()).post("/api/v1/departments")
      .set("Origin", origin).set("Cookie", adminA.cookies).set("X-CSRF-Token", adminA.csrf)
      .send({ name: "Synthetic Department" }).expect(201);
    const departmentId = departmentResponse.body.id as string;
    const body = {
      employeeCode: "T-1", firstName: "Synthetic", email: " TEACHER@EXAMPLE.TEST ",
      password, departmentId,
    };
    const post = () => request(app.getHttpServer()).post("/api/v1/staff/teacher-accounts")
      .set("Origin", origin).set("Cookie", adminA.cookies).set("X-CSRF-Token", adminA.csrf);
    await request(app.getHttpServer()).post("/api/v1/staff/teacher-accounts")
      .set("Origin", origin).set("Cookie", principal.cookies).set("X-CSRF-Token", principal.csrf)
      .send(body).expect(403);
    await request(app.getHttpServer()).get("/api/v1/departments").set("Cookie", principal.cookies).expect(403);
    await request(app.getHttpServer()).post("/api/v1/staff/teacher-accounts")
      .set("Origin", origin).set("Cookie", adminA.cookies).send(body).expect(403);
    await post().send({ ...body, password: "short" }).expect(400);
    await post().send({ ...body, departmentId: null }).expect(400);
    const created = await post().send(body).expect(201);
    expect(created.body).toMatchObject({
      schoolId: schoolA, designation: "Teacher", departmentId,
      user: { email: "teacher@example.test" },
      departmentRecord: { name: "Synthetic Department" },
    });
    expect(JSON.stringify(created.body)).not.toContain(password);
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "teacher@example.test" } });
    expect(await argon2.verify(user.passwordHash, password)).toBe(true);
    const teacher = await login(user.email, schoolA, "teacher");
    const me = await request(app.getHttpServer()).get("/api/v1/auth/me").set("Cookie", teacher.cookies).expect(200);
    expect([...me.body.permissionKeys].sort()).toEqual(["announcements.read", "dashboard.teacher.read"]);
    await request(app.getHttpServer()).get("/api/v1/dashboard/teacher").set("Cookie", teacher.cookies).expect(200);
    await request(app.getHttpServer()).get("/api/v1/staff").set("Cookie", teacher.cookies).expect(403);
    await post().send({ ...body, employeeCode: "T-2" }).expect(409);
    const audit = await prisma.auditLog.findFirstOrThrow({ where: { action: "TEACHER_ACCOUNT_CREATED" } });
    expect(JSON.stringify(audit)).not.toContain(password);
    expect(JSON.stringify(audit)).not.toContain("teacher@example.test");
  });

  it("enforces department isolation, lifecycle and concurrent duplicate email rejection", async () => {
    const createA = () => request(app.getHttpServer()).post("/api/v1/staff/teacher-accounts")
      .set("Origin", origin).set("Cookie", adminA.cookies).set("X-CSRF-Token", adminA.csrf);
    const departmentB = await request(app.getHttpServer()).post("/api/v1/departments")
      .set("Origin", origin).set("Cookie", adminB.cookies).set("X-CSRF-Token", adminB.csrf)
      .send({ name: "Other Department" }).expect(201);
    const departmentId = departmentB.body.id as string;
    await request(app.getHttpServer()).post("/api/v1/departments")
      .set("Origin", origin).set("Cookie", adminB.cookies).set("X-CSRF-Token", adminB.csrf)
      .send({ name: "OTHER DEPARTMENT" }).expect(409);
    const input = { employeeCode: "T-3", firstName: "Synthetic", email: "race@example.test", password };
    await createA().send({ ...input, departmentId }).expect(404);
    await request(app.getHttpServer()).patch(`/api/v1/departments/${departmentId}`)
      .set("Origin", origin).set("Cookie", adminA.cookies).set("X-CSRF-Token", adminA.csrf)
      .send({ name: "Foreign" }).expect(404);
    const raced = await Promise.all([
      createA().send(input),
      createA().send({ ...input, employeeCode: "T-4", email: "RACE@EXAMPLE.TEST" }),
    ]);
    expect(raced.map((result) => result.status).sort()).toEqual([201, 409]);
    expect(await prisma.user.count({ where: { email: { equals: input.email, mode: "insensitive" } } })).toBe(1);
    const schoolDepartment = await prisma.schoolDepartment.findFirstOrThrow({ where: { schoolId: schoolA } });
    await request(app.getHttpServer()).patch(`/api/v1/departments/${schoolDepartment.id}`)
      .set("Origin", origin).set("Cookie", adminA.cookies).set("X-CSRF-Token", adminA.csrf)
      .send({ name: "Renamed Department" }).expect(200);
    const staff = await request(app.getHttpServer()).get("/api/v1/staff").set("Cookie", adminA.cookies).expect(200);
    expect(staff.body).toEqual(expect.arrayContaining([
      expect.objectContaining({ departmentRecord: expect.objectContaining({ name: "Renamed Department" }) }),
    ]));
    await request(app.getHttpServer()).patch(`/api/v1/departments/${schoolDepartment.id}`)
      .set("Origin", origin).set("Cookie", adminA.cookies).set("X-CSRF-Token", adminA.csrf)
      .send({ isActive: false }).expect(200);
    await createA().send({ ...input, email: "new@example.test", departmentId: schoolDepartment.id }).expect(404);
    const stillAssigned = await prisma.staffProfile.count({ where: { schoolId: schoolA, departmentId: schoolDepartment.id } });
    expect(stillAssigned).toBe(1);
    const assigned = await prisma.staffProfile.findFirstOrThrow({ where: { schoolId: schoolA, departmentId: schoolDepartment.id } });
    const patchStaff = () => request(app.getHttpServer()).patch(`/api/v1/staff/${assigned.id}`)
      .set("Origin", origin).set("Cookie", adminA.cookies).set("X-CSRF-Token", adminA.csrf);
    await patchStaff().send({ departmentId: schoolDepartment.id }).expect(200);
    await patchStaff().send({ departmentId }).expect(404);
    await patchStaff().send({ department: "Unconfigured" }).expect(404);
    await patchStaff().send({ designation: "Principal" }).expect(400);

    await prisma.role.create({ data: { schoolId: schoolB, key: "TEACHER", name: "Custom", isSystem: false } });
    await request(app.getHttpServer()).post("/api/v1/staff/teacher-accounts")
      .set("Origin", origin).set("Cookie", adminB.cookies).set("X-CSRF-Token", adminB.csrf)
      .send({ ...input, email: "custom-role@example.test" }).expect(409);
    expect(await prisma.user.count({ where: { email: "custom-role@example.test" } })).toBe(0);

    const teacher = await login("teacher@example.test", schoolA, "teacher");
    await request(app.getHttpServer()).post(`/api/v1/staff/${assigned.id}/deactivate`)
      .set("Origin", origin).set("Cookie", adminA.cookies).set("X-CSRF-Token", adminA.csrf)
      .send({}).expect(200);
    await request(app.getHttpServer()).get("/api/v1/auth/me").set("Cookie", teacher.cookies).expect(401);
    expect(await prisma.user.count({ where: { email: "teacher@example.test" } })).toBe(1);
  });
});
