import { BadRequestException, NotFoundException } from "@nestjs/common";
import { GuardianRelationship } from "@prisma/client";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { StudentsService } from "./students.service";

describe("StudentsService enrolments", () => {
  const schoolId = "school-1";
  const studentId = "student-1";
  const studentWithEnrolments = (enrolments: object[]) => ({
    id: studentId,
    schoolId,
    admissionNumber: "ADM-001",
    admissionDate: new Date("2026-04-01"),
    enrolments,
  });

  let service: StudentsService;
  let withTenant: jest.Mock;
  let transaction: {
    student: {
      findMany: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      findUniqueOrThrow: jest.Mock;
    };
    academicYear: { findFirst: jest.Mock };
    schoolClass: { findFirst: jest.Mock };
    section: { findFirst: jest.Mock };
    guardian: { create: jest.Mock; update: jest.Mock };
    studentGuardian: {
      create: jest.Mock;
      update: jest.Mock;
      deleteMany: jest.Mock;
    };
    auditLog: { create: jest.Mock };
  };

  beforeEach(() => {
    transaction = {
      student: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
      academicYear: { findFirst: jest.fn() },
      schoolClass: { findFirst: jest.fn() },
      section: { findFirst: jest.fn() },
      guardian: { create: jest.fn(), update: jest.fn() },
      studentGuardian: {
        create: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
      auditLog: { create: jest.fn() },
    };
    withTenant = jest.fn(
      (_tenantId: string, work: (tx: typeof transaction) => Promise<unknown>) =>
        work(transaction),
    );
    const prisma = {
      withTenant,
    } as unknown as PrismaService;
    service = new StudentsService(prisma);
  });

  it("returns a student with one active enrolment in the list", async () => {
    const enrolment = {
      id: "enrolment-1",
      schoolId,
      isActive: true,
      startDate: new Date("2026-04-01"),
      academicYear: { id: "year-1", name: "2026-2027", status: "ACTIVE" },
      section: {
        id: "section-1",
        name: "A",
        class: { id: "class-1", name: "Grade 1", code: "G1" },
      },
    };
    const student = studentWithEnrolments([enrolment]);
    transaction.student.findMany.mockResolvedValue([student]);
    transaction.student.count.mockResolvedValue(1);

    const result = await service.list(schoolId, 1, 20);

    expect(result.data).toEqual([student]);
    expect(transaction.student.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { schoolId, status: { not: "ARCHIVED" } },
        include: {
          enrolments: expect.objectContaining({
            where: expect.objectContaining({ schoolId }),
            include: expect.objectContaining({
              academicYear: expect.any(Object),
              section: expect.any(Object),
            }),
          }),
        },
      }),
    );
  });

  it("returns all enrolments for an individual student, including inactive history", async () => {
    const enrolments = [
      { id: "enrolment-1", schoolId, isActive: true },
      { id: "enrolment-2", schoolId, isActive: false },
    ];
    const student = studentWithEnrolments(enrolments);
    transaction.student.findFirst.mockResolvedValue(student);

    const result = await service.get(schoolId, studentId);

    expect(result).toEqual(student);
    expect(transaction.student.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: studentId, schoolId },
        include: {
          guardians: { include: { guardian: true } },
          enrolments: expect.objectContaining({
            where: expect.objectContaining({ schoolId }),
          }),
        },
      }),
    );
    const query = transaction.student.findFirst.mock.calls[0][0];
    expect(query.include.enrolments.where).not.toHaveProperty("isActive");
  });

  it("returns an empty enrolment array when a student has no enrolments", async () => {
    const student = studentWithEnrolments([]);
    transaction.student.findFirst.mockResolvedValue(student);

    const result = await service.get(schoolId, studentId);

    expect(result.enrolments).toEqual([]);
  });

  it("does not return a student belonging to another school", async () => {
    transaction.student.findFirst.mockResolvedValue(null);

    await expect(service.get(schoolId, studentId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(transaction.student.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: studentId, schoolId } }),
    );
  });

  it("scopes the student and included enrolments and related academic data to the school", async () => {
    transaction.student.findFirst.mockResolvedValue(studentWithEnrolments([]));

    await service.get(schoolId, studentId);

    const query = transaction.student.findFirst.mock.calls[0][0];
    expect(query.where).toEqual({ id: studentId, schoolId });
    expect(query.include.enrolments.where).toEqual({
      schoolId,
      academicYear: { is: { schoolId } },
      section: { is: { schoolId, class: { is: { schoolId } } } },
    });
  });

  it.each(["academicYear", "schoolClass", "section"] as const)(
    "rejects a missing or cross-school %s reference on create",
    async (missingReference) => {
      transaction.student.findFirst.mockResolvedValue(null);
      transaction.academicYear.findFirst.mockResolvedValue(
        missingReference === "academicYear" ? null : { id: "year-1", schoolId },
      );
      transaction.schoolClass.findFirst.mockResolvedValue(
        missingReference === "schoolClass" ? null : { id: "class-1", schoolId },
      );
      transaction.section.findFirst.mockResolvedValue(
        missingReference === "section" ? null : { id: "section-1", schoolId },
      );

      await expect(
        service.create(schoolId, "actor-1", {
          admissionNumber: "ADM-001",
          firstName: "Aarav",
          lastName: "Sharma",
          admissionDate: "2026-04-01",
          academicYearId: "year-1",
          classId: "class-1",
          sectionId: "section-1",
          guardians: [],
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(transaction.academicYear.findFirst).toHaveBeenCalledWith({
        where: { id: "year-1", schoolId },
      });
      expect(transaction.schoolClass.findFirst).toHaveBeenCalledWith({
        where: { id: "class-1", schoolId, isActive: true },
      });
      expect(transaction.section.findFirst).toHaveBeenCalledWith({
        where: {
          id: "section-1",
          schoolId,
          classId: "class-1",
          isActive: true,
        },
      });
    },
  );

  it("rejects multiple primary guardians before making changes", async () => {
    const guardianInput = {
      firstName: "Guardian",
      relationship: GuardianRelationship.MOTHER,
      phone: "+14155552671",
      isPrimary: true,
    };

    await expect(
      service.update(schoolId, "actor-1", studentId, {
        guardians: [
          guardianInput,
          { ...guardianInput, relationship: GuardianRelationship.FATHER },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(withTenant).not.toHaveBeenCalled();
    expect(transaction.auditLog.create).not.toHaveBeenCalled();
  });

  it("updates guardian links and writes a PII-free audit record in the tenant transaction", async () => {
    const student = {
      ...studentWithEnrolments([]),
      firstName: "Old Student Name",
      guardians: [
        {
          guardianId: "guardian-1",
          guardian: {
            id: "guardian-1",
            firstName: "Old Guardian Name",
            phone: "+14155550001",
            email: "old@example.test",
          },
          relationship: GuardianRelationship.MOTHER,
          isPrimary: true,
        },
        {
          guardianId: "guardian-2",
          guardian: { id: "guardian-2" },
          relationship: GuardianRelationship.FATHER,
          isPrimary: false,
        },
      ],
    };
    const updatedStudent = { ...student, firstName: "New Student Name" };
    transaction.student.findFirst.mockResolvedValue(student);
    transaction.student.update.mockResolvedValue(updatedStudent);
    transaction.guardian.create.mockResolvedValue({ id: "guardian-3" });
    transaction.student.findUniqueOrThrow.mockResolvedValue(updatedStudent);

    await service.update(schoolId, "actor-1", studentId, {
      firstName: "New Student Name",
      guardians: [
        {
          id: "guardian-1",
          firstName: "New Guardian Name",
          relationship: GuardianRelationship.MOTHER,
          phone: "+14155550002",
          email: "new@example.test",
          isPrimary: false,
        },
        {
          firstName: "Added Guardian Name",
          relationship: GuardianRelationship.GUARDIAN,
          phone: "+14155550003",
          isPrimary: false,
        },
      ],
    });

    expect(transaction.studentGuardian.deleteMany).toHaveBeenCalledWith({
      where: {
        schoolId,
        studentId,
        guardianId: { in: ["guardian-2"] },
      },
    });
    expect(transaction.studentGuardian.update).toHaveBeenCalledTimes(1);
    expect(transaction.studentGuardian.create).toHaveBeenCalledTimes(1);
    expect(transaction.auditLog.create).toHaveBeenCalledWith({
      data: {
        schoolId,
        actorUserId: "actor-1",
        action: "STUDENT_UPDATED",
        resource: "student",
        resourceId: studentId,
        summary: {
          changedFields: ["firstName", "guardians"],
          guardianLinkChanges: { added: 1, updated: 1, removed: 1 },
        },
      },
    });

    const auditSummary = JSON.stringify(
      transaction.auditLog.create.mock.calls[0][0].data.summary,
    );
    expect(auditSummary).not.toContain("New Student Name");
    expect(auditSummary).not.toContain("New Guardian Name");
    expect(auditSummary).not.toContain("+14155550002");
    expect(auditSummary).not.toContain("new@example.test");
  });

  it("rejects guardian IDs that are not linked to the active-school student", async () => {
    transaction.student.findFirst.mockResolvedValue({
      ...studentWithEnrolments([]),
      guardians: [{ guardianId: "guardian-1" }],
    });

    await expect(
      service.update(schoolId, "actor-1", studentId, {
        guardians: [
          {
            id: "guardian-from-another-school",
            firstName: "Guardian",
            relationship: GuardianRelationship.MOTHER,
            phone: "+14155552671",
          },
        ],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(transaction.guardian.update).not.toHaveBeenCalled();
    expect(transaction.guardian.create).not.toHaveBeenCalled();
    expect(transaction.auditLog.create).not.toHaveBeenCalled();
  });

  it("allows zero primary guardians and unlinks all guardian links when given an empty array", async () => {
    transaction.student.findFirst.mockResolvedValue({
      ...studentWithEnrolments([]),
      guardians: [{ guardianId: "guardian-1" }, { guardianId: "guardian-2" }],
    });
    transaction.student.findUniqueOrThrow.mockResolvedValue(
      studentWithEnrolments([]),
    );

    await service.update(schoolId, "actor-1", studentId, { guardians: [] });

    expect(transaction.studentGuardian.deleteMany).toHaveBeenCalledWith({
      where: {
        schoolId,
        studentId,
        guardianId: { in: ["guardian-1", "guardian-2"] },
      },
    });
    expect(transaction.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        summary: {
          changedFields: ["guardians"],
          guardianLinkChanges: { added: 0, updated: 0, removed: 2 },
        },
      }),
    });
  });

  it("surfaces audit failures so the enclosing tenant transaction can roll back", async () => {
    transaction.student.findFirst.mockResolvedValue({
      ...studentWithEnrolments([]),
      guardians: [],
    });
    transaction.student.update.mockResolvedValue(studentWithEnrolments([]));
    transaction.auditLog.create.mockRejectedValue(
      new Error("audit unavailable"),
    );

    await expect(
      service.update(schoolId, "actor-1", studentId, { firstName: "Updated" }),
    ).rejects.toThrow("audit unavailable");
    expect(transaction.student.update).toHaveBeenCalled();
    expect(transaction.auditLog.create).toHaveBeenCalled();
  });
});
