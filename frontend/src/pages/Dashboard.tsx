
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import StatusMessage from "../components/ui/StatusMessage";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user?.username ?? "Neighbor"}!`}
        description="Here's what's happening in your neighborhood."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
          gap: "20px",
        }}
      >
        <Card title="Community">
          <p>Connect with your neighbors.</p>
          <Button onClick={() => navigate("/community")}>
            Explore Community
          </Button>
        </Card>

        <Card title="Rewards">
          <p>Track your points and achievements.</p>
          <Button
            variant="secondary"
            onClick={() => navigate("/rewards")}
          >
            View Rewards
          </Button>
        </Card>

        <Card title="My Profile">
          <p>Manage your account information.</p>
          <Button
            variant="outline"
            onClick={() => navigate("/profile")}
          >
            View Profile
          </Button>
        </Card>
      </div>

      <div style={{ marginTop: "24px" }}>
        <StatusMessage variant="info">
          Welcome to your new Nextdoor Rewards dashboard!
        </StatusMessage>
      </div>
    </>
  );
}