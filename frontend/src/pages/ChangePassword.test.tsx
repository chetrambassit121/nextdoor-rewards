
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


describe("5.9.8.2 password visibility", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockUseAuth.mockReturnValue({ user: null, loading: false, login: vi.fn(), logout: mockLogout });
  });

  it("toggles each field independently without clearing entered values", async () => {
    const user = userEvent.setup();
    renderForm();
    const current = screen.getByLabelText("Current Password") as HTMLInputElement;
    const next = screen.getByLabelText("New Password", { exact: true }) as HTMLInputElement;
    await user.type(current, "Secret123!");
    expect(current.type).toBe("password");
    await user.click(screen.getByRole("button", { name: "Show Current Password" }));
    expect(current.type).toBe("text");
    expect(current.value).toBe("Secret123!");
    expect(next.type).toBe("password");
    await user.click(screen.getByRole("button", { name: "Hide Current Password" }));
    expect(current.type).toBe("password");
  });
});


describe("5.9.8.3 password guidance", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockUseAuth.mockReturnValue({ user: null, loading: false, login: vi.fn(), logout: mockLogout });
  });

  it("updates strength guidance as the user types", async () => {
    const user = userEvent.setup();
    renderForm();
    const password = screen.getByLabelText("New Password", { exact: true });
    expect(screen.getByText("Enter a password")).toBeInTheDocument();
    await user.type(password, "abc");
    expect(screen.getByText("Weak")).toBeInTheDocument();
    await user.clear(password);
    await user.type(password, "StrongPass123!");
    expect(screen.getByText("Strong")).toBeInTheDocument();
    expect(screen.getByText("Symbol").closest("li")).toHaveClass("requirement-met");
  });

  it("shows live confirmation feedback without sending a request", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText("New Password", { exact: true }), "StrongPass123!");
    const confirm = screen.getByLabelText("Confirm New Password");
    await user.type(confirm, "Different123!");
    expect(screen.getByText("Passwords do not match yet.")).toBeInTheDocument();
    await user.clear(confirm);
    await user.type(confirm, "StrongPass123!");
    expect(screen.getByText("Passwords match.")).toBeInTheDocument();
    expect(mockChangePassword).not.toHaveBeenCalled();
  });
  it("disables submission and shows progress while updating", async () => {
    const user = userEvent.setup();
    let finish!: (value: { message: string }) => void;
    mockChangePassword.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    renderForm();
    await fillForm(user);
    await submitForm(user);
    expect(screen.getByRole("button", { name: "Updating..." })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Updating your password securely");
    expect(screen.getByText("Cancel")).toHaveAttribute("aria-disabled", "true");
    expect(mockChangePassword).toHaveBeenCalledTimes(1);
    finish({ message: "Updated" });
    await waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1));
  });

  it("displays a general backend validation error", async () => {
    const user = userEvent.setup();
    mockChangePassword.mockRejectedValue(new axios.AxiosError("Bad Request", "ERR_BAD_REQUEST", undefined, undefined, {
      data: { non_field_errors: ["Please choose a different password."] },
      status: 400, statusText: "Bad Request", headers: {}, config: { headers: new axios.AxiosHeaders() },
    }));
    renderForm();
    await fillForm(user);
    await submitForm(user);
    expect(await screen.findByRole("alert")).toHaveTextContent("Please choose a different password.");
    expect(screen.getByLabelText("Current Password")).toHaveValue(validPayload.current_password);
    expect(mockLogout).not.toHaveBeenCalled();
  });

});


describe("5.9.8.5 final regression coverage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockUseAuth.mockReturnValue({ user: null, loading: false, login: vi.fn(), logout: mockLogout });
  });

  it("rejects reusing the current password before calling the API", async () => {
    const user = userEvent.setup();
    renderForm();
    await fillForm(user, {
      current_password: "SamePassword123!",
      new_password: "SamePassword123!",
      confirm_password: "SamePassword123!",
    });
    await submitForm(user);
    expect(screen.getByText("New password must be different from current password.")).toBeInTheDocument();
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it("shows an expired session message without logging out on an unsuccessful request", async () => {
    const user = userEvent.setup();
    mockChangePassword.mockRejectedValue(new axios.AxiosError("Unauthorized", "ERR_BAD_RESPONSE", undefined, undefined, {
      data: { detail: "Unauthorized" },
      status: 401, statusText: "Unauthorized", headers: {},
      config: { headers: new axios.AxiosHeaders() },
    }));
    renderForm();
    await fillForm(user);
    await submitForm(user);
    expect(await screen.findByRole("alert")).toHaveTextContent("Your session has expired. Please log in again.");
    expect(mockLogout).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("shows a connection error for an Axios network failure", async () => {
    const user = userEvent.setup();
    mockChangePassword.mockRejectedValue(new axios.AxiosError("Network Error", "ERR_NETWORK"));
    renderForm();
    await fillForm(user);
    await submitForm(user);
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to connect to the server.");
    expect(screen.getByLabelText("New Password", { exact: true })).toHaveValue(validPayload.new_password);
  });

  it("prevents duplicate submissions while an update is in progress", async () => {
    const user = userEvent.setup();
    let finish!: (value: { message: string }) => void;
    mockChangePassword.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    renderForm();
    await fillForm(user);
    await submitForm(user);
    expect(mockChangePassword).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Updating..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Show New Password" })).toBeDisabled();
    finish({ message: "Password changed successfully." });
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
  });

  it("provides profile navigation and accessible field error descriptions", async () => {
    const user = userEvent.setup();
    renderForm();
    expect(screen.getByRole("link", { name: /Back to Profile/i })).toHaveAttribute("href", "/profile");
    await submitForm(user);
    const current = screen.getByLabelText("Current Password");
    expect(current).toHaveAttribute("aria-invalid", "true");
    expect(current).toHaveAttribute("aria-describedby", "current_password-error");
    expect(screen.getByText("Current password is required.")).toHaveAttribute("id", "current_password-error");
  });
});
