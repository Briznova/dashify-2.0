import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  Classroom,
  CreateAcademicSectionInput,
  CreateClassroomInput,
} from "@/types/school";

const mocks = vi.hoisted(() => ({
  schoolService: {
    getClassrooms: vi.fn(),
    createClassroom: vi.fn(),
    createAcademicSection: vi.fn(),
  },
  session: {
    permissionKeys: ["academic_structure.read", "academic_structure.manage"],
  },
}));

vi.mock("@/services", () => ({
  isApiMode: true,
  schoolService: mocks.schoolService,
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuthSession: () => ({ session: mocks.session }),
}));

import { ClassroomsDirectory } from "@/components/school-dashboard";

describe("API-mode class and section creation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.session.permissionKeys = [
      "academic_structure.read",
      "academic_structure.manage",
    ];
    mocks.schoolService.getClassrooms.mockResolvedValue([
      {
        id: "22222222-2222-4222-8222-222222222222",
        name: "Grade 8",
        code: "G8",
        sortOrder: 8,
        isActive: true,
        sections: [],
      },
    ]);
    mocks.schoolService.createClassroom.mockResolvedValue({
      id: "44444444-4444-4444-8444-444444444444",
      name: "Grade 9",
      code: "G9",
      sortOrder: 9,
      isActive: true,
      sections: [],
    });
    mocks.schoolService.createAcademicSection.mockResolvedValue({
      id: "55555555-5555-4555-8555-555555555555",
      name: "Section A",
      code: "A",
      capacity: 30,
      isActive: true,
    });
  });

  it("submits class creation with the backend request shape", async () => {
    const classrooms: Classroom[] = [
      {
        id: "22222222-2222-4222-8222-222222222222",
        name: "Grade 8",
        code: "G8",
        sortOrder: 8,
        isActive: true,
        sections: [],
      },
    ];
    mocks.schoolService.getClassrooms.mockImplementation(async () => classrooms);
    mocks.schoolService.createClassroom.mockImplementation(async (input: CreateClassroomInput) => {
      const classroom = {
        id: "44444444-4444-4444-8444-444444444444",
        ...input,
        sortOrder: input.sortOrder ?? 0,
        isActive: true,
        sections: [],
      };
      classrooms.push(classroom);
      return classroom;
    });
    render(<ClassroomsDirectory />);

    fireEvent.change(await screen.findByLabelText("Class name"), {
      target: { value: "Grade 9" },
    });
    fireEvent.change(screen.getByLabelText("Class code"), {
      target: { value: "G9" },
    });
    fireEvent.change(screen.getByLabelText("Sort order"), {
      target: { value: "9" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create class" }));

    await waitFor(() => {
      expect(mocks.schoolService.createClassroom).toHaveBeenCalledWith({
        name: "Grade 9",
        code: "G9",
        sortOrder: 9,
      });
    });
    await screen.findByText("G9");
  });

  it("submits section creation only for a selected class", async () => {
    const classrooms: Classroom[] = [
      {
        id: "22222222-2222-4222-8222-222222222222",
        name: "Grade 8",
        code: "G8",
        sortOrder: 8,
        isActive: true,
        sections: [],
      },
    ];
    mocks.schoolService.getClassrooms.mockImplementation(async () => classrooms);
    mocks.schoolService.createAcademicSection.mockImplementation(async (input: CreateAcademicSectionInput) => {
      const section = {
        id: "55555555-5555-4555-8555-555555555555",
        name: input.name,
        code: input.code,
        capacity: input.capacity ?? null,
        isActive: true,
      };
      classrooms[0].sections.push(section);
      return section;
    });
    render(<ClassroomsDirectory />);

    fireEvent.change(await screen.findByLabelText("Class"), {
      target: { value: "22222222-2222-4222-8222-222222222222" },
    });
    fireEvent.change(screen.getByLabelText("Section name"), {
      target: { value: "Section A" },
    });
    fireEvent.change(screen.getByLabelText("Section code"), {
      target: { value: "A" },
    });
    fireEvent.change(screen.getByLabelText("Capacity"), {
      target: { value: "30" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create section" }));

    await waitFor(() => {
      expect(mocks.schoolService.createAcademicSection).toHaveBeenCalledWith({
        classId: "22222222-2222-4222-8222-222222222222",
        name: "Section A",
        code: "A",
        capacity: 30,
      });
    });
    await screen.findByText("Section A (A) · Capacity 30");
  });

  it("keeps create forms hidden without the manage permission", async () => {
    mocks.session.permissionKeys = ["academic_structure.read"];
    render(<ClassroomsDirectory />);

    await screen.findByRole("heading", { level: 1, name: "Classes & sections" });
    expect(screen.queryByRole("button", { name: "Create class" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Create section" })).toBeNull();
  });
});
