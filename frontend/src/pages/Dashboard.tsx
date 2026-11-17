import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <main>
      <h1>Welcome back, {user?.username}!</h1>

      <p>
        Here's what's happening in your neighborhood.
      </p>

      <section style={{ marginTop: "32px" }}>
        <h2>Quick Access</h2>

        <div style={{
          display: "flex",
          gap: "16px",
          marginTop: "16px",
          flexWrap: "wrap"
        }}>
          <Link to="/community">
            Explore Community
          </Link>

          <Link to="/rewards">
            View My Rewards
          </Link>

          <Link to="/profile">
            My Profile
          </Link>
        </div>
      </section>
    </main>
  );
}
