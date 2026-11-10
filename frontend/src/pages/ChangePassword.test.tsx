
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";

import ChangePassword from "./ChangePassword";
import { changePassword } from "../services/password";
import { useAuth } from "../context/AuthContext";

const mockNavigate = vi.fn();

vi.mock("../services/password", () => ({
  changePassword: vi.fn(),
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("react-router-dom")>();

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockChangePassword = vi.mocked(changePassword);
const mockUseAuth = vi.mocked(useAuth);
const mockLogout = vi.fn();

const validPayload = {
  current_password: "OldPassword123!",
  new_password: "NewPassword456!",
  confirm_password: "NewPassword456!",
};

function renderForm() {
  return render(
    <MemoryRouter>
      <ChangePassword />
    </MemoryRouter>
  );
}

async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  values = validPayload
) {
  await user.type(
    screen.getByLabelText("Current Password"),
    values.current_password
  );

  await user.type(
    screen.getByLabelText("New Password", { exact: true }),
    values.new_password
  );

  await user.type(
    screen.getByLabelText("Confirm New Password"),
    values.confirm_password
  );
}

async function submitForm(
  user: ReturnType<typeof userEvent.setup>
) {
  await user.click(
    screen.getByRole("button", {
      name: "Update Password",
    })
  );
}

describe("ChangePassword Component", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      logout: mockLogout,
    });
  });

  it("renders all password fields", () => {
    renderForm();

    expect(
      screen.getByRole("heading", {
        name: "Change Password",
      })
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText("Current Password")
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText("New Password", {
        exact: true,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText("Confirm New Password")
    ).toBeInTheDocument();
  });

  it("validates required fields", async () => {
    const user = userEvent.setup();
    renderForm();

    await submitForm(user);

    expect(
      screen.getByText("Current password is required.")
    ).toBeInTheDocument();

    expect(
      screen.getByText("New password is required.")
    ).toBeInTheDocument();

    expect(
      screen.getByText("Please confirm your new password.")
    ).toBeInTheDocument();

    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it("rejects mismatched passwords", async () => {
    const user = userEvent.setup();
    renderForm();

    await fillForm(user, {
      ...validPayload,
      confirm_password: "DifferentPassword456!",
    });

    await submitForm(user);

    expect(
      screen.getByText("Passwords do not match.")
    ).toBeInTheDocument();

    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it("rejects passwords shorter than 8 characters", async () => {
    const user = userEvent.setup();
    renderForm();

    await fillForm(user, {
      ...validPayload,
      new_password: "123",
      confirm_password: "123",
    });

    await submitForm(user);

    expect(
      screen.getByText(
        "Password must be at least 8 characters."
      )
    ).toBeInTheDocument();

    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it("displays incorrect current password error", async () => {
    const user = userEvent.setup();

    mockChangePassword.mockRejectedValue(
      new axios.AxiosError(
        "Bad Request",
        "ERR_BAD_REQUEST",
        undefined,
        undefined,
        {
          data: {
            current_password: [
              "Current password is incorrect.",
            ],
          },
          status: 400,
          statusText: "Bad Request",
          headers: {},
          config: { headers: new axios.AxiosHeaders() },
        }
      )
    );

    renderForm();
    await fillForm(user);
    await submitForm(user);

    expect(
      await screen.findByText(
        "Current password is incorrect."
      )
    ).toBeInTheDocument();

    expect(mockLogout).not.toHaveBeenCalled();
  });

  it("changes password and redirects on success", async () => {
    const user = userEvent.setup();

    mockChangePassword.mockResolvedValue({
      message: "Password changed successfully.",
    });

    renderForm();
    await fillForm(user);
    await submitForm(user);

    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith(
        validPayload
      );
    });

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      "/login",
      {
        replace: true,
        state: {
          message:
            "Password changed successfully. Please log in again.",
        },
      }
    );
  });

  it("displays an error when the server fails", async () => {
    const user = userEvent.setup();

    mockChangePassword.mockRejectedValue(
      new Error("Network failure")
    );

    renderForm();
    await fillForm(user);
    await submitForm(user);

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent(
      "An unexpected error occurred."
    );

    expect(mockLogout).not.toHaveBeenCalled();
  });

  it("toggles password visibility", async () => {
    const user = userEvent.setup();
    renderForm();

    const currentPassword = screen.getByLabelText(
      "Current Password"
    );

    expect(currentPassword).toHaveAttribute(
      "type",
      "password"
    );

    await user.click(
      screen.getByRole("button", {
        name: "Show Current Password",
      })
    );

    expect(currentPassword).toHaveAttribute(
      "type",
      "text"
    );

    await user.click(
      screen.getByRole("button", {
        name: "Hide Current Password",
      })
    );

    expect(currentPassword).toHaveAttribute(
      "type",
      "password"
    );
  });
});
