// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Report } from "@bilcode/contracts";
import { api } from "@/lib/api";
import { StatusDialog } from "./status-dialog";

// jsdom has no ResizeObserver; Radix radio items measure themselves with it.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const report = {
  id: "8f8d3b1e-0000-4000-8000-000000000001",
  status: "PENDING",
  version: 3,
} as Report;

function renderDialog(value: Report = report) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <StatusDialog report={value} />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("StatusDialog", () => {
  it("offers only the transitions allowed from the current status", () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Ubah status" }));
    const options = screen.getAllByRole("radio").map((r) => r.id);
    expect(options).toEqual(["status-IN_PROGRESS", "status-REJECTED"]);
  });

  it("requires a reason before rejecting and sends the version it saw", async () => {
    const request = vi
      .spyOn(api, "request")
      .mockResolvedValue({ ...report, status: "REJECTED", version: 4 });
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Ubah status" }));
    fireEvent.click(screen.getByRole("radio", { name: /Ditolak/ }));
    fireEvent.click(screen.getByRole("button", { name: "Simpan status" }));
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Tuliskan alasan penolakan untuk pelapor.",
    );
    expect(request).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/Catatan untuk pelapor/), {
      target: { value: "Lokasi berada di area privat." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Simpan status" }));
    await vi.waitFor(() => expect(request).toHaveBeenCalledOnce());
    expect(JSON.parse(String(request.mock.calls[0]![1]!.body))).toEqual({
      status: "REJECTED",
      version: 3,
      note: "Lokasi berada di area privat.",
    });
  });

  it("renders nothing for a final status", () => {
    const { container } = renderDialog({ ...report, status: "COMPLETED" });
    expect(container.innerHTML).toBe("");
  });
});
