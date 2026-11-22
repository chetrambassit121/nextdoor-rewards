import { useState, type FormEvent } from "react";
import {
  Link,
  useNavigate,
  useLocation,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/auth/AuthLayout";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const successMessage = (
    location.state as { message?: string } | null
  )?.message;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [fieldErrors, setFieldErrors] = useState({
    username: "",
    password: "",
  });

  const validateForm = () => {
    const errors = {
      username: "",
      password: "",
    };

    if (!username.trim()) {
      errors.username = "Username is required.";
    }

    if (!password) {
      errors.password = "Password is required.";
    }

    setFieldErrors(errors);

    return !errors.username && !errors.password;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isSubmitting) return;

    setError("");

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      await login(username.trim(), password);

      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error("Login failed:", err);

      setError(
        "Unable to sign in. Please check your username and password."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your account and reconnect with your neighborhood."
    >
      {successMessage && (
        <div className="auth-success" role="status">
          {successMessage}
        </div>
      )}

      <form
        className="auth-form"
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="auth-form__field">
          <label htmlFor="login-username">
            Username
          </label>

          <input
            id="login-username"
            name="username"
            type="text"
            placeholder="Enter your username"
            autoComplete="username"
            autoFocus
            value={username}
            disabled={isSubmitting}
            aria-invalid={Boolean(fieldErrors.username)}
            aria-describedby={
              fieldErrors.username
                ? "login-username-error"
                : undefined
            }
            onChange={(e) => {
              setUsername(e.target.value);
              setFieldErrors((prev) => ({
                ...prev,
                username: "",
              }));
              setError("");
            }}
          />

          {fieldErrors.username && (
            <span
              id="login-username-error"
              className="auth-form__field-error"
              role="alert"
            >
              {fieldErrors.username}
            </span>
          )}
        </div>

        <div className="auth-form__field">
          <label htmlFor="login-password">
            Password
          </label>

          <div className="auth-form__password-wrapper">
            <input
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              autoComplete="current-password"
              value={password}
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={
                fieldErrors.password
                  ? "login-password-error"
                  : undefined
              }
              onChange={(e) => {
                setPassword(e.target.value);
                setFieldErrors((prev) => ({
                  ...prev,
                  password: "",
                }));
                setError("");
              }}
            />

            <button
              type="button"
              className="auth-form__password-toggle"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={
                showPassword ? "Hide password" : "Show password"
              }
              aria-pressed={showPassword}
              disabled={isSubmitting}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          {fieldErrors.password && (
            <span
              id="login-password-error"
              className="auth-form__field-error"
              role="alert"
            >
              {fieldErrors.password}
            </span>
          )}
        </div>

        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}

        <button
          className="auth-form__submit"
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? (
            <span className="auth-form__loading">
              <span
                className="auth-form__spinner"
                aria-hidden="true"
              />
              Signing in...
            </span>
          ) : (
            "Sign in"
          )}
        </button>
      </form>

      <p className="auth-form__switch">
        New to Nextdoor Rewards?{" "}
        <Link to="/register">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}
