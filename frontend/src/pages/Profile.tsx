
import { useEffect, useState, type FormEvent } from "react";
import axios from "axios";

import {
  getUserProfile,
  updateUserProfile,
  type UserProfile,
} from "../services/profile";

type EditableField = "first_name" | "last_name" | "email";
type FormValues = Pick<UserProfile, EditableField>;
type FormErrors = Partial<Record<EditableField, string>>;

function getFormValues(profile: UserProfile): FormValues {
  return {
    first_name: profile.first_name,
    last_name: profile.last_name,
    email: profile.email,
  };
}

function validateForm(values: FormValues): FormErrors {
  const errors: FormErrors = {};

  if (values.first_name.trim().length > 150) {
    errors.first_name = "First name must be 150 characters or less.";
  }

  if (values.last_name.trim().length > 150) {
    errors.last_name = "Last name must be 150 characters or less.";
  }

  if (!values.email.trim()) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = "Enter a valid email address.";
  } else if (values.email.trim().length > 254) {
    errors.email = "Email must be 254 characters or less.";
  }

  return errors;
}

export default function Profile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [form, setForm] = useState<FormValues>({
    first_name: "",
    last_name: "",
    email: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<FormErrors>({});

  useEffect(() => {
    let active = true;

    async function fetchProfile() {
      try {
        const data = await getUserProfile();

        if (active) {
          setProfile(data);
          setForm(getFormValues(data));
        }
      } catch {
        if (active) {
          setError("Failed to load user profile.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void fetchProfile();

    return () => {
      active = false;
    };
  }, []);

  const normalizedForm: FormValues = {
    first_name: form.first_name.trim(),
    last_name: form.last_name.trim(),
    email: form.email.trim(),
  };

  const validationErrors = validateForm(normalizedForm);

  const hasChanges =
    profile !== null &&
    (Object.keys(normalizedForm) as EditableField[]).some(
      (field) => normalizedForm[field] !== profile[field]
    );

  const isValid = Object.keys(validationErrors).length === 0;

  function handleChange(field: EditableField, value: string) {
    if (saving) return;

    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setServerErrors((previous) => ({
      ...previous,
      [field]: undefined,
    }));

    setSuccess("");
  }

  function handleReset() {
    if (!profile || saving) return;

    setForm(getFormValues(profile));
    setSubmitted(false);
    setServerErrors({});
    setError("");
    setSuccess("");
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving || !profile || !hasChanges) return;

    setSubmitted(true);
    setError("");
    setSuccess("");
    setServerErrors({});

    if (!isValid) return;

    setSaving(true);

    try {
      const updated = await updateUserProfile(normalizedForm);

      setProfile(updated);
      setForm(getFormValues(updated));
      setSubmitted(false);
      setSuccess("Profile updated successfully!");
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 400) {
        const details = err.response.data;
        const fieldErrors: FormErrors = {};

        if (details && typeof details === "object") {
          for (const field of [
            "first_name",
            "last_name",
            "email",
          ] as EditableField[]) {
            if (details[field]) {
              const messages = details[field];
              fieldErrors[field] = Array.isArray(messages)
                ? messages.map(String).join(" ")
                : String(messages);
            }
          }
        }

        setServerErrors(fieldErrors);

        if (Object.keys(fieldErrors).length === 0) {
          setError("Invalid profile information.");
        }
      } else {
        setError("Failed to update profile. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p role="status">Loading profile...</p>;
  }

  if (!profile) {
    return <p role="alert">{error || "No profile found."}</p>;
  }

  const inputStyle = {
    display: "block" as const,
    width: "100%",
    boxSizing: "border-box" as const,
    padding: "10px",
    marginTop: "6px",
  };

  const fieldStyle = {
    marginBottom: "18px",
  };

  function fieldError(field: EditableField) {
    return serverErrors[field] ||
      (submitted ? validationErrors[field] : undefined);
  }

  return (
    <main style={{ maxWidth: "500px", margin: "30px auto", padding: "20px" }}>
      <h1>My Profile</h1>

      <p>
        <strong>Username:</strong> {profile.username}
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <div style={fieldStyle}>
          <label htmlFor="firstName">First Name</label>
          <input
            id="firstName"
            type="text"
            autoComplete="given-name"
            maxLength={151}
            value={form.first_name}
            disabled={saving}
            aria-invalid={Boolean(fieldError("first_name"))}
            aria-describedby={fieldError("first_name") ? "firstNameError" : undefined}
            onChange={(e) => handleChange("first_name", e.target.value)}
            style={inputStyle}
          />
          {fieldError("first_name") && (
            <p id="firstNameError" style={{ color: "crimson" }}>
              {fieldError("first_name")}
            </p>
          )}
        </div>

        <div style={fieldStyle}>
          <label htmlFor="lastName">Last Name</label>
          <input
            id="lastName"
            type="text"
            autoComplete="family-name"
            maxLength={151}
            value={form.last_name}
            disabled={saving}
            aria-invalid={Boolean(fieldError("last_name"))}
            aria-describedby={fieldError("last_name") ? "lastNameError" : undefined}
            onChange={(e) => handleChange("last_name", e.target.value)}
            style={inputStyle}
          />
          {fieldError("last_name") && (
            <p id="lastNameError" style={{ color: "crimson" }}>
              {fieldError("last_name")}
            </p>
          )}
        </div>

        <div style={fieldStyle}>
          <label htmlFor="email">Email *</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={form.email}
            disabled={saving}
            aria-invalid={Boolean(fieldError("email"))}
            aria-describedby={fieldError("email") ? "emailError" : undefined}
            onChange={(e) => handleChange("email", e.target.value)}
            style={inputStyle}
          />
          {fieldError("email") && (
            <p id="emailError" style={{ color: "crimson" }}>
              {fieldError("email")}
            </p>
          )}
        </div>

        {hasChanges && (
          <p style={{ color: "darkorange" }}>
            You have unsaved changes.
          </p>
        )}

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="submit"
            disabled={saving || !hasChanges || !isValid}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={saving || !hasChanges}
          >
            Reset
          </button>
        </div>
      </form>

      {error && <p role="alert" style={{ color: "crimson" }}>{error}</p>}
      {success && <p role="status" style={{ color: "green" }}>{success}</p>}
    </main>
  );
}


// Understanding the new validation
// The important additions are:
// - validateForm() checks the fields before submission.
// - hasChanges compares your current inputs against the saved profile.
// - serverErrors captures Django validation errors, including duplicate emails.
// - handleReset() restores the last successfully saved profile.
// - saving prevents multiple simultaneous submissions.
// - noValidate allows React to control the validation messages.
// Your first and last names remain optional, consistent with Django's built-in User model.