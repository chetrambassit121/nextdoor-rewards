
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import Register from "./Register";

const mocks = vi.hoisted(() => ({
  registerUser: vi.fn(),
}));

vi.mock("../services/auth", () => ({
  registerUser: mocks.registerUser,
}));

const renderRegister = () => {
  return render(
    <MemoryRouter initialEntries={["/register"]}>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route
          path="/login"
          element={<div>Login page</div>}
        />
      </Routes>
    </MemoryRouter>
  );
};

const fillValidForm = () => {
  fireEvent.change(
    screen.getByLabelText(/^username$/i),
    { target: { value: "neighbor123" } }
  );

  fireEvent.change(
    screen.getByLabelText(/^email address$/i),
    { target: { value: "neighbor@example.com" } }
  );

  fireEvent.change(
    screen.getByLabelText(/^password$/i),
    { target: { value: "SecurePassword123!" } }
  );

  fireEvent.change(
    screen.getByLabelText(/^confirm password$/i),
    { target: { value: "SecurePassword123!" } }
  );
};

describe("Register Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.registerUser.mockResolvedValue(undefined);
  });

  it("renders the registration form", () => {
    renderRegister();

    expect(
      screen.getByRole("heading", {
        name: /join your neighborhood/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText(/^username$/i)
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText(/^email address$/i)
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText(/^password$/i)
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText(/^confirm password$/i)
    ).toBeInTheDocument();
  });

  it("shows errors for empty fields", async () => {
    renderRegister();

    fireEvent.click(
      screen.getByRole("button", {
        name: /^create account$/i,
      })
    );

    expect(
      await screen.findByText("Username is required.")
    ).toBeInTheDocument();

    expect(
      screen.getByText("Email is required.")
    ).toBeInTheDocument();

    expect(
      screen.getByText("Password is required.")
    ).toBeInTheDocument();

    expect(
      screen.getByText("Please confirm your password.")
    ).toBeInTheDocument();

    expect(mocks.registerUser).not.toHaveBeenCalled();
  });

  it("rejects an invalid email", () => {
    renderRegister();

    fillValidForm();

    fireEvent.change(
      screen.getByLabelText(/^email address$/i),
      { target: { value: "invalid-email" } }
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /^create account$/i,
      })
    );

    expect(
      screen.getByText("Enter a valid email address.")
    ).toBeInTheDocument();

    expect(mocks.registerUser).not.toHaveBeenCalled();
  });

  it("rejects mismatched passwords", () => {
    renderRegister();

    fillValidForm();

    fireEvent.change(
      screen.getByLabelText(/^confirm password$/i),
      { target: { value: "DifferentPassword123!" } }
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /^create account$/i,
      })
    );

    expect(
      screen.getByText("Passwords do not match.")
    ).toBeInTheDocument();

    expect(mocks.registerUser).not.toHaveBeenCalled();
  });

  it("toggles password visibility independently", () => {
    renderRegister();

    const password = screen.getByLabelText(/^password$/i);
    const confirmPassword =
      screen.getByLabelText(/^confirm password$/i);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Show password",
      })
    );

    expect(password).toHaveAttribute("type", "text");
    expect(confirmPassword).toHaveAttribute(
      "type",
      "password"
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Show confirm password",
      })
    );

    expect(confirmPassword).toHaveAttribute("type", "text");
  });

  it("registers successfully and navigates to login", async () => {
    renderRegister();

    fillValidForm();

    fireEvent.click(
      screen.getByRole("button", {
        name: /^create account$/i,
      })
    );

    await waitFor(() => {
      expect(mocks.registerUser).toHaveBeenCalledWith({
        username: "neighbor123",
        email: "neighbor@example.com",
        password: "SecurePassword123!",
      });
    });

    expect(
      await screen.findByText("Login page")
    ).toBeInTheDocument();
  });

  it("shows an error when registration fails", async () => {
    mocks.registerUser.mockRejectedValue(
      new Error("Registration failed")
    );

    renderRegister();

    fillValidForm();

    fireEvent.click(
      screen.getByRole("button", {
        name: /^create account$/i,
      })
    );

    expect(
        await screen.findByText(
            /unable to create your account/i
        )
    ).toBeInTheDocument();
  });

  it("disables the button while registering", async () => {
    let resolveRegister!: () => void;

    mocks.registerUser.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveRegister = resolve;
        })
    );

    renderRegister();

    fillValidForm();

    fireEvent.click(
      screen.getByRole("button", {
        name: /^create account$/i,
      })
    );

    const button = screen.getByRole("button", {
      name: /creating account/i,
    });

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");

    resolveRegister();

    expect(
      await screen.findByText("Login page")
    ).toBeInTheDocument();
  });
});
