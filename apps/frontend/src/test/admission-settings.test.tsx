import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const service = vi.hoisted(() => ({
  getAdmissionSettings: vi.fn(),
  updateAdmissionSettings: vi.fn(),
}));
vi.mock("@/services", () => ({ schoolService: service }));
import { AdmissionSettings } from "@/components/admission-settings";

describe("admission prefix settings", () => {
  it("loads the current prefix and saves the server-normalized value", async () => {
    service.getAdmissionSettings.mockResolvedValue({ prefix: "SCHOOL" });
    service.updateAdmissionSettings.mockResolvedValue({ prefix: "NEW" });
    render(<AdmissionSettings />);
    const input = await screen.findByLabelText("Admission ID prefix");
    expect(input).toHaveValue("SCHOOL");
    fireEvent.change(input, { target: { value: "new" } });
    fireEvent.click(screen.getByRole("button", { name: "Save prefix" }));
    await waitFor(() => expect(service.updateAdmissionSettings).toHaveBeenCalledWith("new"));
    expect(await screen.findByRole("status")).toHaveTextContent("Admission prefix saved.");
    expect(input).toHaveValue("NEW");
  });
});
