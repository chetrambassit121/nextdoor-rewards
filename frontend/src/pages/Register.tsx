
import { useState, type FormEvent } from "react";
import { registerUser } from "../services/auth";

function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("");

    try {
      await registerUser({
        username,
        email,
        password,
      });

      setMessage("Registration successful!");
    } catch (error) {
      setMessage("Registration failed. Check your information.");
      console.error(error);
    }
  };

  return (
    <div>
      <h2>Create Account</h2>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit">Register</button>
      </form>

      <p>{message}</p>
    </div>
  );
}

export default Register;
