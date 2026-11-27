import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import RegisteredUserRoute from "./RegisteredUserRoute";
const auth = vi.hoisted(() => ({ user: { id: 1 } as { id: number } | null, loading: false, isGuest: false }));
vi.mock("../context/AuthContext", () => ({ useAuth: () => auth }));
function renderRoute() {
  render(<MemoryRouter initialEntries={["/change-password"]}><Routes>
    <Route element={<RegisteredUserRoute />}><Route path="/change-password" element={<h1>Password page</h1>} /></Route>
    <Route path="/profile" element={<h1>Profile page</h1>} />
    <Route path="/login" element={<h1>Login page</h1>} />
  </Routes></MemoryRouter>);
}
describe("RegisteredUserRoute", () => {
  beforeEach(() => { auth.user = { id: 1 }; auth.loading = false; auth.isGuest = false; });
  it("allows members", () => { renderRoute(); expect(screen.getByText("Password page")).toBeInTheDocument(); });
  it("redirects guests", async () => { auth.isGuest = true; renderRoute(); expect(await screen.findByText("Profile page")).toBeInTheDocument(); });
  it("redirects anonymous users", async () => { auth.user = null; renderRoute(); expect(await screen.findByText("Login page")).toBeInTheDocument(); });
  it("waits for authentication", () => { auth.loading = true; renderRoute(); expect(screen.getByText("Checking authentication...")).toBeInTheDocument(); });
});
