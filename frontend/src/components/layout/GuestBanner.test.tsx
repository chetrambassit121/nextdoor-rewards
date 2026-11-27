import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import GuestBanner from "./GuestBanner";
const auth = vi.hoisted(() => ({ isGuest: true, logout: vi.fn() }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => auth }));
function renderBanner() {
  render(<MemoryRouter initialEntries={["/dashboard"]}><Routes>
    <Route path="/dashboard" element={<GuestBanner />} />
    <Route path="/register" element={<h1>Registration page</h1>} />
  </Routes></MemoryRouter>);
}
describe("GuestBanner", () => {
  beforeEach(() => { auth.isGuest = true; vi.clearAllMocks(); });
  it("shows guest mode", () => { renderBanner(); expect(screen.getByLabelText("Guest mode")).toBeInTheDocument(); });
  it("hides for members", () => { auth.isGuest = false; renderBanner(); expect(screen.queryByLabelText("Guest mode")).not.toBeInTheDocument(); });
  it("logs out and opens registration", async () => { renderBanner(); fireEvent.click(screen.getByRole("button", { name: /create an account/i })); expect(auth.logout).toHaveBeenCalledTimes(1); expect(await screen.findByText("Registration page")).toBeInTheDocument(); });
});
