import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as argon2 from "argon2";
import cookieParser from "cookie-parser";
import request from "supertest";
import { createHash } from "crypto";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/infrastructure/database/prisma.service";
import { AuthService } from "../src/modules/auth/auth.service";

const database = process.env.PASSWORD_CHANGE_E2E_DATABASE_URL;
const run = database ? describe : describe.skip;

run("password change (isolated PostgreSQL)", () => {
  jest.setTimeout(30000);
  let app: INestApplication;
  let prisma: PrismaService;
  let auth: AuthService;
  let schoolId: string;
  const origin = "http://localhost:3000";
  const oldPassword = "synthetic-old-password";
  const newPassword = "synthetic-new-password";

  function cookies(response: request.Response) {
    const values: unknown = response.headers["set-cookie"];
    if (
      !Array.isArray(values) ||
      !values.every((value: unknown) => typeof value === "string")
    ) {
      throw new Error("Missing test cookies");
    }
    const csrf = values
      .find((value) => value.startsWith("dashify_csrf="))
      ?.split(";")[0]
      .split("=")[1];
    if (!csrf) throw new Error("Missing test CSRF cookie");
    return { cookies: values as string[], csrf: decodeURIComponent(csrf) };
  }

  async function login(email: string, password = oldPassword) {
    return cookies(
      await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .set("Origin", origin)
        .send({ email, password })
        .expect(200),
    );
  }

  async function selectSchool(session: { cookies: string[]; csrf: string }) {
    return cookies(
      await request(app.getHttpServer())
        .post("/api/v1/auth/active-school")
        .set("Origin", origin)
        .set("Cookie", session.cookies)
        .set("X-CSRF-Token", session.csrf)
        .send({ schoolId, workspaceRole: "school_admin" })
        .expect(200),
    );
  }

  beforeAll(async () => {
    const url = new URL(database!);
    if (
      !["127.0.0.1", "localhost"].includes(url.hostname) ||
      !/^\/dashify_password_test_[0-9a-f]{12}$/.test(url.pathname) ||
      process.env.DATABASE_URL !== database ||
      process.env.DIRECT_URL !== database
    ) {
      throw new Error(
        "Password e2e requires both URLs to target a unique isolated loopback test database",
      );
    }
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
    auth = app.get(AuthService);
    const passwordHash = await argon2.hash(oldPassword);
    schoolId = (
      await prisma.school.create({
        data: { name: "Synthetic School", code: "PASSWORD-TEST" },
      })
    ).id;
    const role = await prisma.role.create({
      data: { schoolId, key: "SCHOOL_ADMIN", name: "School Admin" },
    });
    for (const email of [
      "password-school@example.test",
      "password-race@example.test",
    ]) {
      const user = await prisma.user.create({
        data: { email, passwordHash, firstName: "Synthetic" },
      });
      await prisma.schoolMembership.create({
        data: {
          userId: user.id,
          schoolId,
          status: "ACTIVE",
          roles: { create: { roleId: role.id } },
        },
      });
    }
    await prisma.user.create({
      data: {
        email: "password-platform@example.test",
        passwordHash,
        firstName: "Synthetic",
        platformAdminGrant: { create: {} },
      },
    });
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it("enforces validation and CSRF while preserving only the current school and platform sessions", async () => {
    const school = await selectSchool(
      await login("password-school@example.test"),
    );
    const otherSchool = await selectSchool(
      await login("password-school@example.test"),
    );
    const platform = await login("password-platform@example.test");
    const otherPlatform = await login("password-platform@example.test");
    const schoolUser = await prisma.user.findUniqueOrThrow({
      where: { email: "password-school@example.test" },
    });
    await prisma.refreshToken.create({
      data: {
        userId: schoolUser.id,
        tokenHash: "synthetic-legacy-token",
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    const post = (session: { cookies: string[]; csrf: string }) =>
      request(app.getHttpServer())
        .post("/api/v1/auth/change-password")
        .set("Origin", origin)
        .set("Cookie", session.cookies)
        .set("X-CSRF-Token", session.csrf);

    await request(app.getHttpServer())
      .post("/api/v1/auth/change-password")
      .set("Origin", origin)
      .set("Cookie", school.cookies)
      .send({ currentPassword: oldPassword, newPassword })
      .expect(403);
    await post(school)
      .send({ currentPassword: oldPassword, newPassword: "short" })
      .expect(400);
    await post(school)
      .send({ currentPassword: "incorrect-synthetic-password", newPassword })
      .expect(400);
    expect(
      await argon2.verify(
        (await prisma.user.findUniqueOrThrow({ where: { id: schoolUser.id } }))
          .passwordHash,
        oldPassword,
      ),
    ).toBe(true);

    await post(school)
      .send({ currentPassword: oldPassword, newPassword })
      .expect(204);
    await post(platform)
      .send({ currentPassword: oldPassword, newPassword })
      .expect(204);
    for (const session of [school, platform]) {
      await request(app.getHttpServer())
        .get("/api/v1/auth/me")
        .set("Cookie", session.cookies)
        .expect(200);
      await request(app.getHttpServer())
        .post("/api/v1/auth/refresh")
        .set("Origin", origin)
        .set("Cookie", session.cookies)
        .set("X-CSRF-Token", session.csrf)
        .expect(200);
    }
    for (const session of [otherSchool, otherPlatform]) {
      await request(app.getHttpServer())
        .get("/api/v1/auth/me")
        .set("Cookie", session.cookies)
        .expect(401);
      await request(app.getHttpServer())
        .post("/api/v1/auth/refresh")
        .set("Origin", origin)
        .set("Cookie", session.cookies)
        .set("X-CSRF-Token", session.csrf)
        .expect(401);
    }
    expect(
      (
        await prisma.refreshToken.findFirstOrThrow({
          where: { tokenHash: "synthetic-legacy-token" },
        })
      ).revokedAt,
    ).not.toBeNull();
    for (const email of [
      "password-school@example.test",
      "password-platform@example.test",
    ]) {
      await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .set("Origin", origin)
        .send({ email, password: oldPassword })
        .expect(401);
      await login(email, newPassword);
    }
    const audits = await prisma.auditLog.findMany({
      where: { action: { in: ["PASSWORD_CHANGED", "PASSWORD_CHANGE_FAILED"] } },
    });
    expect(audits.map((entry) => entry.action).sort()).toEqual([
      "PASSWORD_CHANGED",
      "PASSWORD_CHANGED",
      "PASSWORD_CHANGE_FAILED",
    ]);
    expect(JSON.stringify(audits)).not.toContain(oldPassword);
    expect(JSON.stringify(audits)).not.toContain(newPassword);
    await post(school)
      .send({ currentPassword: "incorrect-synthetic-password", newPassword })
      .expect(400);
    await post(school)
      .send({ currentPassword: newPassword, newPassword })
      .expect(429);
  });

  it("serializes concurrent login and refresh against a password change", async () => {
    const email = "password-race@example.test";
    const first = await auth.login({ email, password: oldPassword });
    const second = await auth.login({ email, password: oldPassword });
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const firstHash = createHash("sha256")
      .update(first.credentials.refreshToken)
      .digest("hex");
    const sessionId = (
      await prisma.refreshToken.findFirstOrThrow({
        where: { tokenHash: firstHash },
      })
    ).sessionId;
    if (!sessionId) throw new Error("Missing test session ID");
    const outcomes = await Promise.allSettled([
      auth.changePassword(user.id, sessionId, {
        currentPassword: oldPassword,
        newPassword,
      }),
      auth.login({ email, password: oldPassword }),
      auth.refresh(second.credentials.refreshToken),
      auth.refresh(first.credentials.refreshToken),
    ]);
    expect(outcomes[0].status).toBe("fulfilled");
    const active = await prisma.refreshToken.findMany({
      where: { userId: user.id, revokedAt: null },
    });
    expect(active.length).toBe(1);
    expect(active[0].sessionId).toBe(sessionId);
    await expect(
      auth.login({ email, password: oldPassword }),
    ).rejects.toThrow();
    await expect(
      auth.login({ email, password: newPassword }),
    ).resolves.toBeDefined();
  });
});
