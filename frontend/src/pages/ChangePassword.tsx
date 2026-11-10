
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

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
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
    setSuccess("");
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
  setSuccess("");

  const validationErrors = validateForm();
  setErrors(validationErrors);

  if (Object.keys(validationErrors).length > 0) {
    return;
  }

  setLoading(true);

  try {
    const response = await changePassword(form);

    setForm({ ...initialForm });
    setErrors({});
    setSuccess(response.message);

    // Clear locally stored JWTs and authentication state.
    logout();

    // User must log in again with their new password.
    navigate("/login", {
      replace: true,
      state: {
        message:
          "Password changed successfully. Please log in again.",
      },
    });
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      const data = err.response?.data;

      if (status === 400 && data) {
        const fields: PasswordField[] = [
          "current_password",
          "new_password",
          "confirm_password",
        ];

        const serverErrors: FormErrors = {};

        for (const field of fields) {
          const messages = data[field];

          if (Array.isArray(messages)) {
            serverErrors[field] = messages.join(" ");
          } else if (typeof messages === "string") {
            serverErrors[field] = messages;
          }
        }

        setErrors(serverErrors);

        if (Object.keys(serverErrors).length === 0) {
          setError(
            data.non_field_errors?.join?.(" ") ||
              "Unable to change password."
          );
        }
      } else if (status === 401) {
        setError(
          "Your session has expired. Please log in again."
        );
      } else {
        setError(
          "Something went wrong. Please try again."
        );
      }
    } else {
      setError("An unexpected error occurred.");
    }
  } finally {
    setLoading(false);
  }
}


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
      <div className="change-password-card">
        <h1>Change Password</h1>

        <p>Update your account password securely.</p>

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
                  onChange={(e) =>
                    handleChange(name, e.target.value)
                  }
                  aria-invalid={Boolean(errors[name])}
                  aria-describedby={
                    errors[name] ? `${name}-error` : undefined
                  }
                  disabled={loading}
                />

                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => togglePassword(name)}
                  aria-label={
                    showPasswords[name]
                      ? `Hide ${label}`
                      : `Show ${label}`
                  }
                >
                  {showPasswords[name] ? "Hide" : "Show"}
                </button>
              </div>

              {errors[name] && (
                <p
                  className="field-error"
                  id={`${name}-error`}
                  role="alert"
                >
                  {errors[name]}
                </p>
              )}
            </div>
          ))}

          {error && <p role="alert">{error}</p>}
          {success && <p role="status">{success}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>

        <Link to="/profile">Back to Profile</Link>
      </div>
    </main>
  );
}
