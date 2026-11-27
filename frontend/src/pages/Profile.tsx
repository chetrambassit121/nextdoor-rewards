import { useEffect, useState, type FormEvent } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  getUserProfile,
  updateUserProfile,
  type UserProfile,
} from "../services/profile";
import "./Profile.css";
import { useAuth } from "../context/AuthContext";

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
  const { isGuest } = useAuth();
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
  const [touched, setTouched] = useState<Partial<Record<EditableField, boolean>>>({});
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
    if (isGuest || saving) return;

    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setServerErrors((previous) => ({
      ...previous,
      [field]: undefined,
    }));

    setSuccess("");
    setError("");
  }

  function handleBlur(field: EditableField) {
    if (isGuest) return;
    setTouched((previous) => ({ ...previous, [field]: true }));
  }

  function handleReset() {
    if (isGuest || !profile || saving) return;

    setForm(getFormValues(profile));
    setSubmitted(false);
    setTouched({});
    setServerErrors({});
    setError("");
    setSuccess("");
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isGuest || saving || !profile || !hasChanges) return;

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
      setTouched({});
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

  function fieldError(field: EditableField) {
    return serverErrors[field] || (submitted || touched[field] ? validationErrors[field] : undefined);
  }

  const displayName = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.username;
  const initials = displayName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("");

  return (
    <main className="profile-page">
      <header className="profile-intro">
        <p className="profile-eyebrow">Account settings</p>
        <h1>My Profile</h1>
        <p>Manage your personal information and account security.</p>
      </header>

      <section className="profile-hero" aria-label="Profile overview">
        <div className="profile-avatar" aria-hidden="true">{initials}</div>
        <div className="profile-identity">
          <h2>{displayName}</h2>
          <p className="profile-username">@{profile.username}</p>
          <span className="profile-member-badge">{isGuest ? "Guest visitor" : "Community member"}</span>
        </div>
      </section>

      <div className="profile-grid">
        <section className="profile-card" aria-labelledby="personal-info-title">
          <div className="profile-card-header">
            <h2 id="personal-info-title">Personal Information</h2>
            <p>{isGuest ? "Guest profile information is read-only." : "Update the details associated with your account."}</p>
          </div>
          <form onSubmit={handleSubmit} noValidate>
            <div className="profile-name-row">
            <div className="profile-field">
              <label htmlFor="firstName">First Name</label>
              <input id="firstName" onBlur={() => handleBlur("first_name")} type="text" autoComplete="given-name" maxLength={151}
                value={form.first_name} disabled={saving} readOnly={isGuest}
                aria-invalid={Boolean(fieldError("first_name"))}
                aria-describedby={fieldError("first_name") ? "firstNameError" : undefined}
                onChange={(e) => handleChange("first_name", e.target.value)} />
              {fieldError("first_name") && <p className="profile-field-error" id="firstNameError">{fieldError("first_name")}</p>}
            </div>
            <div className="profile-field">
              <label htmlFor="lastName">Last Name</label>
              <input id="lastName" onBlur={() => handleBlur("last_name")} type="text" autoComplete="family-name" maxLength={151}
                value={form.last_name} disabled={saving} readOnly={isGuest}
                aria-invalid={Boolean(fieldError("last_name"))}
                aria-describedby={fieldError("last_name") ? "lastNameError" : undefined}
                onChange={(e) => handleChange("last_name", e.target.value)} />
              {fieldError("last_name") && <p className="profile-field-error" id="lastNameError">{fieldError("last_name")}</p>}
            </div>
            </div>
            <div className="profile-field">
              <label htmlFor="email">Email *</label>
              <input id="email" onBlur={() => handleBlur("email")} type="email" autoComplete="email" maxLength={254}
                value={form.email} disabled={saving} readOnly={isGuest}
                aria-invalid={Boolean(fieldError("email"))}
                aria-describedby={fieldError("email") ? "emailError" : "emailHint"}
                onChange={(e) => handleChange("email", e.target.value)} />
              {fieldError("email") ? <p className="profile-field-error" id="emailError">{fieldError("email")}</p> : <p className="profile-field-hint" id="emailHint">Used for your account information.</p>}
            </div>
            {!isGuest && hasChanges && <p className="profile-unsaved" role="status"><span aria-hidden="true">●</span> You have unsaved changes.</p>}
            {!isGuest && (
            <div className="profile-actions">
              <button className="profile-save" type="submit" disabled={saving || !hasChanges || !isValid}>
                {saving && <span className="profile-spinner" aria-hidden="true" />}
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button className="profile-reset" type="button" onClick={handleReset} disabled={saving || !hasChanges}>Reset</button>
            </div>
            )}
          </form>
          {error && <div role="alert" className="profile-alert profile-alert-error"><span aria-hidden="true">!</span>{error}</div>}
          {success && <div role="status" className="profile-alert profile-alert-success"><span aria-hidden="true">✓</span>{success}</div>}
        </section>

        <section className="profile-card profile-security" aria-labelledby="security-title">
          <div className="profile-card-header">
            <h2 id="security-title">Account Security</h2>
            <p>Keep your Neighborhood Rewards account protected.</p>
          </div>
          <div className="profile-security-content">
            <div className="profile-security-icon" aria-hidden="true">🔒</div>
            <h3>Password</h3>
            {isGuest ? (
              <p className="profile-guest-notice">Password management is unavailable in guest mode.</p>
            ) : (
              <>
                <p>Update your password regularly to help keep your account secure.</p>
                <Link className="profile-password-link" to="/change-password">Change Password</Link>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
