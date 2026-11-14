import {
  grantSchoolsCreatePermission,
  grantPlatformPermission,
} from "./seed-platform-permission";

function setup(user: unknown, existing: unknown) {
  const tx = {
    user: { findUnique: jest.fn().mockResolvedValue(user) },
    platformAdminGrantPermission: {
      findUnique: jest.fn().mockResolvedValue(existing),
      upsert: jest.fn().mockResolvedValue({}),
    },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  };
  const client = {
    $transaction: jest.fn(async (cb: (t: typeof tx) => Promise<unknown>) =>
      cb(tx),
    ),
  };
  return { tx, client };
}
const activeAdmin = {
  isActive: true,
  platformAdminGrant: { id: "grant-1", revokedAt: null },
};
const email = "platform@example.test";

describe("platform create-permission seed", () => {
  it.each([
    ["SUPPORT_READ", "platform.support.read"],
    ["SUPPORT_UPDATE", "platform.support.update"],
  ] as const)("audits the %s grant", async (permission, key) => {
    const { tx, client } = setup(activeAdmin, null);
    await grantPlatformPermission(client as never, email, permission);
    expect(tx.platformAdminGrantPermission.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: { grantId: "grant-1", permission } }),
    );
    expect(tx.auditLog.create.mock.calls[0][0].data.summary.permission).toBe(
      key,
    );
  });
  it("audits the separate audit permission grant", async () => {
    const { tx, client } = setup(activeAdmin, null);
    await grantPlatformPermission(client as never, email, "AUDIT_READ");
    expect(tx.platformAdminGrantPermission.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { grantId: "grant-1", permission: "AUDIT_READ" },
      }),
    );
    expect(tx.auditLog.create.mock.calls[0][0].data.summary.permission).toBe(
      "platform.audit.read",
    );
  });

  it("audits the separate settings permission grant", async () => {
    const { tx, client } = setup(activeAdmin, null);
    await grantPlatformPermission(client as never, email, "SETTINGS_READ");
    expect(tx.platformAdminGrantPermission.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { grantId: "grant-1", permission: "SETTINGS_READ" },
      }),
    );
    expect(tx.auditLog.create.mock.calls[0][0].data.summary.permission).toBe(
      "platform.settings.read",
    );
  });
  it("grants and writes a redacted audit entry in the same transaction", async () => {
    const { tx, client } = setup(activeAdmin, null);
    await expect(
      grantSchoolsCreatePermission(client as never, email),
    ).resolves.toBe("granted");
    expect(client.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.platformAdminGrantPermission.upsert).toHaveBeenCalled();
    const audit = tx.auditLog.create.mock.calls[0][0].data;
    expect(audit).toEqual({
      actorUserId: null,
      action: "PLATFORM_PERMISSION_GRANTED",
      resource: "platform_admin_grant_permission",
      resourceId: "grant-1",
      summary: {
        permission: "platform.schools.create",
        change: "granted",
        provisioning: "environment-seed",
      },
    });
    expect(JSON.stringify(audit)).not.toContain(email);
  });

  it("audits a reactivation", async () => {
    const { tx, client } = setup(activeAdmin, { revokedAt: new Date() });
    await expect(
      grantSchoolsCreatePermission(client as never, email),
    ).resolves.toBe("reactivated");
    expect(tx.auditLog.create.mock.calls[0][0].data.summary.change).toBe(
      "reactivated",
    );
  });

  it("does not write or audit when already active", async () => {
    const { tx, client } = setup(activeAdmin, { revokedAt: null });
    await expect(
      grantSchoolsCreatePermission(client as never, email),
    ).resolves.toBe("unchanged");
    expect(tx.platformAdminGrantPermission.upsert).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it.each([
    [null],
    [{ isActive: true, platformAdminGrant: null }],
    [
      {
        isActive: true,
        platformAdminGrant: { id: "g", revokedAt: new Date() },
      },
    ],
    [{ isActive: false, platformAdminGrant: { id: "g", revokedAt: null } }],
  ])("fails without an active platform admin grant: %j", async (user) => {
    const { tx, client } = setup(user, null);
    await expect(
      grantSchoolsCreatePermission(client as never, email),
    ).rejects.toThrow(/active platform administrator grant/);
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
});
