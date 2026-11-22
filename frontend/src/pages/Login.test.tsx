
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import Login from "./Login";

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    login: mocks.login,
  }),
}));

const renderLogin = (
  initialEntries: Array<string | {
    pathname: string;
    state?: unknown;
  }> = ["/login"]
) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={<div>Dashboard page</div>}
        />
        <Route
          path="/register"
          element={<div>Registration page</div>}
        />
      </Routes>
    </MemoryRouter>
  );
};

describe("Login Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.login.mockResolvedValue(undefined);
  });

  it("renders the login form", () => {
    renderLogin();

    expect(
      screen.getByRole("heading", { name: /welcome back/i })
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText(/username/i)
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText(/^password$/i)
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /^sign in$/i })
    ).toBeInTheDocument();
  });

  it("shows required field errors", async () => {
    renderLogin();

    fireEvent.click(
      screen.getByRole("button", { name: /^sign in$/i })
    );

    expect(
      await screen.findByText("Username is required.")
    ).toBeInTheDocument();

    expect(
      screen.getByText("Password is required.")
    ).toBeInTheDocument();

    expect(mocks.login).not.toHaveBeenCalled();
  });

  it("toggles password visibility", () => {
    renderLogin();

    const password = screen.getByLabelText(/^password$/i);

    expect(password).toHaveAttribute("type", "password");

    fireEvent.click(
      screen.getByRole("button", { name: "Show password" })
    );

    expect(password).toHaveAttribute("type", "text");

    fireEvent.click(
      screen.getByRole("button", { name: "Hide password" })
    );

    expect(password).toHaveAttribute("type", "password");
  });

  it("submits valid credentials and navigates", async () => {
    renderLogin();

    fireEvent.change(
      screen.getByLabelText(/username/i),
      { target: { value: "neighbor123" } }
    );

    fireEvent.change(
      screen.getByLabelText(/^password$/i),
      { target: { value: "SecurePassword123!" } }
    );

    fireEvent.click(
      screen.getByRole("button", { name: /^sign in$/i })
    );

    await waitFor(() => {
      expect(mocks.login).toHaveBeenCalledWith(
        "neighbor123",
        "SecurePassword123!"
      );
    });

    expect(
      await screen.findByText("Dashboard page")
    ).toBeInTheDocument();
  });

  it("displays an error when login fails", async () => {
    mocks.login.mockRejectedValue(
      new Error("Invalid credentials")
    );

    renderLogin();

    fireEvent.change(
      screen.getByLabelText(/username/i),
      { target: { value: "neighbor123" } }
    );

    fireEvent.change(
      screen.getByLabelText(/^password$/i),
      { target: { value: "wrongpassword" } }
    );

    fireEvent.click(
      screen.getByRole("button", { name: /^sign in$/i })
    );

    expect(
      await screen.findByText(
        /unable to sign in/i
      )
    ).toBeInTheDocument();
  });

  it("displays a registration success message", () => {
    renderLogin([
      {
        pathname: "/login",
        state: {
          message: "Account created successfully!",
        },
      },
    ]);

    expect(
      screen.getByRole("status")
    ).toHaveTextContent(
      "Account created successfully!"
    );
  });

  it("navigates to registration", () => {
    renderLogin();

    fireEvent.click(
      screen.getByRole("link", {
        name: /create an account/i,
      })
    );

    expect(
      screen.getByText("Registration page")
    ).toBeInTheDocument();
  });

  it("disables the button while submitting", async () => {
    let resolveLogin!: () => void;

    mocks.login.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveLogin = resolve;
        })
    );

    renderLogin();

    fireEvent.change(
      screen.getByLabelText(/username/i),
      { target: { value: "neighbor123" } }
    );

    fireEvent.change(
      screen.getByLabelText(/^password$/i),
      { target: { value: "SecurePassword123!" } }
    );

    fireEvent.click(
      screen.getByRole("button", { name: /^sign in$/i })
    );

    const button = screen.getByRole("button", {
      name: /signing in/i,
    });

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");

    resolveLogin();

    expect(
      await screen.findByText("Dashboard page")
    ).toBeInTheDocument();
  });
});
