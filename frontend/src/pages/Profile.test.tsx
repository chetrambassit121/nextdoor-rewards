import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import { MemoryRouter } from "react-router-dom";

import Profile from "./Profile";
import {
  getUserProfile,
  updateUserProfile,
} from "../services/profile";

vi.mock("../services/profile", () => ({
  getUserProfile: vi.fn(),
  updateUserProfile: vi.fn(),
}));

const authMock = vi.hoisted(() => ({ isGuest: false }));
vi.mock("../context/AuthContext", () => ({ useAuth: () => authMock }));

const mockGetProfile = vi.mocked(getUserProfile);
const mockUpdateProfile = vi.mocked(updateUserProfile);

const profile = {
  id: 1,
  username: "testuser",
  first_name: "John",
  last_name: "Doe",
  email: "john@example.com",
};

async function loadProfile() {
  render(
    <MemoryRouter>
      <Profile />
    </MemoryRouter>
  );

  await screen.findByRole("heading", {
    name: "My Profile",
  });
}

describe("Profile Component", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    authMock.isGuest = false;
    mockGetProfile.mockResolvedValue({ ...profile });
  });

  it("shows loading state", () => {
    mockGetProfile.mockReturnValue(
      new Promise(() => {})
    );

    render(
    <MemoryRouter>
        <Profile />
    </MemoryRouter>
    );

    expect(
      screen.getByText("Loading profile...")
    ).toBeInTheDocument();
  });

  it("displays user profile information", async () => {
    await loadProfile();

    expect(screen.getByText("@testuser")).toBeInTheDocument();

    expect(
      screen.getByLabelText("First Name")
    ).toHaveValue("John");

    expect(
      screen.getByLabelText("Last Name")
    ).toHaveValue("Doe");

    expect(
      screen.getByLabelText("Email *")
    ).toHaveValue("john@example.com");
  });

  it("renders redesigned header, avatar, and security link", async () => {
    await loadProfile();
    expect(screen.getByRole("region", { name: "Profile overview" })).toHaveTextContent("John Doe");
    expect(screen.getByText("JD")).toBeInTheDocument();
    expect(screen.getByText("Community member")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Personal Information" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Account Security" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Change Password" })).toHaveAttribute("href", "/change-password");
  });

  it("uses username for display name when names are blank", async () => {
    mockGetProfile.mockResolvedValue({ ...profile, first_name: "", last_name: "" });
    await loadProfile();
    expect(screen.getByRole("region", { name: "Profile overview" })).toHaveTextContent("@testuser");
    expect(screen.getByText("T")).toBeInTheDocument();
  });

  it("shows email validation feedback after leaving the field", async () => {
    const user = userEvent.setup();
    await loadProfile();
    const email = screen.getByLabelText("Email *");
    await user.clear(email);
    await user.type(email, "not-an-email");
    await user.tab();
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();
  });

  it("prevents duplicate submission while saving", async () => {
    const user = userEvent.setup();
    let resolveSave!: (value: typeof profile) => void;
    mockUpdateProfile.mockImplementation(() => new Promise((resolve) => { resolveSave = resolve; }));
    await loadProfile();
    await user.clear(screen.getByLabelText("First Name"));
    await user.type(screen.getByLabelText("First Name"), "Jane");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Reset" })).toBeDisabled();
    expect(mockUpdateProfile).toHaveBeenCalledTimes(1);
    resolveSave({ ...profile, first_name: "Jane" });
    expect(await screen.findByText("Profile updated successfully!")).toBeInTheDocument();
  });

  it("displays an error when loading fails", async () => {
    mockGetProfile.mockRejectedValue(
      new Error("Network error")
    );

    render(
        <MemoryRouter>
            <Profile />
        </MemoryRouter>
    );

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent("Failed to load user profile.");
  });

  it("detects unsaved changes", async () => {
    const user = userEvent.setup();
    await loadProfile();

    const firstName = screen.getByLabelText("First Name");

    await user.clear(firstName);
    await user.type(firstName, "Jane");

    expect(
      screen.getByText("You have unsaved changes.")
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Save Changes" })
    ).toBeEnabled();
  });

  it("saves updated profile information", async () => {
    const user = userEvent.setup();

    mockUpdateProfile.mockResolvedValue({
      ...profile,
      first_name: "Jane",
    });

    await loadProfile();

    const firstName = screen.getByLabelText("First Name");

    await user.clear(firstName);
    await user.type(firstName, "Jane");

    await user.click(
      screen.getByRole("button", { name: "Save Changes" })
    );

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        first_name: "Jane",
        last_name: "Doe",
        email: "john@example.com",
      });
    });

    expect(
      await screen.findByText("Profile updated successfully!")
    ).toBeInTheDocument();

    expect(firstName).toHaveValue("Jane");
  });

  it("resets unsaved changes", async () => {
    const user = userEvent.setup();
    await loadProfile();

    const firstName = screen.getByLabelText("First Name");

    await user.clear(firstName);
    await user.type(firstName, "Jane");

    await user.click(
      screen.getByRole("button", { name: "Reset" })
    );

    expect(firstName).toHaveValue("John");
    expect(
      screen.queryByText("You have unsaved changes.")
    ).not.toBeInTheDocument();
  });

  it("prevents saving an invalid email", async () => {
    const user = userEvent.setup();
    await loadProfile();

    const email = screen.getByLabelText("Email *");

    await user.clear(email);
    await user.type(email, "invalid-email");

    expect(
      screen.getByRole("button", { name: "Save Changes" })
    ).toBeDisabled();

    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it("prevents saving an empty email", async () => {
    const user = userEvent.setup();
    await loadProfile();

    await user.clear(screen.getByLabelText("Email *"));

    expect(
      screen.getByRole("button", { name: "Save Changes" })
    ).toBeDisabled();

    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it("displays duplicate email errors from Django", async () => {
    const user = userEvent.setup();

    mockUpdateProfile.mockRejectedValue(
      new axios.AxiosError(
        "Bad Request",
        "ERR_BAD_REQUEST",
        undefined,
        undefined,
        {
          data: {
            email: ["A user with this email already exists."],
          },
          status: 400,
          statusText: "Bad Request",
          headers: {},
          config: { headers: new axios.AxiosHeaders() },
        }
      )
    );

    await loadProfile();

    const email = screen.getByLabelText("Email *");

    await user.clear(email);
    await user.type(email, "existing@example.com");

    await user.click(
      screen.getByRole("button", { name: "Save Changes" })
    );

    expect(
      await screen.findByText(
        "A user with this email already exists."
      )
    ).toBeInTheDocument();
  });

  it("displays an error when updating fails", async () => {
    const user = userEvent.setup();

    mockUpdateProfile.mockRejectedValue(
      new Error("Server error")
    );

    await loadProfile();

    const firstName = screen.getByLabelText("First Name");

    await user.clear(firstName);
    await user.type(firstName, "Jane");

    await user.click(
      screen.getByRole("button", { name: "Save Changes" })
    );

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent(
      "Failed to update profile. Please try again."
    );
  });
});

it("renders guest profile as read-only without editing or password controls", async () => {
  authMock.isGuest = true;
  mockGetProfile.mockResolvedValue({ ...profile, username: "guest" });
  await loadProfile();
  for (const name of [/first name/i, /last name/i, /email/i]) {
    expect(screen.getByLabelText(name)).toHaveAttribute("readonly");
  }
  expect(screen.queryByRole("button", { name: /save changes|reset/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /change password/i })).not.toBeInTheDocument();
  expect(screen.getByText("Guest visitor")).toBeInTheDocument();
});
