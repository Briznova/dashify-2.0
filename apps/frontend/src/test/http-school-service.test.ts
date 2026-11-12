import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClient } from "@/services/api-client";
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
            className: "Grade 8",
            sectionName: "Section A",
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
