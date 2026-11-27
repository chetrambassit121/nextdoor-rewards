import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import StatusMessage from "../components/ui/StatusMessage";

import {
  getRewardProfile,
  getRewardTransactions,
  getRewardMilestones,
  getRewardAchievements,
} from "../services/rewards";

import {
  getPosts,
  type CommunityPost,
} from "../services/community";

import type {
  RewardProfile,
  RewardTransaction,
  RewardMilestone,
  RewardAchievement,
} from "../types/rewards";

import "./Dashboard.css";

interface DashboardData {
  profile: RewardProfile;
  transactions: RewardTransaction[];
  milestones: RewardMilestone[];
  achievements: RewardAchievement[];
  posts: CommunityPost[];
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString();
}

export default function Dashboard() {
  const { user } = useAuth();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [
        profile,
        transactions,
        milestones,
        achievements,
        posts,
      ] = await Promise.all([
        getRewardProfile(),
        getRewardTransactions(),
        getRewardMilestones(),
        getRewardAchievements(),
        getPosts(),
      ]);

      setData({
        profile,
        transactions: Array.isArray(transactions) ? transactions : [],
        milestones: Array.isArray(milestones) ? milestones : [],
        achievements: Array.isArray(achievements) ? achievements : [],
        posts: Array.isArray(posts) ? posts : [],
      });
    } catch {
      setError(
        "Unable to load your dashboard. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  return (
    <div className="dashboard">
      <PageHeader
        title={`Welcome back, ${user?.username ?? "Neighbor"}!`}
        description="Here's what's happening in your neighborhood."
        action={
          <Button
            variant="outline"
            disabled={loading}
            onClick={() => void loadDashboard()}
          >
            Refresh Dashboard
          </Button>
        }
      />

      {loading && !data && (
        <StatusMessage variant="info">
          Loading your dashboard...
        </StatusMessage>
      )}

      {error && (
        <div className="dashboard-error">
          <StatusMessage variant="error">
            {error}
          </StatusMessage>

          <Button onClick={() => void loadDashboard()}>
            Retry
          </Button>
        </div>
      )}

      {data && (
        <>
          <section
            className="dashboard-stats"
            aria-label="Dashboard statistics"
          >
            <Card>
              <p className="dashboard-stat-label">
                Total Points
              </p>
              <strong className="dashboard-stat-value">
                {data.profile.total_points}
              </strong>
              <span className="dashboard-stat-detail">
                Net points earned
              </span>
            </Card>

            <Card>
              <p className="dashboard-stat-label">
                Available Points
              </p>
              <strong className="dashboard-stat-value">
                {data.profile.available_points}
              </strong>
              <span className="dashboard-stat-detail">
                Current balance
              </span>
            </Card>

            <Card>
              <p className="dashboard-stat-label">
                Achievements
              </p>
              <strong className="dashboard-stat-value">
                {data.achievements.length}
              </strong>
              <span className="dashboard-stat-detail">
                Milestones unlocked
              </span>
            </Card>

            <Card>
              <p className="dashboard-stat-label">
                Recent Posts
              </p>
              <strong className="dashboard-stat-value">
                {data.posts.length}
              </strong>
              <span className="dashboard-stat-detail">
                Posts loaded from the feed
              </span>
            </Card>
          </section>

          <div className="dashboard-main-grid">
            <Card title="Milestone Progress">
              {data.milestones.length === 0 ? (
                <StatusMessage variant="empty">
                  No milestones available yet.
                </StatusMessage>
              ) : (
                <div className="dashboard-milestones">
                  {data.milestones
                    .filter((item) => !item.is_unlocked)
                    .slice(0, 3)
                    .map((milestone) => {
                      const progress = Math.min(
                        100,
                        Math.max(
                          0,
                          (milestone.current_progress /
                            Math.max(
                              milestone.required_count,
                              1
                            )) * 100
                        )
                      );

                      return (
                        <div
                          key={milestone.id}
                          className="dashboard-milestone"
                        >
                          <div className="dashboard-milestone-heading">
                            <strong>{milestone.name}</strong>
                            <span>
                              {milestone.current_progress} /{" "}
                              {milestone.required_count}
                            </span>
                          </div>

                          <progress
                            value={progress}
                            max={100}
                            aria-label={`${milestone.name} progress`}
                          />

                          <small>
                            {Math.round(progress)}% complete
                            {" · "}
                            +{milestone.bonus_points} pts
                          </small>
                        </div>
                      );
                    })}

                  {data.milestones.every(
                    (item) => item.is_unlocked
                  ) && (
                    <StatusMessage variant="success">
                      All available milestones unlocked!
                    </StatusMessage>
                  )}
                </div>
              )}

              <Link
                className="dashboard-text-link"
                to="/rewards"
              >
                View all milestones
              </Link>
            </Card>

            <Card title="Quick Actions">
              <div className="dashboard-actions">
                <Link to="/community">
                  Explore Community
                </Link>

                <Link to="/rewards">
                  View My Rewards
                </Link>

                <Link to="/profile">
                  Edit My Profile
                </Link>
              </div>
            </Card>

            <Card title="Recent Reward Activity">
              {data.transactions.length === 0 ? (
                <StatusMessage variant="empty">
                  No reward activity yet.
                </StatusMessage>
              ) : (
                <ul className="dashboard-activity-list">
                  {[...data.transactions]
                    .sort(
                      (a, b) =>
                        new Date(b.created_at).getTime() -
                        new Date(a.created_at).getTime()
                    )
                    .slice(0, 5)
                    .map((transaction: RewardTransaction) => (
                      <li key={transaction.id}>
                        <div>
                          <strong>
                            {transaction.activity_display}
                          </strong>
                          <small>
                            {formatDate(
                              transaction.created_at
                            )}
                          </small>
                        </div>

                        <span
                          className={
                            transaction.points >= 0
                              ? "dashboard-points-positive"
                              : "dashboard-points-negative"
                          }
                        >
                          {transaction.points > 0 ? "+" : ""}
                          {transaction.points} pts
                        </span>
                      </li>
                    ))}
                </ul>
              )}

              <Link
                className="dashboard-text-link"
                to="/rewards"
              >
                View all rewards
              </Link>
            </Card>

            <Card title="Community Feed">
              {data.posts.length === 0 ? (
                <StatusMessage variant="empty">
                  No community posts yet.
                </StatusMessage>
              ) : (
                <ul className="dashboard-post-list">
                  {data.posts.slice(0, 3).map((post) => (
                    <li key={post.id}>
                      <strong>{post.author}</strong>
                      <p>{post.content}</p>
                      <small>
                        {post.likes_count} likes
                        {" · "}
                        {post.comments_count} comments
                      </small>
                    </li>
                  ))}
                </ul>
              )}

              <Link
                className="dashboard-text-link"
                to="/community"
              >
                Open community feed
              </Link>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
