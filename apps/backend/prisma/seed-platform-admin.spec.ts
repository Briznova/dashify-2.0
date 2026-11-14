import * as argon2 from "argon2";
import { bootstrapPlatformAdmin } from "./seed-platform-admin";

jest.mock("argon2", () => ({
  hash: jest.fn().mockResolvedValue("synthetic-hash"),
  verify: jest.fn().mockResolvedValue(true),
}));

const env = {
  SEED_PLATFORM_ADMIN_EMAIL: "  PLATFORM@example.test  ",
  SEED_PLATFORM_ADMIN_PASSWORD: "synthetic-password",
};
const permissions = [
  "SCHOOLS_CREATE",
  "SCHOOL_ADMINS_CREATE",
  "AUDIT_READ",
  "SETTINGS_READ",
  "SUPPORT_READ",
  "SUPPORT_UPDATE",
];

function setup(existing: unknown = null) {
  const tx = {
    user: {
      findFirst: jest.fn().mockResolvedValue(existing),
      findUnique: jest.fn().mockResolvedValue({
        isActive: true,
        platformAdminGrant: { id: "grant-1", revokedAt: null },
      }),
      create: jest.fn().mockResolvedValue({ id: "admin-1" }),
    },
    platformAdminGrantPermission: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({}),
    },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  };
  const client = {
    $transaction: jest.fn(async (fn: (value: typeof tx) => Promise<void>) =>
      fn(tx),
    ),
  };
  return { tx, client };
}

function existingAdmin(): {
  email: string;
  isActive: boolean;
  passwordHash: string;
  memberships: { id: string }[];
  platformAdminGrant: {
    revokedAt: Date | null;
    permissions: { permission: string; revokedAt: Date | null }[];
  };
} {
  return {
    email: "platform@example.test",
    isActive: true,
    passwordHash: "synthetic-hash",
    memberships: [],
    platformAdminGrant: {
      revokedAt: null,
      permissions: permissions.map((permission) => ({
        permission,
        revokedAt: null,
      })),
    },
  };
}

describe("platform administrator bootstrap", () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([
    {},
    { ...env, SEED_PLATFORM_ADMIN_EMAIL: "invalid" },
    { ...env, SEED_PLATFORM_ADMIN_PASSWORD: "short" },
  ])("rejects invalid credentials before database writes", async (input) => {
    const { client } = setup();
    await expect(
      bootstrapPlatformAdmin(client as never, input),
    ).rejects.toThrow(/SEED_PLATFORM_ADMIN/);
    expect(client.$transaction).not.toHaveBeenCalled();
  });

  it("creates one platform-only user and all platform grants in one transaction", async () => {
    const { tx, client } = setup();
    await bootstrapPlatformAdmin(client as never, env);
    expect(client.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.user.create).toHaveBeenCalledTimes(1);
    expect(tx.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "platform@example.test",
          passwordHash: "synthetic-hash",
          platformAdminGrant: { create: {} },
        }),
      }),
    );
    expect(
      tx.platformAdminGrantPermission.upsert.mock.calls.map(
        ([arg]) => arg.create.permission,
      ),
    ).toEqual(permissions);
    expect(tx.auditLog.create).toHaveBeenCalledTimes(1 + permissions.length);
    expect(JSON.stringify(tx.auditLog.create.mock.calls)).not.toContain(
      env.SEED_PLATFORM_ADMIN_PASSWORD,
    );
  });

  it("is a no-op when the existing dedicated administrator matches", async () => {
    const { tx, client } = setup(existingAdmin());
    await bootstrapPlatformAdmin(client as never, env);
    expect(tx.user.create).not.toHaveBeenCalled();
    expect(tx.platformAdminGrantPermission.upsert).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("does not restore revoked permissions", async () => {
    const admin = existingAdmin();
    admin.platformAdminGrant.permissions[0].revokedAt = new Date();
    const { tx, client } = setup(admin);
    await expect(bootstrapPlatformAdmin(client as never, env)).rejects.toThrow(
      /lacks bootstrap permissions/,
    );
    expect(tx.platformAdminGrantPermission.upsert).not.toHaveBeenCalled();
  });

  it("does not elevate existing school users or accept an incorrect password", async () => {
    const admin = existingAdmin();
    admin.memberships.push({ id: "school-membership" });
    const { client } = setup(admin);
    await expect(bootstrapPlatformAdmin(client as never, env)).rejects.toThrow(
      /not an active dedicated/,
    );
    jest.mocked(argon2.verify).mockResolvedValueOnce(false);
    const other = setup(existingAdmin());
    await expect(
      bootstrapPlatformAdmin(other.client as never, env),
    ).rejects.toThrow(/does not match/);
    expect(other.tx.user.create).not.toHaveBeenCalled();
  });
});
