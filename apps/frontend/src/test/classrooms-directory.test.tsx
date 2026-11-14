import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  Classroom,
  CreateAcademicSectionInput,
  CreateClassroomWithSectionInput,
} from "@/types/school";

const mocks = vi.hoisted(() => ({
  schoolService: {
    getClassrooms: vi.fn(),
    createClassroomWithSection: vi.fn(),
    createAcademicSection: vi.fn(),
    updateClassroom: vi.fn(),
    updateAcademicSection: vi.fn(),
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
import { ClassDetails } from "@/components/class-details";

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
    mocks.schoolService.createClassroomWithSection.mockResolvedValue({
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
    mocks.schoolService.createClassroomWithSection.mockImplementation(async (input: CreateClassroomWithSectionInput) => {
      const classroom = {
        id: "44444444-4444-4444-8444-444444444444",
        name: input.name,
        code: input.code,
        sortOrder: input.sortOrder ?? 0,
        isActive: true,
        sections: [{ id: "section-1", ...input.section, capacity: input.section.capacity ?? null, isActive: true }],
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
    fireEvent.change(screen.getByLabelText("First section name"), {
      target: { value: "Section A" },
    });
    fireEvent.change(screen.getByLabelText("First section code"), {
      target: { value: "A" },
    });
    fireEvent.change(screen.getByLabelText("First section capacity"), {
      target: { value: "30" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create class and section" }));

    await waitFor(() => {
      expect(mocks.schoolService.createClassroomWithSection).toHaveBeenCalledWith({
        name: "Grade 9",
        code: "G9",
        sortOrder: 9,
        section: { name: "Section A", code: "A", capacity: 30 },
      });
    });
    await screen.findByText("G9");
    await screen.findByText("Section A (A) · Capacity 30");
    expect(screen.getByRole("link", { name: "Grade 8" })).toHaveAttribute("href", "/dashboard/classes/22222222-2222-4222-8222-222222222222");
    expect(screen.queryByRole("heading", { name: "Create section" })).not.toBeInTheDocument();
  });

  it("shows a creation failure and preserves the entered values", async () => {
    mocks.schoolService.createClassroomWithSection.mockRejectedValue(new Error("Class code already exists"));
    render(<ClassroomsDirectory />);
    fireEvent.change(await screen.findByLabelText("Class name"), { target: { value: "Grade 9" } });
    fireEvent.change(screen.getByLabelText("Class code"), { target: { value: "G9" } });
    fireEvent.change(screen.getByLabelText("First section name"), { target: { value: "Section A" } });
    fireEvent.change(screen.getByLabelText("First section code"), { target: { value: "A" } });
    fireEvent.click(screen.getByRole("button", { name: "Create class and section" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Class code already exists");
    expect(screen.getByLabelText("Class name")).toHaveValue("Grade 9");
    expect(screen.getByLabelText("First section code")).toHaveValue("A");
    expect(mocks.schoolService.createAcademicSection).not.toHaveBeenCalled();
  });

  it("adds a section from the selected class details", async () => {
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
    render(<ClassDetails classId="22222222-2222-4222-8222-222222222222" />);

    fireEvent.change(await screen.findByLabelText("New section name"), {
      target: { value: "Section A" },
    });
    fireEvent.change(screen.getByLabelText("New section code"), {
      target: { value: "A" },
    });
    fireEvent.change(screen.getByLabelText("New section capacity"), {
      target: { value: "30" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add section" }));

    await waitFor(() => {
      expect(mocks.schoolService.createAcademicSection).toHaveBeenCalledWith({
        classId: "22222222-2222-4222-8222-222222222222",
        name: "Section A",
        code: "A",
        capacity: 30,
      });
    });
    await screen.findByRole("heading", { name: "Section A (A)" });
  });

  it("edits class details and section capacity, and shows server conflicts", async () => {
    mocks.schoolService.getClassrooms.mockResolvedValue([{
      id: "class-1", name: "Grade 8", code: "G8", sortOrder: 8, isActive: true,
      sections: [{ id: "section-1", name: "Section A", code: "A", capacity: 30, isActive: true }],
    }]);
    mocks.schoolService.updateClassroom.mockResolvedValue({});
    mocks.schoolService.updateAcademicSection.mockRejectedValue(new Error("Section capacity cannot be below current enrollment"));
    render(<ClassDetails classId="class-1" />);
    fireEvent.change(await screen.findByLabelText("Class name"), { target: { value: "Grade 9" } });
    fireEvent.click(screen.getByRole("button", { name: "Save class" }));
    await waitFor(() => expect(mocks.schoolService.updateClassroom).toHaveBeenCalledWith("class-1", { name: "Grade 9", code: "G8", sortOrder: 8 }));
    const form = screen.getByRole("form", { name: "Edit Section A" });
    fireEvent.change(within(form).getByLabelText("Capacity"), { target: { value: "1" } });
    fireEvent.click(within(form).getByRole("button", { name: "Save section" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Section capacity cannot be below current enrollment");
    expect(mocks.schoolService.updateAcademicSection).toHaveBeenCalledWith("class-1", "section-1", { name: "Section A", code: "A", capacity: 1 });
    expect(within(form).getByLabelText("Capacity")).toHaveValue(1);
  });

  it("can remove a section capacity limit", async () => {
    mocks.schoolService.getClassrooms.mockResolvedValue([{
      id: "class-1", name: "Grade 8", code: "G8", sortOrder: 8, isActive: true,
      sections: [{ id: "section-1", name: "Section A", code: "A", capacity: 30, isActive: true }],
    }]);
    mocks.schoolService.updateAcademicSection.mockResolvedValue({ id: "section-1" });
    render(<ClassDetails classId="class-1" />);
    const form = await screen.findByRole("form", { name: "Edit Section A" });
    fireEvent.change(within(form).getByLabelText("Capacity"), { target: { value: "" } });
    fireEvent.click(within(form).getByRole("button", { name: "Save section" }));
    await waitFor(() => expect(mocks.schoolService.updateAcademicSection).toHaveBeenCalledWith(
      "class-1", "section-1", { name: "Section A", code: "A", capacity: null },
    ));
    expect(await screen.findByText("Section updated.")).toBeVisible();
  });

  it("keeps details read-only without manage permission and reports missing classes", async () => {
    mocks.session.permissionKeys = ["academic_structure.read"];
    const { rerender } = render(<ClassDetails classId="22222222-2222-4222-8222-222222222222" />);
    await screen.findByRole("heading", { name: "Grade 8" });
    expect(screen.queryByRole("button", { name: "Save class" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add section" })).not.toBeInTheDocument();
    rerender(<ClassDetails classId="missing" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Class not found");
  });

  it("keeps create forms hidden without the manage permission", async () => {
    mocks.session.permissionKeys = ["academic_structure.read"];
    render(<ClassroomsDirectory />);

    await screen.findByRole("heading", { level: 1, name: "Classes & sections" });
    expect(screen.queryByRole("button", { name: "Create class and section" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Create section" })).toBeNull();
  });
});
