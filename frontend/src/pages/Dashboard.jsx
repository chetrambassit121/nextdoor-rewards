import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div>
      <h1>Nextdoor Rewards Dashboard</h1>

      <h2>Welcome, {user?.username}!</h2>
      <p>Email: {user?.email}</p>

      <button onClick={handleLogout}>
        Logout
      </button>
    </div>
  );
}