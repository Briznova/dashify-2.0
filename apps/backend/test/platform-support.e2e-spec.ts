import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as argon2 from "argon2";
import cookieParser from "cookie-parser";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/infrastructure/database/prisma.service";
import { PlatformSupportRetentionService } from "../src/modules/platform/platform-support-retention.service";

const database = process.env.SUPPORT_E2E_DATABASE_URL;
const run = database ? describe : describe.skip;

run("platform support (isolated PostgreSQL)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let actorId: string;
  let otherId: string;
  let schoolId: string;
  const origin = "http://localhost:3000";
  const password = "Synthetic-support-password-123";
  let actorCookies: string[];
  let actorCsrf: string;
  let otherCookies: string[];
  let otherCsrf: string;
  let readerCookies: string[];
  let readerCsrf: string;

  async function login(email: string) {
    const response = await request(app.getHttpServer()).post("/api/v1/auth/login")
      .set("Origin", origin).send({ email, password }).expect(200);
    const cookies: unknown = response.headers["set-cookie"];
    if (!Array.isArray(cookies) || !cookies.every((cookie: unknown) => typeof cookie === "string")) {
      throw new Error("Missing test cookies");
    }
    const csrf = cookies.find((cookie) => cookie.startsWith("dashify_csrf="))?.split(";")[0].split("=")[1];
    if (!csrf) throw new Error("Missing test CSRF cookie");
    return { cookies, csrf: decodeURIComponent(csrf) };
  }

  beforeAll(async () => {
    const url = new URL(database!);
    if (url.hostname !== "127.0.0.1" || url.pathname !== "/support_test" ||
      process.env.DATABASE_URL !== database || process.env.DIRECT_URL !== database) {
      throw new Error("Support e2e requires both URLs to target the isolated loopback support_test database");
    }
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    const passwordHash = await argon2.hash(password);
    const createAdmin = async (email: string, write: boolean) => prisma.user.create({
      data: {
        email, passwordHash, firstName: "Synthetic",
        platformAdminGrant: { create: { permissions: { create: [
          { permission: "SUPPORT_READ" }, ...(write ? [{ permission: "SUPPORT_UPDATE" as const }] : []),
        ] } } },
      },
    });
    const actor = await createAdmin("support-actor@example.test", true);
    const other = await createAdmin("support-other@example.test", true);
    await createAdmin("support-reader@example.test", false);
    actorId = actor.id;
    otherId = other.id;
    schoolId = (await prisma.school.create({ data: { name: "Synthetic School", code: "SUPPORT-TEST" } })).id;
    ({ cookies: actorCookies, csrf: actorCsrf } = await login("support-actor@example.test"));
    ({ cookies: otherCookies, csrf: otherCsrf } = await login("support-other@example.test"));
    ({ cookies: readerCookies, csrf: readerCsrf } = await login("support-reader@example.test"));
  });

  afterAll(async () => { if (app) await app.close(); });

  it("enforces permissions, CSRF, optimistic transitions, history and redacted audit", async () => {
    const body = { schoolId, title: "Synthetic issue", description: "Synthetic details", priority: "HIGH" };
    await request(app.getHttpServer()).get("/api/v1/platform/support-tickets").expect(401);
    await request(app.getHttpServer()).post("/api/v1/platform/support-tickets").set("Origin", origin)
      .set("Cookie", readerCookies).set("X-CSRF-Token", readerCsrf).send(body).expect(403);
    await request(app.getHttpServer()).post("/api/v1/platform/support-tickets").set("Origin", origin)
      .set("Cookie", actorCookies).send(body).expect(403);
    await request(app.getHttpServer()).post("/api/v1/platform/support-tickets").set("Origin", origin)
      .set("Cookie", actorCookies).set("X-CSRF-Token", actorCsrf)
      .send({ ...body, schoolId: "00000000-0000-4000-8000-000000000001" }).expect(404);
    const created = await request(app.getHttpServer()).post("/api/v1/platform/support-tickets")
      .set("Origin", origin).set("Cookie", actorCookies).set("X-CSRF-Token", actorCsrf).send(body).expect(201);
    const id: string = created.body.id;
    expect(created.body).toMatchObject({ status: "OPEN", assigneeId: null, version: 1, schoolId });
    const action = (cookies: string[], csrf: string, payload: object) =>
      request(app.getHttpServer()).post(`/api/v1/platform/support-tickets/${id}/actions`)
        .set("Origin", origin).set("Cookie", cookies).set("X-CSRF-Token", csrf).send(payload);
    await action(actorCookies, actorCsrf, { action: "CLAIM", version: 1 }).expect(201).expect((res) => expect(res.body.assigneeId).toBe(actorId));
    await action(otherCookies, otherCsrf, { action: "CLAIM", version: 2 }).expect(409);
    await action(otherCookies, otherCsrf, { action: "RELEASE", version: 2 }).expect(409);
    await action(actorCookies, actorCsrf, { action: "SET_STATUS", version: 1, value: "RESOLVED" }).expect(409);
    const resolved = await action(actorCookies, actorCsrf, { action: "SET_STATUS", version: 2, value: "RESOLVED" }).expect(201);
    expect(resolved.body.resolvedAt).toBeTruthy();
    await action(actorCookies, actorCsrf, { action: "SET_STATUS", version: 3, value: "IN_PROGRESS" }).expect(409);
    const reopened = await action(actorCookies, actorCsrf, { action: "SET_STATUS", version: 3, value: "OPEN" }).expect(201);
    expect(reopened.body.resolvedAt).toBeNull();
    const detail = await request(app.getHttpServer()).get(`/api/v1/platform/support-tickets/${id}`).set("Cookie", readerCookies).expect(200);
    expect(detail.body.events).toHaveLength(4);
    const first = await request(app.getHttpServer()).get("/api/v1/platform/support-tickets?pageSize=1").set("Cookie", readerCookies).expect(200);
    expect(first.body.data[0].id).toBe(id);
    const audits = await prisma.auditLog.findMany({ where: { resourceId: id } });
    expect(audits).toHaveLength(4);
    expect(JSON.stringify(audits)).not.toContain(body.title);
    expect(JSON.stringify(audits)).not.toContain(body.description);
    await prisma.platformAdminGrantPermission.updateMany({
      where: { grant: { userId: otherId }, permission: "SUPPORT_READ" }, data: { revokedAt: new Date() },
    });
    await request(app.getHttpServer()).get("/api/v1/platform/support-tickets").set("Cookie", otherCookies).expect(403);
  });

  it("deletes only resolved tickets at or beyond the 365-day cutoff", async () => {
    const now = new Date(Date.now() + 2 * 365 * 86400000);
    const cutoff = now.getTime() - 365 * 86400000;
    const create = (status: "OPEN" | "RESOLVED", resolvedAt: Date) => prisma.platformSupportTicket.create({
      data: { schoolId, title: "Synthetic retention", description: "Synthetic", createdById: actorId, status, resolvedAt,
        events: { create: { actorUserId: actorId, action: "CREATED" } } },
    });
    const expired = await create("RESOLVED", new Date(cutoff));
    const recent = await create("RESOLVED", new Date(cutoff + 1));
    const reopened = await create("OPEN", new Date(cutoff - 1));
    const retention = app.get(PlatformSupportRetentionService);
    expect(await retention.cleanup(now)).toBe(1);
    expect(await prisma.platformSupportTicket.findUnique({ where: { id: expired.id } })).toBeNull();
    expect(await prisma.platformSupportTicketEvent.count({ where: { ticketId: expired.id } })).toBe(0);
    expect(await prisma.platformSupportTicket.findUnique({ where: { id: recent.id } })).not.toBeNull();
    expect(await prisma.platformSupportTicket.findUnique({ where: { id: reopened.id } })).not.toBeNull();
  });
});
