import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as argon2 from "argon2";
import cookieParser from "cookie-parser";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/infrastructure/database/prisma.service";

const database = process.env.SCHOOL_ONBOARDING_E2E_DATABASE_URL;
const run = database ? describe : describe.skip;

run("school onboarding (isolated PostgreSQL)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const origin = "http://localhost:3000";
  const password = "Synthetic-onboarding-password-123";
  let schoolId: string;
  let otherSchoolId: string;
  let schoolCookies: string[];
  let schoolCsrf: string;
  let platformCookies: string[];
  let platformCsrf: string;

  function cookies(response: request.Response) {
    const values: unknown = response.headers["set-cookie"];
    if (!Array.isArray(values) || !values.every((value: unknown) => typeof value === "string")) {
      throw new Error("Missing test cookies");
    }
    const csrf = values.find((value) => value.startsWith("dashify_csrf="))?.split(";")[0].split("=")[1];
    if (!csrf) throw new Error("Missing test CSRF cookie");
    return { cookies: values as string[], csrf: decodeURIComponent(csrf) };
  }

  beforeAll(async () => {
    const url = new URL(database!);
    if (!["127.0.0.1", "localhost"].includes(url.hostname) ||
      !/^\/dashify_onboard_test_[0-9a-f]{12}$/.test(url.pathname) ||
      process.env.DATABASE_URL !== database || process.env.DIRECT_URL !== database) {
      throw new Error("Onboarding e2e requires both URLs to target a unique isolated loopback test database");
    }
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    const passwordHash = await argon2.hash(password);
    const school = await prisma.school.create({ data: { name: "Synthetic School A", code: "ONBOARD-A", onboardingState: { create: {} } } });
    const other = await prisma.school.create({ data: { name: "Synthetic School B", code: "ONBOARD-B", onboardingState: { create: {} } } });
    schoolId = school.id;
    otherSchoolId = other.id;
    const permission = await prisma.permission.create({ data: { key: "school.update" } });
    const role = await prisma.role.create({
      data: { schoolId, key: "SCHOOL_ADMIN", name: "School Admin", permissions: { create: { permissionId: permission.id } } },
    });
    const user = await prisma.user.create({ data: { email: "onboard-admin@example.test", passwordHash, firstName: "Synthetic" } });
    await prisma.schoolMembership.create({
      data: { userId: user.id, schoolId, status: "ACTIVE", roles: { create: { roleId: role.id } } },
    });
    await prisma.user.create({
      data: { email: "onboard-platform@example.test", passwordHash, firstName: "Synthetic",
        platformAdminGrant: { create: { permissions: { create: { permission: "SUPPORT_READ" } } } } },
    });
    const login = async (email: string) => cookies(await request(app.getHttpServer()).post("/api/v1/auth/login")
      .set("Origin", origin).send({ email, password }).expect(200));
    const initial = await login("onboard-admin@example.test");
    const selected = await request(app.getHttpServer()).post("/api/v1/auth/active-school")
      .set("Origin", origin).set("Cookie", initial.cookies).set("X-CSRF-Token", initial.csrf)
      .send({ schoolId, workspaceRole: "school_admin" }).expect(200);
    ({ cookies: schoolCookies, csrf: schoolCsrf } = cookies(selected));
    ({ cookies: platformCookies, csrf: platformCsrf } = await login("onboard-platform@example.test"));
  });

  afterAll(async () => { if (app) await app.close(); });

  it("isolates prerequisites, enforces scope and records an idempotent confirmation", async () => {
    const makeStructure = async (id: string) => {
      await prisma.academicYear.create({ data: { schoolId: id, name: "Synthetic year", startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31") } });
      await prisma.schoolClass.create({ data: { schoolId: id, name: "Synthetic class", code: "C1", sections: { create: { schoolId: id, name: "Synthetic section", code: "A" } } } });
    };
    const read = () => request(app.getHttpServer()).get("/api/v1/schools/current/onboarding").set("Cookie", schoolCookies);
    const confirm = () => request(app.getHttpServer()).post("/api/v1/schools/current/onboarding/complete")
      .set("Origin", origin).set("Cookie", schoolCookies).set("X-CSRF-Token", schoolCsrf);
    await makeStructure(otherSchoolId);
    expect((await read().expect(200)).body).toMatchObject({ status: "NOT_STARTED", prerequisites: { academicYear: false, classWithSection: false } });
    await confirm().expect(409);
    await request(app.getHttpServer()).post("/api/v1/schools/current/onboarding/complete")
      .set("Origin", origin).set("Cookie", platformCookies).set("X-CSRF-Token", platformCsrf).expect(403);
    await request(app.getHttpServer()).post("/api/v1/schools/current/onboarding/complete")
      .set("Origin", origin).set("Cookie", schoolCookies).expect(403);
    await makeStructure(schoolId);
    const results = await Promise.all([confirm().expect(201), confirm().expect(201)]);
    expect(results.map((result) => result.body.status)).toEqual(["COMPLETED", "COMPLETED"]);
    expect(await prisma.auditLog.count({ where: { schoolId, action: "SCHOOL_ONBOARDING_CONFIRMED" } })).toBe(1);
    expect((await read().expect(200)).body.status).toBe("COMPLETED");
    expect((await prisma.schoolOnboardingState.findUniqueOrThrow({ where: { schoolId: otherSchoolId } })).status).toBe("NOT_STARTED");
    expect((await request(app.getHttpServer()).get(`/api/v1/platform/schools/${schoolId}`).set("Cookie", platformCookies).expect(200)).body.onboardingState).toBe("COMPLETED");
    await prisma.school.create({ data: { name: "Synthetic Legacy School", code: "ONBOARD-LEGACY" } });
    const onboardingSummary = await request(app.getHttpServer()).get("/api/v1/platform/schools/onboarding-summary")
      .set("Cookie", platformCookies).expect(200);
    expect(onboardingSummary.body).toEqual({ completed: 1, notStarted: 1, unknown: 1 });
    expect(onboardingSummary.headers["cache-control"]).toBe("no-store");
    await request(app.getHttpServer()).get("/api/v1/platform/schools/onboarding-summary").set("Cookie", schoolCookies).expect(403);
    const supportUser = await prisma.user.findUniqueOrThrow({ where: { email: "onboard-platform@example.test" } });
    for (const status of ["OPEN", "IN_PROGRESS", "RESOLVED"] as const) {
      await prisma.platformSupportTicket.create({
        data: { schoolId, title: "Synthetic issue", description: "Synthetic details", createdById: supportUser.id, status },
      });
    }
    const summary = await request(app.getHttpServer()).get("/api/v1/platform/support-tickets/summary").set("Cookie", platformCookies).expect(200);
    expect(summary.body).toEqual({ unresolved: 2 });
    expect(summary.headers["cache-control"]).toBe("no-store");
    await request(app.getHttpServer()).get("/api/v1/platform/support-tickets/summary").set("Cookie", schoolCookies).expect(403);
  });
});
