
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import "./ChangePassword.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { changePassword } from "../services/password";

type PasswordField =
  | "current_password"
  | "new_password"
  | "confirm_password";

type PasswordForm = Record<PasswordField, string>;
type FormErrors = Partial<Record<PasswordField, string>>;

const passwordChecks = [
  { label: "At least 8 characters", test: (value: string) => value.length >= 8 },
  { label: "Uppercase letter", test: (value: string) => /[A-Z]/.test(value) },
  { label: "Lowercase letter", test: (value: string) => /[a-z]/.test(value) },
  { label: "Number", test: (value: string) => /[0-9]/.test(value) },
  { label: "Symbol", test: (value: string) => /[^A-Za-z0-9]/.test(value) },
];

function passwordStrength(value: string) {
  if (!value) return { score: 0, label: "Enter a password" };
  const score = passwordChecks.filter((check) => check.test(value)).length;
  return { score, label: score <= 2 ? "Weak" : score <= 4 ? "Moderate" : "Strong" };
}

const initialForm: PasswordForm = {
  current_password: "",
  new_password: "",
  confirm_password: "",
};

export default function ChangePassword() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [form, setForm] = useState<PasswordForm>(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPasswords, setShowPasswords] = useState<
    Record<PasswordField, boolean>
  >({
    current_password: false,
    new_password: false,
    confirm_password: false,
  });

  const [capsLockOn, setCapsLockOn] = useState<PasswordField | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(field: PasswordField, value: string) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [field]: undefined,
    }));

    setError("");
  }

  function togglePassword(field: PasswordField) {
    setShowPasswords((previous) => ({
      ...previous,
      [field]: !previous[field],
    }));
  }

  function validateForm(): FormErrors {
    const newErrors: FormErrors = {};

    if (!form.current_password) {
      newErrors.current_password = "Current password is required.";
    }

    if (!form.new_password) {
      newErrors.new_password = "New password is required.";
    } else if (form.new_password.length < 8) {
      newErrors.new_password =
        "Password must be at least 8 characters.";
    } else if (form.new_password === form.current_password) {
      newErrors.new_password =
        "New password must be different from current password.";
    }

    if (!form.confirm_password) {
      newErrors.confirm_password =
        "Please confirm your new password.";
    } else if (form.new_password !== form.confirm_password) {
      newErrors.confirm_password = "Passwords do not match.";
    }

    return newErrors;
  }


  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    setError("");
    const validationErrors = validateForm();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setLoading(true);
    try {
      await changePassword(form);
      setForm({ ...initialForm });
      setErrors({});
      // A password change invalidates the existing session.
      logout();
      navigate("/login", {
        replace: true,
        state: { message: "Password changed successfully. Please log in again." },
      });
    } catch (err: unknown) {
      if (!axios.isAxiosError(err)) {
        setError("An unexpected error occurred. Please try again.");
        return;
      }

      const status = err.response?.status;
      const data: unknown = err.response?.data;
      if (status === 400 && data && typeof data === "object") {
        const payload = data as Record<string, unknown>;
        const serverErrors: FormErrors = {};
        const fields: PasswordField[] = ["current_password", "new_password", "confirm_password"];
        const messageOf = (value: unknown): string | undefined => {
          if (typeof value === "string") return value;
          if (Array.isArray(value)) {
            const messages = value.filter((item): item is string => typeof item === "string");
            return messages.length ? messages.join(" ") : undefined;
          }
          return undefined;
        };
        for (const field of fields) {
          const message = messageOf(payload[field]);
          if (message) serverErrors[field] = message;
        }
        setErrors(serverErrors);
        const generalMessage = messageOf(payload.non_field_errors) || messageOf(payload.detail);
        if (generalMessage || Object.keys(serverErrors).length === 0) {
          setError(generalMessage || "Unable to change password. Please check your details.");
        }
      } else if (status === 401 || status === 403) {
        setError("Your session has expired. Please log in again.");
      } else if (!err.response) {
        setError("Unable to connect to the server. Check your connection and try again.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }


  const strength = passwordStrength(form.new_password);
  const passwordsMatch = Boolean(form.confirm_password) && form.confirm_password === form.new_password;
  const passwordsDiffer = Boolean(form.confirm_password) && form.confirm_password !== form.new_password;

  const fields: {
    name: PasswordField;
    label: string;
    autoComplete: string;
  }[] = [
    {
      name: "current_password",
      label: "Current Password",
      autoComplete: "current-password",
    },
    {
      name: "new_password",
      label: "New Password",
      autoComplete: "new-password",
    },
    {
      name: "confirm_password",
      label: "Confirm New Password",
      autoComplete: "new-password",
    },
  ];

  return (
    <main className="change-password-page">
      <div className="change-password-intro">
        <Link className="change-password-back" to="/profile">← Back to Profile</Link>
        <p className="change-password-eyebrow">Account Settings</p>
        <h1>Account Security</h1>
        <p>Manage your password and keep your account protected.</p>
      </div>

      <div className="change-password-layout">
        <section className="change-password-card" aria-labelledby="change-password-heading">
          <header className="change-password-card-header">
            <span className="change-password-icon" aria-hidden="true">🔒</span>
            <div>
              <h2 id="change-password-heading">Change Password</h2>
              <p>Choose a strong password for your account.</p>
            </div>
          </header>

          <form onSubmit={handleSubmit} noValidate>
            {fields.map(({ name, label, autoComplete }) => (
              <div className="password-field" key={name}>
                <label htmlFor={name}>{label}</label>
                <div className="password-input-wrapper">
                  <input
                    id={name}
                    name={name}
                    type={showPasswords[name] ? "text" : "password"}
                    autoComplete={autoComplete}
                    value={form[name]}
                    onChange={(e) => handleChange(name, e.target.value)}
                    aria-invalid={Boolean(errors[name])}
                    aria-describedby={[
                      name === "new_password" ? "new-password-guidance" : null,
                      name === "confirm_password" && form.confirm_password ? "confirm-password-guidance" : null,
                      errors[name] ? `${name}-error` : null,
                    ].filter(Boolean).join(" ") || undefined}
                    disabled={loading}
                    onKeyDown={(e) => setCapsLockOn(e.getModifierState("CapsLock") ? name : null)}
                    onKeyUp={(e) => setCapsLockOn(e.getModifierState("CapsLock") ? name : null)}
                    onBlur={() => setCapsLockOn(null)}
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => togglePassword(name)}
                    disabled={loading}
                    aria-pressed={showPasswords[name]}
                    aria-label={showPasswords[name] ? `Hide ${label}` : `Show ${label}`}
                  >
                    <span className="password-visibility-icon" aria-hidden="true">
                      {showPasswords[name] ? "◉" : "◎"}
                    </span>
                    <span>{showPasswords[name] ? "Hide" : "Show"}</span>
                  </button>
                </div>
                {name === "new_password" && (
                  <div className="password-strength" id="new-password-guidance">
                    <div className="password-strength-heading">
                      <span>Password strength</span>
                      <span className={`password-strength-label strength-${strength.score}`}>
                        {strength.label}
                      </span>
                    </div>
                    <div className="password-strength-meter" aria-hidden="true">
                      {passwordChecks.map((check, index) => (
                        <span key={check.label} className={index < strength.score ? `filled strength-${strength.score}` : ""} />
                      ))}
                    </div>
                    <p className="password-guidance">For a stronger password, try:</p>
                    <ul className="password-requirements">
                      {passwordChecks.map((check) => {
                        const met = check.test(form.new_password);
                        return <li key={check.label} className={met ? "requirement-met" : ""}>
                          <span aria-hidden="true">{met ? "✓" : "○"}</span> {check.label}
                        </li>;
                      })}
                    </ul>
                    <p className="password-guidance">Strength suggestions are guidance; the server makes the final decision.</p>
                  </div>
                )}
                {name === "confirm_password" && form.confirm_password && (
                  <p id="confirm-password-guidance" className={`password-match-feedback ${passwordsMatch ? "match" : "mismatch"}`}>
                    {passwordsMatch ? "Passwords match." : passwordsDiffer ? "Passwords do not match yet." : ""}
                  </p>
                )}
                {capsLockOn === name && (
                  <p className="password-caps-warning" role="status">Caps Lock is on.</p>
                )}
                {errors[name] && (
                  <p className="field-error" id={`${name}-error`} role="alert">
                    {errors[name]}
                  </p>
                )}
              </div>
            ))}

            {error && <div className="change-password-alert change-password-alert-error" role="alert"><strong>Could not update password</strong><span>{error}</span></div>}
            {loading && <p className="change-password-progress" role="status">Updating your password securely…</p>}

            <div className="change-password-actions">
              <Link className={`change-password-cancel${loading ? " is-disabled" : ""}`} to="/profile" aria-disabled={loading} onClick={(event) => { if (loading) event.preventDefault(); }}>Cancel</Link>
              <button className="change-password-submit" type="submit" disabled={loading}>
                {loading && <span className="change-password-spinner" aria-hidden="true" />}
                {loading ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        </section>

        <aside className="change-password-security" aria-label="Password security tips">
          <span className="change-password-security-icon" aria-hidden="true">🛡️</span>
          <h2>Keep your account secure</h2>
          <p>A unique password helps protect your Neighborhood Rewards account.</p>
          <ul>
            <li>Use at least 8 characters.</li>
            <li>Avoid passwords you use elsewhere.</li>
            <li>Never share your password.</li>
          </ul>
          <p className="change-password-security-note">After updating your password, you’ll need to sign in again.</p>
        </aside>
      </div>
    </main>
  );
}
