
import { useState, type SubmitEvent } from "react";
import {
  useNavigate,
  useLocation,
} from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const location = useLocation();

  const successMessage = (
    location.state as { message?: string } | null
  )?.message;

  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    setError("");

    try {
      // AuthContext handles the API request and tokens
      await login(username, password);

      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error("Login failed:", err);
      setError("Login failed. Please check your credentials.");
    }
  };

  return (
    <div>
      <h1>Login</h1>
      {successMessage && (
        <p role="status" style={{ color: "green" }}>
          {successMessage}
        </p>
      )}
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit">Login</button>
      </form>

      {error && <p>{error}</p>}
    </div>
  );
}
