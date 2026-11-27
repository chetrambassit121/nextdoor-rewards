
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./GuestBanner.css";

export default function GuestBanner() {
  const { isGuest, logout } = useAuth();
  const navigate = useNavigate();

  if (!isGuest) return null;

  function handleRegister() {
    logout();
    navigate("/register", { replace: true });
  }

  return (
    <aside
      className="guest-banner"
      aria-label="Guest mode"
    >
      <div className="guest-banner__content">
        <span className="guest-banner__badge">
          Guest Mode
        </span>

        <h2>You're browsing as a guest</h2>

        <p>
          Explore Neighborhood Rewards in read-only mode.
          Create an account to post, comment, like posts,
          and earn rewards.
        </p>
      </div>

      <button
        type="button"
        className="guest-banner__button"
        onClick={handleRegister}
      >
        Create an account
      </button>
    </aside>
  );
}
