import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  session: { activeSchool: { id: "school-a", name: "Synthetic School" }, permissionKeys: ["students.read"] },
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuthSession: () => ({ session: auth.session, isLoading: false, error: null, refresh: vi.fn() }),
}));
vi.mock("@/services", async () => {
  const { ApiClient } = await import("@/services/api-client");
  const { HttpSchoolService } = await import("@/services/http/http-school-service");
  return { schoolService: new HttpSchoolService(new ApiClient("https://dashify.test/api/v1")) };
});

import { ApiStudentsDirectory } from "@/components/students-directory";

const row = {
  id: "synthetic-student", firstName: "Synthetic", lastName: "Learner", middleName: null,
  admissionNumber: "TEST-1", admissionDate: "2026-01-01", status: "ACTIVE",
  enrolments: [{ academicYear: { id: "year-a", name: "Year A" }, section: {
    id: "section-a", name: "Section A", class: { id: "class-a", name: "Class A" },
  } }],
};
const page = (data: unknown[], number = 1, total = data.length) => ({
  data, meta: { page: number, pageSize: 20, total, totalPages: Math.ceil(total / 20) },
});
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });

afterEach(() => {
  vi.unstubAllGlobals();
  auth.session = { activeSchool: { id: "school-a", name: "Synthetic School" }, permissionKeys: ["students.read"] };
});

describe("API student directory", () => {
  it.each([
    [["students.read", "students.create", "academic_structure.read"], true],
    [["students.read", "students.create"], false],
    [["students.read", "academic_structure.read"], false],
  ])("shows the add action only with both required permissions", async (permissionKeys, expected) => {
    auth.session.permissionKeys = permissionKeys;
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => {
      return Promise.resolve(response(url.endsWith("/students/search") ? page([]) : []));
    }));
    render(<ApiStudentsDirectory />);
    await screen.findByText("No records match your search.");
    const link = screen.queryByRole("link", { name: /add student/i });
    if (expected) {
      expect(link).toHaveAttribute("href", "/dashboard/students/new");
    } else {
      expect(link).not.toBeInTheDocument();
    }
  });

  it("searches on the server, selects a preview, and keeps structure controls permission-gated", async () => {
    const fetchMock = vi.fn().mockImplementation((_url: string, options: RequestInit) => {
      const body = JSON.parse(String(options.body)) as { query?: string };
      return Promise.resolve(response(page(body.query ? [] : [row])));
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<ApiStudentsDirectory />);
    fireEvent.click(await screen.findByRole("button", { name: /Synthetic Learner/ }));
    const preview = within(screen.getByRole("complementary", { name: "Student preview" }));
    expect(preview.getByText("TEST-1")).toBeInTheDocument();
    expect(preview.getByRole("link", { name: "View profile" })).toHaveAttribute("href", "/dashboard/students/synthetic-student");
    expect(screen.queryByLabelText("Class")).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search" }), { target: { value: "different learner" } });
    expect(preview.queryByText("TEST-1")).not.toBeInTheDocument();
    expect(await screen.findByText("No records match your search.")).toBeInTheDocument();
    const [url, options] = fetchMock.mock.calls.at(-1)!;
    expect(url).toBe("https://dashify.test/api/v1/students/search");
    expect(JSON.parse(String(options.body))).toMatchObject({ query: "different learner", page: 1 });
    expect(fetchMock.mock.calls.every(([path]) => path.endsWith("/students/search"))).toBe(true);
  });

  it("sends selected filters, resets pagination, and suppresses ambiguous placements", async () => {
    auth.session.permissionKeys.push("academic_structure.read");
    const fetchMock = vi.fn().mockImplementation((url: string, options: RequestInit) => {
      if (url.endsWith("/academic-years")) return Promise.resolve(response([{ id: "year-a", name: "Year A", startDate: "2026-01-01", endDate: "2026-12-31", status: "ACTIVE" }]));
      if (url.endsWith("/classes")) return Promise.resolve(response([{ id: "class-a", name: "Class A", code: "A", sortOrder: 1, isActive: true, sections: [{ id: "section-a", name: "Section A", code: "A", isActive: true, capacity: null }] }]));
      const input = JSON.parse(String(options.body)) as { page: number; sectionId?: string };
      const result = input.sectionId ? { ...row, enrolments: [row.enrolments[0], row.enrolments[0]] } : row;
      return Promise.resolve(response(page([result], input.page, 21)));
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<ApiStudentsDirectory />);
    fireEvent.click(await screen.findByRole("button", { name: "Next" }));
    await screen.findByText("Page 2 of 2");
    await waitFor(() => expect(screen.getByLabelText("Class")).toBeEnabled());
    fireEvent.change(screen.getByLabelText("Class"), { target: { value: "class-a" } });
    fireEvent.change(screen.getByLabelText("Section"), { target: { value: "section-a" } });
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "ACTIVE" } });
    await waitFor(() => {
      const calls = fetchMock.mock.calls.filter(([url]) => url.endsWith("/students/search"));
      expect(JSON.parse(String(calls.at(-1)![1].body))).toMatchObject({ page: 1, classId: "class-a", sectionId: "section-a", status: "ACTIVE" });
    });
    fireEvent.click(await screen.findByRole("button", { name: /Synthetic Learner/ }));
    const preview = within(screen.getByRole("complementary", { name: "Student preview" }));
    expect(preview.queryByText("Class A · Section A")).not.toBeInTheDocument();
  });

  it("shows errors and retries without falling back to preview data", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response({}, 403)).mockResolvedValueOnce(response(page([])));
    vi.stubGlobal("fetch", fetchMock);
    render(<ApiStudentsDirectory />);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("No records match your search.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("clears the previous school's preview when the active school changes", async () => {
    let resolveNext!: (value: Response) => void;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(page([row])))
      .mockReturnValueOnce(new Promise<Response>((resolve) => { resolveNext = resolve; }));
    vi.stubGlobal("fetch", fetchMock);
    const { rerender } = render(<ApiStudentsDirectory />);
    fireEvent.click(await screen.findByRole("button", { name: /Synthetic Learner/ }));
    expect(within(screen.getByRole("complementary", { name: "Student preview" })).getByText("TEST-1")).toBeInTheDocument();
    auth.session = { activeSchool: { id: "school-b", name: "Other School" }, permissionKeys: ["students.read"] };
    rerender(<ApiStudentsDirectory />);
    expect(screen.queryByText("TEST-1")).not.toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    resolveNext(response(page([])));
    expect(await screen.findByText("No records match your search.")).toBeInTheDocument();
  });
});
