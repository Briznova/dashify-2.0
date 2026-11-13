import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as argon2 from "argon2";
import cookieParser from "cookie-parser";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/infrastructure/database/prisma.service";

const database = process.env.SCHOOL_ADMIN_E2E_DATABASE_URL;
const run = database ? describe : describe.skip;

run("school administrator provisioning (isolated PostgreSQL)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let schoolId: string;
  let operatorCookies: string[];
  let operatorCsrf: string;
  let readerCookies: string[];
  let readerCsrf: string;
  const origin = "http://localhost:3000";
  const password = "Synthetic-local-test-password";

  function cookies(response: request.Response) {
    const values: unknown = response.headers["set-cookie"];
    if (!Array.isArray(values) || !values.every((value: unknown) => typeof value === "string")) throw new Error("Missing cookies");
    const csrf = values.find((value) => value.startsWith("dashify_csrf="))?.split(";")[0].split("=")[1];
    if (!csrf) throw new Error("Missing CSRF cookie");
    return { cookies: values as string[], csrf: decodeURIComponent(csrf) };
  }
  async function login(email: string) {
    return cookies(await request(app.getHttpServer()).post("/api/v1/auth/login")
      .set("Origin", origin).send({ email, password }).expect(200));
  }
  beforeAll(async () => {
    const url = new URL(database!);
    if (!["127.0.0.1", "localhost"].includes(url.hostname) ||
      !/^\/dashify_localadmin_test_[0-9a-f]{12}$/.test(url.pathname) ||
      process.env.DATABASE_URL !== database || process.env.DIRECT_URL !== database) {
      throw new Error("Local admin e2e requires a unique isolated loopback test database");
    }
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    const passwordHash = await argon2.hash(password);
    await prisma.user.create({ data: {
      email: "local-operator@example.test", firstName: "Synthetic", passwordHash,
      platformAdminGrant: { create: { permissions: { create: { permission: "SCHOOL_ADMINS_CREATE" } } } },
    } });
    await prisma.user.create({ data: {
      email: "local-reader@example.test", firstName: "Synthetic", passwordHash,
      platformAdminGrant: { create: {} },
    } });
    schoolId = (await prisma.school.create({ data: { name: "Synthetic School", code: "LOCAL-TEST", onboardingState: { create: {} } } })).id;
    ({ cookies: operatorCookies, csrf: operatorCsrf } = await login("local-operator@example.test"));
    ({ cookies: readerCookies, csrf: readerCsrf } = await login("local-reader@example.test"));
  });
  afterAll(async () => { if (app) await app.close(); });

  it("provisions a normal scoped administrator with the configured shared password", async () => {
    const url = `/api/v1/platform/schools/${schoolId}/admins`;
    const body = { firstName: "Synthetic", lastName: "Admin", email: "NEW-LOCAL@EXAMPLE.TEST" };
    const post = () => request(app.getHttpServer()).post(url).set("Origin", origin)
      .set("Cookie", operatorCookies).set("X-CSRF-Token", operatorCsrf);
    await request(app.getHttpServer()).post(url).set("Origin", origin).set("Cookie", readerCookies)
      .set("X-CSRF-Token", readerCsrf).send(body).expect(403);
    await request(app.getHttpServer()).post(url).set("Origin", origin).set("Cookie", operatorCookies).send(body).expect(403);
    const response = await post().send(body).expect(201);
    expect(response.body).toEqual({ id: expect.any(String), schoolId, email: "new-local@example.test" });
    expect(JSON.stringify(response.body)).not.toContain(password);
    await post().send({ ...body, email: "new-local@example.test" }).expect(409);
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "new-local@example.test" } });
    expect(await argon2.verify(user.passwordHash, password)).toBe(true);
    expect((await prisma.schoolOnboardingState.findUniqueOrThrow({ where: { schoolId } })).status).toBe("NOT_STARTED");
    const audit = await prisma.auditLog.findFirstOrThrow({ where: { action: "PLATFORM_SCHOOL_ADMIN_CREATED" } });
    expect(JSON.stringify(audit)).not.toContain(password);
    expect(JSON.stringify(audit)).not.toContain(body.email);
    const initial = await login(user.email);
    const selected = cookies(await request(app.getHttpServer()).post("/api/v1/auth/active-school")
      .set("Origin", origin).set("Cookie", initial.cookies).set("X-CSRF-Token", initial.csrf)
      .send({ schoolId, workspaceRole: "school_admin" }).expect(200));
    const me = await request(app.getHttpServer()).get("/api/v1/auth/me").set("Cookie", selected.cookies).expect(200);
    expect(me.body.permissionKeys).toEqual(expect.arrayContaining(["school.update", "academic_structure.manage"]));
    const parallel = await Promise.all([
      post().send({ firstName: "Synthetic", email: "race@example.test" }),
      post().send({ firstName: "Synthetic", email: "RACE@EXAMPLE.TEST" }),
    ]);
    expect(parallel.map((result) => result.status).sort()).toEqual([201, 409]);
    expect(await prisma.user.count({ where: { email: { equals: "race@example.test", mode: "insensitive" } } })).toBe(1);
  });
});
