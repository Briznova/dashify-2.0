import * as argon2 from "argon2";
import { bootstrapTeacher } from "./seed-teacher";

jest.mock("argon2", () => ({
  hash: jest.fn().mockResolvedValue("synthetic-hash"),
  verify: jest.fn().mockResolvedValue(true),
}));

const env = {
  SEED_TEACHER_EMAIL: "  teacher@example.test  ",
  SEED_TEACHER_PASSWORD: "synthetic-password",
  SEED_TEACHER_SCHOOL_CODE: "PCS-101",
};

function setup(existing: unknown = null, school: unknown = null) {
  const tx = {
    user: {
      findFirst: jest.fn().mockResolvedValue(existing),
      create: jest.fn().mockResolvedValue({
        id: "teacher-user-1",
        email: "teacher@example.test",
      }),
    },
    school: {
      findFirst: jest.fn().mockResolvedValue(school),
      create: jest.fn().mockResolvedValue({ id: "school-1", code: "demo-school" }),
    },
    permission: {
      upsert: jest.fn().mockResolvedValue({ id: "permission-1" }),
    },
    role: {
      upsert: jest.fn().mockResolvedValue({ id: "teacher-role-1" }),
    },
    rolePermission: {
      upsert: jest.fn().mockResolvedValue({}),
    },
    schoolMembership: {
      create: jest.fn().mockResolvedValue({ id: "membership-1" }),
    },
    staffProfile: {
      create: jest.fn().mockResolvedValue({ id: "staff-1" }),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({}),
    },
  };

  const client = {
    $transaction: jest.fn(async (fn: (value: typeof tx) => Promise<void>) =>
      fn(tx),
    ),
  };

  return { tx, client };
}

function existingTeacher() {
  return {
    email: "teacher@example.test",
    isActive: true,
    passwordHash: "synthetic-hash",
    memberships: [
      {
        id: "membership-1",
        status: "ACTIVE",
        roles: [{ role: { key: "TEACHER", schoolId: "school-1" } }],
      },
    ],
  };
}

describe("teacher bootstrap", () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([
    {},
    { ...env, SEED_TEACHER_EMAIL: "invalid" },
    { ...env, SEED_TEACHER_PASSWORD: "short" },
  ])("rejects invalid credentials before database writes", async (input) => {
    const { client } = setup();
    await expect(bootstrapTeacher(client as never, input)).rejects.toThrow(
      /SEED_TEACHER/,
    );
    expect(client.$transaction).not.toHaveBeenCalled();
  });

  it("creates a teacher membership, staff profile, and permission link for the configured school", async () => {
    const { tx, client } = setup(null, {
      id: "school-1",
      code: "PCS-101",
      name: "Patliputra Central School",
    });

    await bootstrapTeacher(client as never, env);

    expect(client.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.school.create).not.toHaveBeenCalled();
    expect(tx.user.create).toHaveBeenCalledTimes(1);
    expect(tx.schoolMembership.create).toHaveBeenCalledTimes(1);
    expect(tx.staffProfile.create).toHaveBeenCalledTimes(1);
    expect(tx.rolePermission.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { roleId: "teacher-role-1", permissionId: "permission-1" },
      }),
    );
    expect(tx.auditLog.create).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(tx.auditLog.create.mock.calls)).not.toContain(
      env.SEED_TEACHER_PASSWORD,
    );
  });

  it("is a no-op when the existing dedicated teacher matches", async () => {
    const { tx, client } = setup(existingTeacher(), {
      id: "school-1",
      code: "PCS-101",
      name: "Patliputra Central School",
    });

    await bootstrapTeacher(client as never, env);

    expect(tx.user.create).not.toHaveBeenCalled();
    expect(tx.school.create).not.toHaveBeenCalled();
    expect(tx.rolePermission.upsert).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("rejects existing email addresses that are not an active dedicated teacher", async () => {
    const { client } = setup({
      email: "teacher@example.test",
      isActive: true,
      passwordHash: "synthetic-hash",
      memberships: [{ id: "membership-1", status: "ACTIVE", roles: [] }],
    });

    await expect(bootstrapTeacher(client as never, env)).rejects.toThrow(
      /not an active dedicated teacher/,
    );
  });

  it("rejects an incorrect teacher password", async () => {
    const other = setup(existingTeacher());
    jest.mocked(argon2.verify).mockResolvedValueOnce(false);

    await expect(bootstrapTeacher(other.client as never, env)).rejects.toThrow(
      /does not match/,
    );
    expect(other.tx.user.create).not.toHaveBeenCalled();
  });
});
