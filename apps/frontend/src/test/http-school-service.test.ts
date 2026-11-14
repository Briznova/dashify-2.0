import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClient, ApiError } from "@/services/api-client";
import { HttpSchoolService } from "@/services/http/http-school-service";

const studentResponse = {
  id: "c99a0e44-61f3-4dcc-ae23-fd24ed0428c6",
  admissionNumber: "ADM-2026-001",
  firstName: "Aarav",
  middleName: null,
  lastName: "Sharma",
  dateOfBirth: "2016-08-15T00:00:00.000Z",
  gender: "MALE",
  admissionDate: "2026-04-01T00:00:00.000Z",
  status: "ACTIVE",
  enrolments: [
    {
      isActive: true,
      academicYear: { id: "11111111-1111-4111-8111-111111111111", name: "2026-2027" },
      section: {
        id: "034b0bc2-cdc2-43cf-bf2a-b10ad7583857",
        name: "Section A",
        code: "A",
        class: {
          id: "22222222-2222-4222-8222-222222222222",
          name: "Grade 8",
          code: "G8",
        },
      },
    },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("HttpSchoolService.getClassrooms", () => {
  it("requests backend classes and maps nested sections without inventing fields", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            id: "c99a0e44-61f3-4dcc-ae23-fd24ed0428c6",
            schoolId: "44009a3e-5693-4f11-9891-b5e34f4d02c6",
            name: "Grade 8",
            code: "G8",
            sortOrder: 8,
            isActive: true,
            createdAt: "2025-01-01T00:00:00.000Z",
            updatedAt: "2025-01-01T00:00:00.000Z",
            sections: [
              {
                id: "034b0bc2-cdc2-43cf-bf2a-b10ad7583857",
                schoolId: "44009a3e-5693-4f11-9891-b5e34f4d02c6",
                classId: "c99a0e44-61f3-4dcc-ae23-fd24ed0428c6",
                name: "Section A",
                code: "A",
                capacity: 30,
                isActive: true,
                createdAt: "2025-01-01T00:00:00.000Z",
                updatedAt: "2025-01-01T00:00:00.000Z",
              },
            ],
          },
          {
            id: "b2b551bb-e365-4a2b-92a5-06e3a7926658",
            schoolId: "44009a3e-5693-4f11-9891-b5e34f4d02c6",
            name: "Grade 9",
            code: "G9",
            sortOrder: 9,
            isActive: true,
            sections: [],
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const service = new HttpSchoolService(new ApiClient("https://dashify.test/api/v1"));

    await expect(service.getClassrooms()).resolves.toEqual([
      {
        id: "c99a0e44-61f3-4dcc-ae23-fd24ed0428c6",
        name: "Grade 8",
        code: "G8",
        sortOrder: 8,
        isActive: true,
        sections: [
          {
            id: "034b0bc2-cdc2-43cf-bf2a-b10ad7583857",
            name: "Section A",
            code: "A",
            capacity: 30,
            isActive: true,
          },
        ],
      },
      {
        id: "b2b551bb-e365-4a2b-92a5-06e3a7926658",
        name: "Grade 9",
        code: "G9",
        sortOrder: 9,
        isActive: true,
        sections: [],
      },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://dashify.test/api/v1/classes",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  describe("HttpSchoolService.getPlatformSchools", () => {
    it("requests and returns only approved school-directory metadata", async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify([
            {
              id: "school-1",
              name: "Example School",
              code: "EXAMPLE",
              isActive: true,
              createdAt: "2026-04-03T08:00:00.000Z",
              principal: "Unexpected field",
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
      vi.stubGlobal("fetch", fetchMock);
      const service = new HttpSchoolService(
        new ApiClient("https://dashify.test/api/v1"),
      );

      await expect(service.getPlatformSchools()).resolves.toEqual([
        {
          id: "school-1",
          name: "Example School",
          code: "EXAMPLE",
          isActive: true,
          createdAt: "2026-04-03T08:00:00.000Z",
        },
      ]);
      expect(fetchMock).toHaveBeenCalledWith(
        "https://dashify.test/api/v1/platform/schools",
        expect.objectContaining({ credentials: "include" }),
      );
    });

    it("creates a platform school using the protected directory endpoint", async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
        id: "school-1",
        name: "Example School",
        code: "EXAMPLE",
        isActive: true,
        createdAt: "2026-04-03T08:00:00.000Z",
        onboardingState: "NOT_STARTED",
      }), { status: 201, headers: { "Content-Type": "application/json" } }));
      vi.stubGlobal("fetch", fetchMock);
      const service = new HttpSchoolService(new ApiClient("https://dashify.test/api/v1"));
      await expect(service.createPlatformSchool({ name: "Example School", code: "EXAMPLE" })).resolves.toMatchObject({
        id: "school-1",
        code: "EXAMPLE",
        onboardingState: "NOT_STARTED",
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://dashify.test/api/v1/platform/schools",
        expect.objectContaining({ method: "POST", credentials: "include", body: JSON.stringify({ name: "Example School", code: "EXAMPLE" }) }),
      );
    });

    it("rejects a creation response without a supported onboarding state", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
        id: "school-1", name: "Example School", code: "EXAMPLE",
        isActive: true, createdAt: "2026-04-03T08:00:00.000Z",
      }), { status: 201 })));
      const service = new HttpSchoolService(new ApiClient("https://dashify.test/api/v1"));
      await expect(service.createPlatformSchool({ name: "Example School", code: "EXAMPLE" }))
        .rejects.toThrow("invalid onboarding data");
    });

    it("returns not-found for a missing selected school and propagates other failures", async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ message: "School not found" }), { status: 404 }))
        .mockResolvedValueOnce(new Response("", { status: 403 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ message: "Cannot GET /api/v1/platform/schools/missing" }), { status: 404 }));
      vi.stubGlobal("fetch", fetchMock);
      const service = new HttpSchoolService(new ApiClient("https://dashify.test/api/v1"));
      await expect(service.getPlatformSchool("missing")).resolves.toBeNull();
      await expect(service.getPlatformSchool("missing")).rejects.toMatchObject({ status: 403 });
      await expect(service.getPlatformSchool("missing")).rejects.toMatchObject({ status: 404 });
    });

    it("rejects an unsupported onboarding state on school detail", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
        id: "school-1", name: "Example School", code: "EXAMPLE",
        isActive: true, createdAt: "2026-04-03T08:00:00.000Z", onboardingState: "UNSUPPORTED",
      }), { status: 200 })));
      const service = new HttpSchoolService(new ApiClient("https://dashify.test/api/v1"));
      await expect(service.getPlatformSchool("school-1")).rejects.toThrow("invalid onboarding data");
    });

    it("rejects a selected-school response for a different ID", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
        id: "school-2", name: "Other School", code: "OTHER",
        isActive: true, createdAt: "2026-04-03T08:00:00.000Z", onboardingState: null,
      }), { status: 200 })));
      const service = new HttpSchoolService(new ApiClient("https://dashify.test/api/v1"));
      await expect(service.getPlatformSchool("school-1")).rejects.toThrow("different school");
    });

    it("accepts a canonicalized UUID returned for an uppercase ID", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
        id: "abcdefab-0000-4000-8000-000000000001", name: "Example School", code: "EXAMPLE",
        isActive: true, createdAt: "2026-04-03T08:00:00.000Z", onboardingState: null,
      }), { status: 200 })));
      const service = new HttpSchoolService(new ApiClient("https://dashify.test/api/v1"));
      await expect(service.getPlatformSchool("ABCDEFAB-0000-4000-8000-000000000001"))
        .resolves.toMatchObject({ onboardingState: null });
    });

    it("rejects malformed school-directory data", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify([{ id: "school-1", name: "Example", isActive: true }]),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        ),
      );
      const service = new HttpSchoolService(
        new ApiClient("https://dashify.test/api/v1"),
      );

      await expect(service.getPlatformSchools()).rejects.toMatchObject({
        status: 502,
      });
    });
  });

  describe("HttpSchoolService.getOverview", () => {
    it("requests and maps only the school-admin current-count contract", async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({
          schoolId: "44009a3e-5693-4f11-9891-b5e34f4d02c6",
          schoolName: "Northstar School",
          activeStudentCount: 1234,
          activeStaffCount: 35,
          activeClassCount: 8,
          activeSectionCount: 19,
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
      vi.stubGlobal("fetch", fetchMock);
      const service = new HttpSchoolService(new ApiClient("https://dashify.test/api/v1"));

      await expect(service.getOverview("school_admin")).resolves.toEqual({
        role: "school_admin",
        schoolName: "Northstar School",
        metrics: [
          { label: "Active students", value: "1,234", icon: "users", tone: "blue" },
          { label: "Active staff", value: "35", icon: "graduationCap", tone: "violet" },
          { label: "Active classes", value: "8", icon: "book", tone: "green" },
          { label: "Active sections", value: "19", icon: "layoutDashboard", tone: "orange" },
        ],
        enrollment: [],
        pendingApprovals: [],
        upcomingEvents: [],
      });
      expect(fetchMock).toHaveBeenCalledWith(
        "https://dashify.test/api/v1/dashboard",
        expect.objectContaining({ credentials: "include" }),
      );
    });

    it("requests and maps the principal daily attendance contract", async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({
          schoolId: "44009a3e-5693-4f11-9891-b5e34f4d02c6",
          schoolName: "Northstar School",
          localDate: "2026-04-03",
          presentCount: 12,
          absentCount: 2,
          lateCount: 1,
          excusedCount: 1,
          unmarkedCount: 3,
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
      vi.stubGlobal("fetch", fetchMock);
      const service = new HttpSchoolService(new ApiClient("https://dashify.test/api/v1"));

      await expect(service.getOverview("principal")).resolves.toEqual({
        role: "principal",
        schoolName: "Northstar School",
        localDate: "2026-04-03",
        metrics: [
          { label: "Present", value: "12", icon: "check", tone: "green" },
          { label: "Absent", value: "2", icon: "alert", tone: "orange" },
          { label: "Late", value: "1", icon: "clock", tone: "violet" },
          { label: "Excused", value: "1", icon: "info", tone: "blue" },
          { label: "Unmarked", value: "3", icon: "calendarCheck", tone: "orange" },
        ],
        enrollment: [],
        pendingApprovals: [],
        upcomingEvents: [],
      });
      expect(fetchMock).toHaveBeenCalledWith(
        "https://dashify.test/api/v1/dashboard/principal",
        expect.objectContaining({ credentials: "include" }),
      );
    });

    it.each(["super_admin"] as const)(
      "does not request unapproved dashboard metrics for %s",
      async (role) => {
        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);
        const service = new HttpSchoolService(new ApiClient("https://dashify.test/api/v1"));

        await expect(service.getOverview(role)).rejects.toMatchObject({
          status: 501,
          message: "Dashboard data is not available for this role yet.",
        });
        expect(fetchMock).not.toHaveBeenCalled();
      },
    );

    it("rejects invalid principal local dates and aggregate values", async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({
          schoolId: "44009a3e-5693-4f11-9891-b5e34f4d02c6",
          schoolName: "Northstar School",
          localDate: "2026-02-30",
          presentCount: 12,
          absentCount: 2,
          lateCount: 1,
          excusedCount: 1,
          unmarkedCount: 3,
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
      vi.stubGlobal("fetch", fetchMock);
      const service = new HttpSchoolService(new ApiClient("https://dashify.test/api/v1"));

      await expect(service.getOverview("principal")).rejects.toBeInstanceOf(ApiError);
    });

    it("rejects malformed or negative aggregate counts", async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({
          schoolId: "44009a3e-5693-4f11-9891-b5e34f4d02c6",
          schoolName: "Northstar School",
          activeStudentCount: -1,
          activeStaffCount: 35,
          activeClassCount: 8,
          activeSectionCount: 19,
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
      vi.stubGlobal("fetch", fetchMock);
      const service = new HttpSchoolService(new ApiClient("https://dashify.test/api/v1"));

      await expect(service.getOverview("school_admin")).rejects.toBeInstanceOf(ApiError);
    });

  });

  describe("HttpSchoolService.getTeacherDashboard", () => {
    it("requests and validates the assignment-scoped teacher contract", async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            schoolId: "44009a3e-5693-4f11-9891-b5e34f4d02c6",
            schoolName: "Northstar School",
            localDate: "2026-04-03",
            assignments: [
              {
                classId: "22222222-2222-4222-8222-222222222222",
                className: "Grade 8",
                sectionId: "034b0bc2-cdc2-43cf-bf2a-b10ad7583857",
                sectionName: "Section A",
                subject: "Mathematics",
                sessionStatus: "OPEN",
                unmarkedCount: 3,
              },
              {
                classId: "33333333-3333-4333-8333-333333333333",
                className: "Grade 9",
                sectionId: "044b0bc2-cdc2-43cf-bf2a-b10ad7583858",
                sectionName: "Section B",
                subject: null,
                sessionStatus: null,
                unmarkedCount: null,
              },
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );
      vi.stubGlobal("fetch", fetchMock);
      const service = new HttpSchoolService(
        new ApiClient("https://dashify.test/api/v1"),
      );

      await expect(service.getTeacherDashboard()).resolves.toEqual({
        schoolId: "44009a3e-5693-4f11-9891-b5e34f4d02c6",
        schoolName: "Northstar School",
        localDate: "2026-04-03",
        assignments: [
          {
            id: "22222222-2222-4222-8222-222222222222-034b0bc2-cdc2-43cf-bf2a-b10ad7583857",
            classId: "22222222-2222-4222-8222-222222222222",
            className: "Grade 8",
            sectionId: "034b0bc2-cdc2-43cf-bf2a-b10ad7583857",
            sectionName: "Section A",
            subject: "Mathematics",
            sessionStatus: "OPEN",
            unmarkedCount: 3,
          },
          {
            id: "33333333-3333-4333-8333-333333333333-044b0bc2-cdc2-43cf-bf2a-b10ad7583858",
            classId: "33333333-3333-4333-8333-333333333333",
            className: "Grade 9",
            sectionId: "044b0bc2-cdc2-43cf-bf2a-b10ad7583858",
            sectionName: "Section B",
            subject: null,
            sessionStatus: null,
            unmarkedCount: null,
          },
        ],
      });
      expect(fetchMock).toHaveBeenCalledWith(
        "https://dashify.test/api/v1/dashboard/teacher",
        expect.objectContaining({ credentials: "include" }),
      );
    });

    it("rejects a fabricated zero when an assigned section has no session", async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            schoolId: "44009a3e-5693-4f11-9891-b5e34f4d02c6",
            schoolName: "Northstar School",
            localDate: "2026-04-03",
            assignments: [
              {
                classId: "22222222-2222-4222-8222-222222222222",
                className: "Grade 8",
                sectionId: "034b0bc2-cdc2-43cf-bf2a-b10ad7583857",
                sectionName: "Section A",
                subject: null,
                sessionStatus: null,
                unmarkedCount: 0,
              },
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );
      vi.stubGlobal("fetch", fetchMock);
      const service = new HttpSchoolService(
        new ApiClient("https://dashify.test/api/v1"),
      );

      await expect(service.getTeacherDashboard()).rejects.toBeInstanceOf(
        ApiError,
      );
    });
  });

  it("rejects malformed backend responses explicitly", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify([{ id: "not-a-valid-class" }]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    const service = new HttpSchoolService(new ApiClient("https://dashify.test/api/v1"));

    await expect(service.getClassrooms()).rejects.toMatchObject({
      message: "The Dashify service returned invalid data for class 1.",
      status: 502,
    });
  });

  it("posts a class payload and maps the created class", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "c99a0e44-61f3-4dcc-ae23-fd24ed0428c6",
          name: "Grade 8",
          code: "G8",
          sortOrder: 8,
          isActive: true,
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const service = new HttpSchoolService(new ApiClient("https://dashify.test/api/v1"));
    const input = { name: "Grade 8", code: "G8", sortOrder: 8 };

    await expect(service.createClassroom(input)).resolves.toEqual({
      id: "c99a0e44-61f3-4dcc-ae23-fd24ed0428c6",
      ...input,
      isActive: true,
      sections: [],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://dashify.test/api/v1/classes",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(input),
        credentials: "include",
      }),
    );
  });

  it("posts a class and first section together and maps both", async () => {
    const input = {
      name: "Grade 8", code: "G8", sortOrder: 8,
      section: { name: "Section A", code: "A", capacity: 30 },
    };
    const response = {
      id: "class-1", name: input.name, code: input.code, sortOrder: 8, isActive: true,
      sections: [{ id: "section-1", ...input.section, isActive: true }],
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(response), { status: 201, headers: { "Content-Type": "application/json" } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const service = new HttpSchoolService(new ApiClient("https://dashify.test/api/v1"));
    await expect(service.createClassroomWithSection(input)).resolves.toEqual(response);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://dashify.test/api/v1/classes/with-section",
      expect.objectContaining({ method: "POST", body: JSON.stringify(input), credentials: "include" }),
    );
  });

  it("rejects combined creation responses missing the first section", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: "class-1", name: "Grade 8", code: "G8", sortOrder: 0, isActive: true, sections: [],
    }), { status: 201, headers: { "Content-Type": "application/json" } })));
    const service = new HttpSchoolService(new ApiClient("https://dashify.test/api/v1"));
    await expect(service.createClassroomWithSection({
      name: "Grade 8", code: "G8", section: { name: "A", code: "A" },
    })).rejects.toMatchObject({ status: 502 });
  });

  it("sends class and section edits to their scoped endpoints", async () => {
    const section = { id: "section-1", name: "Section A", code: "A", capacity: null, isActive: true };
    const classroom = { id: "class-1", name: "Grade 8", code: "G8", sortOrder: 8, isActive: true, sections: [section] };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(classroom), { status: 200, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify(section), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const service = new HttpSchoolService(new ApiClient("https://dashify.test/api/v1"));
    const classInput = { name: "Grade 8", code: "G8", sortOrder: 8 };
    const sectionInput = { name: "Section A", code: "A", capacity: null };
    await expect(service.updateClassroom("class-1", classInput)).resolves.toEqual(classroom);
    await expect(service.updateAcademicSection("class-1", "section-1", sectionInput)).resolves.toEqual(section);
    expect(fetchMock).toHaveBeenNthCalledWith(1, "https://dashify.test/api/v1/classes/class-1",
      expect.objectContaining({ method: "PUT", body: JSON.stringify(classInput), credentials: "include" }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, "https://dashify.test/api/v1/classes/class-1/sections/section-1",
      expect.objectContaining({ method: "PUT", body: JSON.stringify(sectionInput), credentials: "include" }));
  });

  it("posts a section payload and maps the created section", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "034b0bc2-cdc2-43cf-bf2a-b10ad7583857",
          classId: "c99a0e44-61f3-4dcc-ae23-fd24ed0428c6",
          name: "Section A",
          code: "A",
          capacity: 30,
          isActive: true,
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const service = new HttpSchoolService(new ApiClient("https://dashify.test/api/v1"));
    const input = {
      classId: "c99a0e44-61f3-4dcc-ae23-fd24ed0428c6",
      name: "Section A",
      code: "A",
      capacity: 30,
    };

    await expect(service.createAcademicSection(input)).resolves.toEqual({
      id: "034b0bc2-cdc2-43cf-bf2a-b10ad7583857",
      name: "Section A",
      code: "A",
      capacity: 30,
      isActive: true,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://dashify.test/api/v1/sections",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(input),
        credentials: "include",
      }),
    );
  });

  it("rejects malformed class creation responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: "not-a-class" }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    const service = new HttpSchoolService(new ApiClient("https://dashify.test/api/v1"));

    await expect(
      service.createClassroom({ name: "Grade 8", code: "G8" }),
    ).rejects.toMatchObject({
      message: "The Dashify service returned invalid created-class data.",
      status: 502,
    });
  });

  it("requests and maps a paginated student list without assuming guardian or attendance data", async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: [studentResponse],
            meta: { page: 2, pageSize: 1, total: 3, totalPages: 3 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
      vi.stubGlobal("fetch", fetchMock);
      const service = new HttpSchoolService(new ApiClient("https://dashify.test/api/v1"));

      await expect(service.getStudents(2, 1)).resolves.toEqual({
        data: [
          {
            id: studentResponse.id,
            name: "Aarav Sharma",
            studentNumber: "ADM-2026-001",
            grade: "Grade 8",
            guardian: null,
            attendance: null,
            status: "Active",
            firstName: "Aarav",
            middleName: null,
            lastName: "Sharma",
            dateOfBirth: "2016-08-15T00:00:00.000Z",
            gender: "MALE",
            admissionDate: "2026-04-01T00:00:00.000Z",
            academicYearName: "2026-2027",
            academicYearId: "11111111-1111-4111-8111-111111111111",
            className: "Grade 8",
            classId: "22222222-2222-4222-8222-222222222222",
            sectionName: "Section A",
            sectionId: "034b0bc2-cdc2-43cf-bf2a-b10ad7583857",
            guardians: [],
          },
        ],
        meta: { page: 2, pageSize: 1, total: 3, totalPages: 3 },
      });
      expect(fetchMock).toHaveBeenCalledWith(
        "https://dashify.test/api/v1/students?page=2&pageSize=1",
        expect.objectContaining({ credentials: "include" }),
      );
  });

  it("loads student detail with real guardian contact information", async () => {
      const detail = {
        ...studentResponse,
        guardians: [
          {
            studentId: studentResponse.id,
            guardianId: "77777777-7777-4777-8777-777777777777",
            relationship: "MOTHER",
            isPrimary: true,
            canPickup: true,
            guardian: {
              id: "77777777-7777-4777-8777-777777777777",
              firstName: "Priya",
              lastName: "Sharma",
              phone: "+919876543210",
              email: "priya@example.test",
            },
          },
        ],
      };
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(JSON.stringify(detail), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        ),
      );
      const service = new HttpSchoolService(new ApiClient("https://dashify.test/api/v1"));

      await expect(service.getStudent(studentResponse.id)).resolves.toMatchObject({
        name: "Aarav Sharma",
        guardian: "Priya Sharma",
        guardians: [
          {
            name: "Priya Sharma",
            relationship: "MOTHER",
            phone: "+919876543210",
            email: "priya@example.test",
            isPrimary: true,
          },
        ],
      });
  });

  it("uses only one active placement for student detail and rejects missing placement status", async () => {
    const active = studentResponse.enrolments[0];
    const historical = { ...active, isActive: false, academicYear: { id: "old", name: "Old year" } };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...studentResponse, enrolments: [historical, active] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...studentResponse, enrolments: [historical] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...studentResponse, enrolments: [active, active] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...studentResponse, enrolments: [{ ...active, isActive: undefined }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const service = new HttpSchoolService(new ApiClient("https://dashify.test/api/v1"));
    await expect(service.getStudent(studentResponse.id)).resolves.toMatchObject({ academicYearName: "2026-2027", className: "Grade 8" });
    await expect(service.getStudent(studentResponse.id)).resolves.toMatchObject({ academicYearName: null, className: null });
    await expect(service.getStudent(studentResponse.id)).resolves.toMatchObject({ academicYearName: null, className: null });
    await expect(service.getStudent(studentResponse.id)).rejects.toMatchObject({ status: 502 });
  });

  it("posts the new admission contract and maps saved contact and address data", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ...studentResponse,
      emergencyContactKind: "OTHER", emergencyContactName: "Synthetic Contact",
      emergencyContactPhone: "+14155552671", address: { city: "Synthetic City" },
      guardians: [],
    }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    const service = new HttpSchoolService(new ApiClient("https://dashify.test/api/v1"));
    const input = {
      firstName: "Synthetic", lastName: "Learner", dateOfBirth: "2016-01-01",
      admissionDate: "2026-01-01", academicYearId: "year", classId: "class", sectionId: "section",
      guardians: [{ firstName: "Synthetic Guardian", relationship: "GUARDIAN" as const, phone: "+14155552671", isPrimary: true }],
      emergencyContact: { kind: "OTHER" as const, name: "Synthetic Contact", phone: "+14155552671" },
      address: { city: "Synthetic City" },
    };
    await expect(service.admitStudent(input)).resolves.toMatchObject({
      emergencyContact: input.emergencyContact, address: input.address,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://dashify.test/api/v1/students",
      expect.objectContaining({ method: "POST", body: JSON.stringify(input) }),
    );
  });

  it("reports admission validation errors returned as an array", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ message: ["A guardian phone must be valid", "Date of birth is required"] }), { status: 400 },
    )));
    const client = new ApiClient("https://dashify.test/api/v1");
    await expect(client.request("/students", { method: "POST", body: "{}" }))
      .rejects.toMatchObject({ message: "A guardian phone must be valid Date of birth is required", status: 400 });
  });

  it("requests and maps the backend staff directory to the dashboard contract", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            id: "9eb4d4b6-d7b3-4d6d-9165-4f2fef5b4563",
            schoolId: "44009a3e-5693-4f11-9891-b5e34f4d02c6",
            firstName: "Mia",
            lastName: "Robinson",
            email: "mia.robinson@northstar.edu",
            phone: "+1-555-010-7788",
            departmentId: null,
            employeeCode: "EMP-101",
            designation: "Math Teacher",
            department: "Mathematics",
            isActive: true,
            joinedAt: "2025-01-01T00:00:00.000Z",
            userId: null,
            teacherAssignments: [],
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const service = new HttpSchoolService(new ApiClient("https://dashify.test/api/v1"));

    await expect(service.getStaff()).resolves.toEqual([
      {
        id: "9eb4d4b6-d7b3-4d6d-9165-4f2fef5b4563",
        name: "Mia Robinson",
        email: "mia.robinson@northstar.edu",
        position: "Math Teacher",
        department: "Mathematics",
        status: "Active",
        employeeCode: "EMP-101",
        firstName: "Mia",
        lastName: "Robinson",
        phone: "+1-555-010-7788",
        departmentId: null,
      },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://dashify.test/api/v1/staff",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("uses the Teacher account and school department contracts", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: "dept-1", name: "Synthetic", isActive: true }]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: "staff-1", firstName: "Synthetic", email: "teacher@example.test",
        designation: "Teacher", departmentId: "dept-1",
        departmentRecord: { id: "dept-1", name: "Synthetic", isActive: true },
      }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    const service = new HttpSchoolService(new ApiClient("https://dashify.test/api/v1"));
    await expect(service.getDepartments()).resolves.toEqual([{ id: "dept-1", name: "Synthetic", isActive: true }]);
    const input = {
      firstName: "Synthetic", employeeCode: "T-1", email: "teacher@example.test",
      password: "Synthetic-password-123", departmentId: "dept-1",
    };
    await expect(service.createTeacherAccount(input)).resolves.toMatchObject({
      position: "Teacher", department: "Synthetic", departmentId: "dept-1",
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "https://dashify.test/api/v1/staff/teacher-accounts",
      expect.objectContaining({ method: "POST", body: JSON.stringify(input) }));
  });

  it("creates a staff profile linked to an existing Teacher account", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "staff-1",
          firstName: "Mia",
          lastName: "Robinson",
          email: "mia@example.test",
          employeeCode: "EMP-101",
          designation: "Teacher",
          department: "Mathematics",
          isActive: true,
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const service = new HttpSchoolService(new ApiClient("https://dashify.test/api/v1"));

    await expect(
      service.createStaff({
        employeeCode: "EMP-101",
        firstName: "Mia",
        accountEmail: "mia@example.test",
      }),
    ).resolves.toMatchObject({
      id: "staff-1",
      name: "Mia Robinson",
      email: "mia@example.test",
      position: "Teacher",
      status: "Active",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://dashify.test/api/v1/staff",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          employeeCode: "EMP-101",
          firstName: "Mia",
          accountEmail: "mia@example.test",
        }),
      }),
    );
  });

  it("updates and deactivates staff profiles through the backend routes", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "staff-1",
            firstName: "Mia",
            lastName: "Robinson",
            email: "mia@example.test",
            employeeCode: "EMP-101",
            designation: "Teacher",
            department: "Mathematics",
            isActive: true,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "staff-1", isActive: false }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const service = new HttpSchoolService(new ApiClient("https://dashify.test/api/v1"));

    await expect(
      service.updateStaff("staff-1", { designation: "Teacher" }),
    ).resolves.toMatchObject({ position: "Teacher" });
    await expect(service.deactivateStaff("staff-1")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://dashify.test/api/v1/staff/staff-1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ designation: "Teacher" }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://dashify.test/api/v1/staff/staff-1/deactivate",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("sends the backend create-student contract and maps its response", async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(studentResponse), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
      );
      vi.stubGlobal("fetch", fetchMock);
      const service = new HttpSchoolService(new ApiClient("https://dashify.test/api/v1"));
      const input = {
        admissionNumber: "ADM-2026-001",
        firstName: "Aarav",
        lastName: "Sharma",
        admissionDate: "2026-04-01",
        academicYearId: "11111111-1111-4111-8111-111111111111",
        classId: "22222222-2222-4222-8222-222222222222",
        sectionId: "034b0bc2-cdc2-43cf-bf2a-b10ad7583857",
        guardians: [],
      };

      await expect(service.createStudent(input)).resolves.toMatchObject({
        studentNumber: "ADM-2026-001",
        name: "Aarav Sharma",
      });
      expect(fetchMock).toHaveBeenCalledWith(
        "https://dashify.test/api/v1/students",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(input),
          credentials: "include",
        }),
      );
  });

  it("loads academic-year choices from the backend endpoint", async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify([
            {
              id: "11111111-1111-4111-8111-111111111111",
              name: "2026-2027",
              startDate: "2026-04-01T00:00:00.000Z",
              endDate: "2027-03-31T00:00:00.000Z",
              status: "ACTIVE",
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
      vi.stubGlobal("fetch", fetchMock);
      const service = new HttpSchoolService(new ApiClient("https://dashify.test/api/v1"));

      await expect(service.getAcademicYears()).resolves.toEqual([
        {
          id: "11111111-1111-4111-8111-111111111111",
          name: "2026-2027",
          startDate: "2026-04-01T00:00:00.000Z",
          endDate: "2027-03-31T00:00:00.000Z",
          status: "ACTIVE",
        },
      ]);
      expect(fetchMock).toHaveBeenCalledWith(
        "https://dashify.test/api/v1/academic-years",
        expect.objectContaining({ credentials: "include" }),
      );
  });

  it("creates an academic year using the backend DTO", async () => {
    const input = {
      name: "2027-2028",
      startDate: "2027-04-01",
      endDate: "2028-03-31",
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "year-2", ...input, status: "PLANNED" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const service = new HttpSchoolService(new ApiClient("https://dashify.test/api/v1"));

    await expect(service.createAcademicYear(input)).resolves.toMatchObject(input);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://dashify.test/api/v1/academic-years",
      expect.objectContaining({ method: "POST", body: JSON.stringify(input) }),
    );
  });

  it("reads and updates the active school profile through its API contract", async () => {
    const profile = {
      id: "school-1",
      name: "Northstar Academy",
      email: "hello@northstar.edu",
      phone: null,
      timezone: "America/Los_Angeles",
      locale: "en-US",
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(profile), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...profile, name: "Northstar School" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }));
    vi.stubGlobal("fetch", fetchMock);
    const service = new HttpSchoolService(new ApiClient("https://dashify.test/api/v1"));
    const input = {
      name: "Northstar School",
      email: profile.email,
      phone: profile.phone,
      timezone: profile.timezone,
      locale: profile.locale,
    };

    await expect(service.getSchoolProfile()).resolves.toEqual(profile);
    await expect(service.updateSchoolProfile(input)).resolves.toMatchObject({
      name: "Northstar School",
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://dashify.test/api/v1/schools/current",
      expect.objectContaining({ credentials: "include" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://dashify.test/api/v1/schools/current",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify(input) }),
    );
  });

  it("uses the attendance session and roster API contracts without adding corrections", async () => {
    const sessionId = "77777777-7777-4777-8777-777777777777";
    const studentId = "88888888-8888-4888-8888-888888888888";
    const session = {
      id: sessionId,
      classId: "11111111-1111-4111-8111-111111111111",
      sectionId: "22222222-2222-4222-8222-222222222222",
      date: "2026-04-01T00:00:00.000Z",
      status: "OPEN",
      records: [],
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([session]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{
        id: studentId,
        firstName: "Aarav",
        lastName: "Sharma",
        admissionNumber: "ADM-001",
        record: null,
      }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify(session), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, count: 1 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }));
    vi.stubGlobal("fetch", fetchMock);
    const service = new HttpSchoolService(new ApiClient("https://dashify.test/api/v1"));

    await expect(service.getAttendanceSessions("2026-04-01")).resolves.toHaveLength(1);
    await expect(service.getAttendanceRoster(sessionId)).resolves.toEqual([{
      id: studentId,
      name: "Aarav Sharma",
      admissionNumber: "ADM-001",
      record: null,
    }]);
    await service.createAttendanceSession({
      classId: session.classId,
      sectionId: session.sectionId,
      date: "2026-04-01",
    });
    await service.markAttendance(sessionId, {
      records: [{ studentId, status: "PRESENT" }],
    });
    await service.closeAttendanceSession(sessionId);

    expect(fetchMock.mock.calls.map(([url, init]) => [url, init?.method])).toEqual([
      ["https://dashify.test/api/v1/attendance/sessions?date=2026-04-01", undefined],
      [`https://dashify.test/api/v1/attendance/sessions/${sessionId}/roster`, undefined],
      ["https://dashify.test/api/v1/attendance/sessions", "POST"],
      [`https://dashify.test/api/v1/attendance/sessions/${sessionId}/records`, "PUT"],
      [`https://dashify.test/api/v1/attendance/sessions/${sessionId}/close`, "POST"],
    ]);
  });
});
