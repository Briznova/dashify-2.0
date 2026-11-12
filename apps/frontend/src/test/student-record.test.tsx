import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  router: { push: vi.fn(), refresh: vi.fn() },
  schoolService: {
    getStudents: vi.fn(),
    getAcademicYears: vi.fn(),
    getClassrooms: vi.fn(),
    createStudent: vi.fn(),
  },
}));

vi.mock("@/services", () => ({
  isApiMode: true,
  schoolService: mocks.schoolService,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mocks.router,
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

import { StudentForm } from "@/components/student-record";

describe("API-mode student creation form", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.schoolService.getStudents.mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
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
  });

  it("submits backend enrollment IDs and optional guardian data", async () => {
    render(<StudentForm />);
    await screen.findByRole("option", { name: /Grade 8/ });

    fireEvent.change(screen.getByLabelText("Admission number"), {
      target: { value: "ADM-2026-010" },
    });
    fireEvent.change(screen.getByLabelText("First name"), {
      target: { value: "Aarav" },
    });
    fireEvent.change(screen.getByLabelText("Last name"), {
      target: { value: "Sharma" },
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
    fireEvent.click(screen.getByRole("button", { name: "Add guardian" }));
    fireEvent.change(screen.getByLabelText("Guardian 1 first name"), {
      target: { value: "Priya" },
    });
    fireEvent.change(screen.getByLabelText("Guardian 1 phone"), {
      target: { value: "+919876543210" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create student" }));

    await waitFor(() => {
      expect(mocks.schoolService.createStudent).toHaveBeenCalledWith({
        admissionNumber: "ADM-2026-010",
        firstName: "Aarav",
        middleName: undefined,
        lastName: "Sharma",
        dateOfBirth: undefined,
        admissionDate: "2026-04-01",
        academicYearId: "11111111-1111-4111-8111-111111111111",
        classId: "22222222-2222-4222-8222-222222222222",
        sectionId: "33333333-3333-4333-8333-333333333333",
        guardians: [
          {
            firstName: "Priya",
            relationship: "MOTHER",
            phone: "+919876543210",
            isPrimary: true,
            lastName: undefined,
            email: undefined,
          },
        ],
      });
    });
    expect(mocks.router.push).toHaveBeenCalledWith(
      "/dashboard/students/44444444-4444-4444-8444-444444444444",
    );
  });
});
