import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

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
      <Link to="/community">
        Go to Community Feed
      </Link>
      <Link to="/rewards">View My Rewards</Link>
      <p>Email: {user?.email}</p>

      <button onClick={handleLogout}>
        Logout
      </button>
    </div>
  );
}