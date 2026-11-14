import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  router: { push: vi.fn(), refresh: vi.fn() },
  schoolService: {
    getStudents: vi.fn(),
    getStudent: vi.fn(),
    getAcademicYears: vi.fn(),
    getClassrooms: vi.fn(),
    createStudent: vi.fn(),
    admitStudent: vi.fn(),
    updateStudent: vi.fn(),
  },
}));

vi.mock("@/services", () => ({
  isApiMode: true,
  schoolService: mocks.schoolService,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mocks.router,
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuthSession: () => ({
    session: { activeSchool: { id: "school-a" }, permissionKeys: ["students.create", "academic_structure.read"] },
    isLoading: false, error: null, refresh: vi.fn(),
  }),
}));

vi.mock("next/link", async () => {
  const React = await import("react");
  return {
    default: React.forwardRef<
      HTMLAnchorElement,
      React.ComponentPropsWithoutRef<"a">
    >(function MockLink(props, ref) {
      return React.createElement("a", { ...props, ref });
    }),
  };
});

import { StudentForm, StudentProfile } from "@/components/student-record";

describe("API-mode student creation form", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.schoolService.getStudents.mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });
    mocks.schoolService.getStudent.mockResolvedValue({
      id: "44444444-4444-4444-8444-444444444444",
      name: "Aarav Sharma",
      studentNumber: "ADM-2026-010",
      grade: "Grade 8",
      guardian: "Priya Sharma",
      attendance: null,
      status: "Active",
      firstName: "Aarav",
      middleName: null,
      lastName: "Sharma",
      dateOfBirth: "2016-08-15",
      gender: "MALE",
      admissionDate: "2026-04-01",
      academicYearName: "2026-2027",
      academicYearId: "11111111-1111-4111-8111-111111111111",
      className: "Grade 8",
      classId: "22222222-2222-4222-8222-222222222222",
      sectionName: "Section A",
      sectionId: "33333333-3333-4333-8333-333333333333",
      guardians: [{
        id: "77777777-7777-4777-8777-777777777777",
        name: "Priya Sharma",
        relationship: "MOTHER",
        phone: "+919876543210",
        email: "priya@example.test",
        isPrimary: true,
      }],
    });
    mocks.schoolService.getAcademicYears.mockResolvedValue([
      {
        id: "11111111-1111-4111-8111-111111111111",
        name: "2026-2027",
        startDate: "2026-04-01",
        endDate: "2027-03-31",
        status: "ACTIVE",
      },
    ]);
    mocks.schoolService.getClassrooms.mockResolvedValue([
      {
        id: "22222222-2222-4222-8222-222222222222",
        name: "Grade 8",
        code: "G8",
        sortOrder: 8,
        isActive: true,
        sections: [
          {
            id: "33333333-3333-4333-8333-333333333333",
            name: "Section A",
            code: "A",
            capacity: 30,
            isActive: true,
          },
        ],
      },
    ]);
    mocks.schoolService.createStudent.mockResolvedValue({
      id: "44444444-4444-4444-8444-444444444444",
    });
    mocks.schoolService.admitStudent.mockResolvedValue({
      id: "44444444-4444-4444-8444-444444444444",
    });
    mocks.schoolService.updateStudent.mockResolvedValue({
      id: "44444444-4444-4444-8444-444444444444",
    });
  });

  it("updates an existing student using the backend PATCH contract", async () => {
    mocks.schoolService.getStudents.mockResolvedValue({
      data: [{
        id: "44444444-4444-4444-8444-444444444444",
        name: "Aarav Sharma",
        studentNumber: "ADM-2026-010",
        grade: "Grade 8",
        guardian: "Priya Sharma",
        attendance: null,
        status: "Active",
        firstName: "Aarav",
        middleName: null,
        lastName: "Sharma",
        dateOfBirth: "2016-08-15",
        gender: "MALE",
        admissionDate: "2026-04-01",
        academicYearName: "2026-2027",
        academicYearId: "11111111-1111-4111-8111-111111111111",
        className: "Grade 8",
        classId: "22222222-2222-4222-8222-222222222222",
        sectionName: "Section A",
        sectionId: "33333333-3333-4333-8333-333333333333",
        guardians: [{
          id: "77777777-7777-4777-8777-777777777777",
          name: "Priya Sharma",
          relationship: "MOTHER",
          phone: "+919876543210",
          email: "priya@example.test",
          isPrimary: true,
        }],
      }],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });

    render(<StudentForm studentId="44444444-4444-4444-8444-444444444444" />);
    await screen.findByRole("button", { name: /save changes/i });

    fireEvent.change(screen.getByLabelText("First name"), {
      target: { value: "Aarav" },
    });
    fireEvent.change(screen.getByLabelText("Last name"), {
      target: { value: "Sharma" },
    });
    fireEvent.change(screen.getByLabelText("Admission number"), {
      target: { value: "ADM-2026-011" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(mocks.schoolService.updateStudent).toHaveBeenCalledWith(
        "44444444-4444-4444-8444-444444444444",
        expect.objectContaining({
          admissionNumber: "ADM-2026-011",
          firstName: "Aarav",
          lastName: "Sharma",
        }),
      );
    });
  });

  it("submits a student admission without a manual ID and includes the required guardian", async () => {
    render(<StudentForm />);
    await screen.findByRole("option", { name: /Grade 8/ });

    fireEvent.change(screen.getByLabelText("First name"), {
      target: { value: "Aarav" },
    });
    fireEvent.change(screen.getByLabelText("Last name"), {
      target: { value: "Sharma" },
    });
    fireEvent.change(screen.getByLabelText("Date of birth"), {
      target: { value: "2016-01-01" },
    });
    fireEvent.change(screen.getByLabelText("Admission date"), {
      target: { value: "2026-04-01" },
    });
    fireEvent.change(screen.getByLabelText("Academic year"), {
      target: { value: "11111111-1111-4111-8111-111111111111" },
    });
    fireEvent.change(screen.getByLabelText("Class"), {
      target: { value: "22222222-2222-4222-8222-222222222222" },
    });
    await waitFor(() => {
      expect(screen.getByLabelText("Class")).toHaveValue("22222222-2222-4222-8222-222222222222");
      expect(screen.getByLabelText("Section")).not.toBeDisabled();
    });
    fireEvent.change(screen.getByLabelText("Section"), {
      target: { value: "33333333-3333-4333-8333-333333333333" },
    });
    fireEvent.change(screen.getByLabelText("Guardian 1 first name"), {
      target: { value: "Priya" },
    });
    fireEvent.change(screen.getByLabelText("Guardian 1 phone"), {
      target: { value: "+919876543210" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create student" }));

    await waitFor(() => {
      expect(mocks.schoolService.admitStudent).toHaveBeenCalledWith({
        firstName: "Aarav",
        middleName: undefined,
        lastName: "Sharma",
        dateOfBirth: "2016-01-01",
        admissionDate: "2026-04-01",
        academicYearId: "11111111-1111-4111-8111-111111111111",
        classId: "22222222-2222-4222-8222-222222222222",
        sectionId: "33333333-3333-4333-8333-333333333333",
        guardians: [
          {
            firstName: "Priya",
            relationship: "GUARDIAN",
            phone: "+919876543210",
            isPrimary: true,
            lastName: undefined,
            email: undefined,
          },
        ],
        emergencyContact: { kind: "PRIMARY_GUARDIAN" },
        rollNumber: undefined,
      });

    });
    expect(mocks.router.push).toHaveBeenCalledWith(
      "/dashboard/students/44444444-4444-4444-8444-444444444444",
    );
  });

  it("labels unavailable profile sections and placement", async () => {
    mocks.schoolService.getStudent.mockResolvedValue({
      id: "synthetic-student", name: "Synthetic Learner", studentNumber: "TEST-1",
      grade: "—", className: null, sectionName: null, academicYearName: null,
      guardian: null, attendance: null, status: "Active", guardians: [],
    });
    render(<StudentProfile studentId="synthetic-student" />);
    await screen.findByRole("heading", { name: "Synthetic Learner", level: 2 });
    expect(screen.getAllByText("Unavailable")).toHaveLength(2);
    expect(screen.getByText(/exactly one enrolment is marked active/i)).toBeInTheDocument();
    expect(screen.getByText(/Academic records, attendance, fees, and documents are not available/i)).toBeInTheDocument();
    expect(screen.getByText("No guardian details are on file.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /edit profile/i })).not.toBeInTheDocument();
  });

  it("keeps a separate emergency contact and entered data after an API error", async () => {
    mocks.schoolService.admitStudent.mockRejectedValueOnce(new Error("Section is full."));
    render(<StudentForm />);
    await screen.findByRole("option", { name: /Grade 8/ });
    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Synthetic" } });
    fireEvent.change(screen.getByLabelText("Last name"), { target: { value: "Learner" } });
    fireEvent.change(screen.getByLabelText("Date of birth"), { target: { value: "2016-01-01" } });
    fireEvent.change(screen.getByLabelText("Admission date"), { target: { value: "2026-01-01" } });
    fireEvent.change(screen.getByLabelText("Academic year"), { target: { value: "11111111-1111-4111-8111-111111111111" } });
    fireEvent.change(screen.getByLabelText("Class"), { target: { value: "22222222-2222-4222-8222-222222222222" } });
    fireEvent.change(screen.getByLabelText("Section"), { target: { value: "33333333-3333-4333-8333-333333333333" } });
    fireEvent.change(screen.getByLabelText("Guardian 1 first name"), { target: { value: "Synthetic Guardian" } });
    fireEvent.change(screen.getByLabelText("Guardian 1 phone"), { target: { value: "+14155552671" } });
    fireEvent.change(screen.getByLabelText("Contact"), { target: { value: "OTHER" } });
    fireEvent.change(screen.getByLabelText("Emergency contact name"), { target: { value: "Synthetic Contact" } });
    fireEvent.change(screen.getByLabelText("Emergency contact phone"), { target: { value: "+14155552671" } });
    fireEvent.change(screen.getByLabelText("City"), { target: { value: "Synthetic City" } });
    fireEvent.click(screen.getByRole("button", { name: "Create student" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Section is full.");
    expect(screen.getByLabelText("Emergency contact name")).toHaveValue("Synthetic Contact");
    expect(screen.getByLabelText("City")).toHaveValue("Synthetic City");
    expect(mocks.schoolService.admitStudent).toHaveBeenCalledWith(expect.objectContaining({
      emergencyContact: { kind: "OTHER", name: "Synthetic Contact", phone: "+14155552671" },
      address: { city: "Synthetic City" },
    }));
    expect(mocks.router.push).not.toHaveBeenCalled();
  });
});
