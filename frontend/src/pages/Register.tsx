
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

import { registerUser } from "../services/auth";
import AuthLayout from "../components/auth/AuthLayout";

type FieldErrors = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
};

const emptyErrors: FieldErrors = {
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export default function Register() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] =
    useState<FieldErrors>({ ...emptyErrors });

  const clearFieldError = (field: keyof FieldErrors) => {
    setFieldErrors((prev) => ({
      ...prev,
      [field]: "",
    }));
    setError("");
  };

  const validateForm = () => {
    const errors = { ...emptyErrors };

    if (!username.trim()) {
      errors.username = "Username is required.";
    } else if (username.trim().length < 3) {
      errors.username = "Username must be at least 3 characters.";
    }

    if (!email.trim()) {
      errors.email = "Email is required.";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      errors.email = "Enter a valid email address.";
    }

    if (!password) {
      errors.password = "Password is required.";
    } else if (password.length < 8) {
      errors.password = "Password must be at least 8 characters.";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Please confirm your password.";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }

    setFieldErrors(errors);

    return Object.values(errors).every((value) => !value);
  };

  const handleSubmit = async (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (isSubmitting) return;

    setError("");

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Preserve your existing authentication service
      await registerUser({
        username: username.trim(),
        email: email.trim(),
        password,
      });

      navigate("/login", {
        replace: true,
        state: {
          message:
            "Account created successfully! You can now sign in.",
        },
      });
    } catch (err) {
      console.error("Registration failed:", err);

      if (axios.isAxiosError(err) && err.response?.data) {
        const data = err.response.data as Record<
          string,
          unknown
        >;

        const getMessage = (key: string): string => {
          const value = data[key];

          if (Array.isArray(value)) {
            return value.map(String).join(" ");
          }

          return typeof value === "string" ? value : "";
        };

        setFieldErrors({
          username: getMessage("username"),
          email: getMessage("email"),
          password: getMessage("password"),
          confirmPassword: "",
        });

        setError(
          getMessage("detail") ||
            getMessage("non_field_errors") ||
            "Registration failed. Please review your information."
        );
      } else {
        setError(
          "Unable to create your account. Please try again."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Join your neighborhood"
      subtitle="Create an account, connect with neighbors, and start earning rewards."
    >
      <form
        className="auth-form"
        onSubmit={handleSubmit}
        noValidate
      >
        {/* Username */}

        <div className="auth-form__field">
          <label htmlFor="register-username">
            Username
          </label>

          <input
            id="register-username"
            name="username"
            type="text"
            autoComplete="username"
            placeholder="Choose a username"
            value={username}
            disabled={isSubmitting}
            aria-invalid={Boolean(fieldErrors.username)}
            aria-describedby={
              fieldErrors.username
                ? "register-username-error"
                : undefined
            }
            onChange={(e) => {
              setUsername(e.target.value);
              clearFieldError("username");
            }}
          />

          {fieldErrors.username && (
            <span
              id="register-username-error"
              className="auth-form__field-error"
              role="alert"
            >
              {fieldErrors.username}
            </span>
          )}
        </div>

        {/* Email */}

        <div className="auth-form__field">
          <label htmlFor="register-email">
            Email address
          </label>

          <input
            id="register-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            disabled={isSubmitting}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={
              fieldErrors.email
                ? "register-email-error"
                : undefined
            }
            onChange={(e) => {
              setEmail(e.target.value);
              clearFieldError("email");
            }}
          />

          {fieldErrors.email && (
            <span
              id="register-email-error"
              className="auth-form__field-error"
              role="alert"
            >
              {fieldErrors.email}
            </span>
          )}
        </div>

        {/* Password */}

        <div className="auth-form__field">
          <label htmlFor="register-password">
            Password
          </label>

          <div className="auth-form__password-wrapper">
            <input
              id="register-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Create a password"
              value={password}
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={
                fieldErrors.password
                  ? "register-password-error"
                  : "register-password-hint"
              }
              onChange={(e) => {
                setPassword(e.target.value);
                clearFieldError("password");
              }}
            />

            <button
              type="button"
              className="auth-form__password-toggle"
              onClick={() => setShowPassword((prev) => !prev)}
              disabled={isSubmitting}
              aria-label={
                showPassword ? "Hide password" : "Show password"
              }
              aria-pressed={showPassword}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <span
            id="register-password-hint"
            className="auth-form__hint"
          >
            Use at least 8 characters.
          </span>

          {fieldErrors.password && (
            <span
              id="register-password-error"
              className="auth-form__field-error"
              role="alert"
            >
              {fieldErrors.password}
            </span>
          )}
        </div>

        {/* Confirm Password */}

        <div className="auth-form__field">
          <label htmlFor="register-confirm-password">
            Confirm password
          </label>

          <div className="auth-form__password-wrapper">
            <input
              id="register-confirm-password"
              name="confirmPassword"
              type={
                showConfirmPassword ? "text" : "password"
              }
              autoComplete="new-password"
              placeholder="Confirm your password"
              value={confirmPassword}
              disabled={isSubmitting}
              aria-invalid={Boolean(
                fieldErrors.confirmPassword
              )}
              aria-describedby={
                fieldErrors.confirmPassword
                  ? "register-confirm-password-error"
                  : undefined
              }
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                clearFieldError("confirmPassword");
              }}
            />

            <button
              type="button"
              className="auth-form__password-toggle"
              onClick={() =>
                setShowConfirmPassword((prev) => !prev)
              }
              disabled={isSubmitting}
              aria-label={
                showConfirmPassword
                  ? "Hide confirm password"
                  : "Show confirm password"
              }
              aria-pressed={showConfirmPassword}
            >
              {showConfirmPassword ? "Hide" : "Show"}
            </button>
          </div>

          {fieldErrors.confirmPassword && (
            <span
              id="register-confirm-password-error"
              className="auth-form__field-error"
              role="alert"
            >
              {fieldErrors.confirmPassword}
            </span>
          )}
        </div>

        {/* API Error */}

        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}

      
          {/* Submit Button */}

          <button
            type="submit"
            className="auth-form__submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            aria-label={
              isSubmitting
                ? "Creating account, please wait"
                : "Create account"
            }
          >
            {isSubmitting ? (
              <span className="auth-form__loading">
                <span
                  className="auth-form__spinner"
                  aria-hidden="true"
                />
                Creating account, please wait...
              </span>
            ) : (
              "Create account"
            )}
          </button>

      </form>

      <p className="auth-form__switch">
        Already have an account?{" "}
        <Link to="/login">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
