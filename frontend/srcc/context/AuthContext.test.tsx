import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  act,
  renderHook,
  waitFor,
} from "@testing-library/react";

import type { ReactNode } from "react";

import {
  AuthProvider,
  useAuth,
} from "./AuthContext";

import {
  loginUser,
  loginGuestUser,
  getCurrentUser,
  logout,
} from "../services/auth";

vi.mock("../services/auth", () => ({
  loginUser: vi.fn(),
  loginGuestUser: vi.fn(),
  getCurrentUser: vi.fn(),
  logout: vi.fn(),
}));

const guestUser = {
  id: 101,
  username: "guest",
  email: "guest@neighborhood-rewards.example",
  is_guest: true,
};

const regularUser = {
  id: 1,
  username: "regular_user",
  email: "regular@example.com",
  is_guest: false,
};

const tokens = {
  access: "test-access-token",
  refresh: "test-refresh-token",
};

function wrapper({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();

    vi.mocked(logout).mockImplementation(() => {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");

      window.dispatchEvent(
        new Event("auth:logout")
      );
    });
  });

  it("starts with no authenticated user", async () => {
    const { result } = renderHook(
      () => useAuth(),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isGuest).toBe(false);
  });

  it("authenticates a guest user", async () => {
    vi.mocked(loginGuestUser).mockResolvedValue({
      ...tokens,
      user: guestUser,
    });

    vi.mocked(getCurrentUser).mockResolvedValue(
      guestUser
    );

    const { result } = renderHook(
      () => useAuth(),
      { wrapper }
    );

    await act(async () => {
      await result.current.loginAsGuest();
    });

    expect(loginGuestUser).toHaveBeenCalledTimes(1);
    expect(getCurrentUser).toHaveBeenCalledTimes(1);

    expect(result.current.user).toEqual(guestUser);
    expect(result.current.isGuest).toBe(true);
  });

  it("authenticates a regular user", async () => {
    vi.mocked(loginUser).mockResolvedValue(tokens);

    vi.mocked(getCurrentUser).mockResolvedValue(
      regularUser
    );

    const { result } = renderHook(
      () => useAuth(),
      { wrapper }
    );

    await act(async () => {
      await result.current.login(
        "regular_user",
        "password123"
      );
    });

    expect(loginUser).toHaveBeenCalledWith({
      username: "regular_user",
      password: "password123",
    });

    expect(result.current.user).toEqual(regularUser);
    expect(result.current.isGuest).toBe(false);
  });

  it("restores an existing guest session", async () => {
    localStorage.setItem(
      "refresh_token",
      tokens.refresh
    );

    vi.mocked(getCurrentUser).mockResolvedValue(
      guestUser
    );

    const { result } = renderHook(
      () => useAuth(),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.isGuest).toBe(true);
    });

    expect(result.current.user).toEqual(guestUser);
  });

  it("clears guest state on logout", async () => {
    vi.mocked(loginGuestUser).mockResolvedValue({
      ...tokens,
      user: guestUser,
    });

    vi.mocked(getCurrentUser).mockResolvedValue(
      guestUser
    );

    const { result } = renderHook(
      () => useAuth(),
      { wrapper }
    );

    await act(async () => {
      await result.current.loginAsGuest();
    });

    act(() => {
      result.current.logout();
    });

    expect(logout).toHaveBeenCalledTimes(1);
    expect(result.current.user).toBeNull();
    expect(result.current.isGuest).toBe(false);
  });

  it("handles guest login failure", async () => {
    vi.mocked(loginGuestUser).mockRejectedValue(
      new Error("Guest login unavailable")
    );

    const { result } = renderHook(
      () => useAuth(),
      { wrapper }
    );

    await act(async () => {
      await expect(
        result.current.loginAsGuest()
      ).rejects.toThrow("Guest login unavailable");
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isGuest).toBe(false);
    expect(getCurrentUser).not.toHaveBeenCalled();
  });

  it("clears authentication when user retrieval fails", async () => {
    vi.mocked(loginGuestUser).mockResolvedValue({
      ...tokens,
      user: guestUser,
    });

    vi.mocked(getCurrentUser).mockRejectedValue(
      new Error("Unable to retrieve user")
    );

    const { result } = renderHook(
      () => useAuth(),
      { wrapper }
    );

    await act(async () => {
      await expect(
        result.current.loginAsGuest()
      ).rejects.toThrow("Unable to retrieve user");
    });

    expect(logout).toHaveBeenCalledTimes(1);
    expect(result.current.user).toBeNull();
    expect(result.current.isGuest).toBe(false);
  });

  it("clears an invalid restored session", async () => {
    localStorage.setItem(
      "refresh_token",
      "expired-refresh-token"
    );

    vi.mocked(getCurrentUser).mockRejectedValue(
      new Error("Session expired")
    );

    const { result } = renderHook(
      () => useAuth(),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(logout).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
    expect(result.current.isGuest).toBe(false);

    expect(
      localStorage.getItem("refresh_token")
    ).toBeNull();
  });
});
