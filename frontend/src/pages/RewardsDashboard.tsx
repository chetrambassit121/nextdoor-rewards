
import { useCallback, useEffect, useState } from "react";

import {
  getRewardProfile,
  getRewardTransactions,
  getRewardMilestones,
  getRewardAchievements,
} from "../services/rewards";

import type {
  RewardProfile,
  RewardTransaction,
  RewardMilestone,
  RewardAchievement,
} from "../types/rewards";

import "./RewardsDashboard.css";

export default function RewardsDashboard() {
  const [profile, setProfile] = useState<RewardProfile | null>(null);
  const [transactions, setTransactions] = useState<RewardTransaction[]>([]);
  const [milestones, setMilestones] = useState<RewardMilestone[]>([]);
  const [achievements, setAchievements] = useState<RewardAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRewards = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [
        profileData,
        transactionData,
        milestoneData,
        achievementData,
      ] = await Promise.all([
        getRewardProfile(),
        getRewardTransactions(),
        getRewardMilestones(),
        getRewardAchievements(),
      ]);

      setProfile(profileData);
      setTransactions(transactionData);
      setMilestones(milestoneData);
      setAchievements(achievementData);
    } catch {
      setError("Unable to load rewards. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRewards();
  }, [loadRewards]);

  if (loading) {
    return (
      <main className="rewards-dashboard">
        <div className="rewards-state" role="status">
          <div className="rewards-spinner" aria-hidden="true" />
          <p>Loading rewards...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="rewards-dashboard">
        <div className="rewards-state">
          <p role="alert">{error}</p>
          <button
            className="rewards-button"
            onClick={() => void loadRewards()}
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="rewards-dashboard">
      <header className="rewards-header">
        <div>
          <h1>My Rewards</h1>
          <p>Your neighborhood contributions and achievements.</p>
        </div>
        <button
          className="rewards-button"
          onClick={() => void loadRewards()}
        >
          Refresh Rewards
        </button>
      </header>

      <section className="rewards-summary" aria-label="Reward Points">
        <div className="rewards-summary-card total">
          <span className="summary-icon" aria-hidden="true">★</span>
          <p>Total points earned</p>
          <strong>{profile?.total_points ?? 0}</strong>
          <span>Lifetime points</span>
          <p>Total: {profile?.total_points ?? 0}</p>
        </div>

        <div className="rewards-summary-card available">
          <span className="summary-icon" aria-hidden="true">◆</span>
          <p>Available points</p>
          <strong>{profile?.available_points ?? 0}</strong>
          <span>Current balance</span>
          <p>Available: {profile?.available_points ?? 0}</p>
        </div>
      </section>

      <section className="rewards-section">
        <div className="rewards-section-heading">
          <h2>Earned Achievements</h2>
          <span className="rewards-count">
            {achievements.length} unlocked
          </span>
        </div>

        {achievements.length === 0 ? (
          <p className="rewards-empty">
            No achievements earned yet.
          </p>
        ) : (
          <ul className="achievement-grid">
            {achievements.map((achievement) => (
              <li className="achievement-card" key={achievement.id}>
                <div className="achievement-icon" aria-hidden="true">
                  🏆
                </div>
                <strong>{achievement.milestone.name}</strong>
                <p>{achievement.milestone.description}</p>
                <span className="achievement-points">
                  +{achievement.milestone.bonus_points} points
                </span>
                <small>
                  Earned:{" "}
                  {new Date(
                    achievement.achieved_at
                  ).toLocaleDateString()}
                </small>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rewards-section">
        <div className="rewards-section-heading">
          <h2>Milestone Progress</h2>
        </div>

        {milestones.length === 0 ? (
          <p className="rewards-empty">
            No milestones available.
          </p>
        ) : (
          <ul className="milestone-list">
            {milestones.map((milestone) => {
              const progress = Math.min(
                100,
                Math.max(
                  0,
                  (milestone.current_progress /
                    Math.max(milestone.required_count, 1)) * 100
                )
              );

              return (
                <li className="milestone-card" key={milestone.id}>
                  <div className="milestone-heading">
                    <div>
                      <h3>{milestone.name}</h3>
                      <p>{milestone.description}</p>
                    </div>
                    <span
                      className={
                        milestone.is_unlocked
                          ? "milestone-status unlocked"
                          : "milestone-status"
                      }
                    >
                      {milestone.is_unlocked
                        ? "Unlocked"
                        : `Reward: +${milestone.bonus_points} points`}
                    </span>
                  </div>

                  <progress value={progress} max={100} />

                  <div className="milestone-footer">
                    <span>
                      {milestone.current_progress} /{" "}
                      {milestone.required_count}
                    </span>
                    <span>{Math.round(progress)}% complete</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rewards-section">
        <div className="rewards-section-heading">
          <h2>Recent Reward Activity</h2>
        </div>

        {transactions.length === 0 ? (
          <p className="rewards-empty">
            No reward activity yet.
          </p>
        ) : (
          <ul className="transaction-list">
            {transactions.slice(0, 10).map((transaction) => (
              <li className="transaction-item" key={transaction.id}>
                <div className="transaction-icon" aria-hidden="true">
                  {transaction.points >= 0 ? "+" : "−"}
                </div>

                <div className="transaction-details">
                  <span>{transaction.activity_display}</span>
                  <small>
                    {new Date(
                      transaction.created_at
                    ).toLocaleDateString()}
                  </small>
                </div>

                <strong
                  className={
                    transaction.points >= 0
                      ? "transaction-points positive"
                      : "transaction-points negative"
                  }
                >
                  {transaction.points > 0 ? "+" : ""}
                  {transaction.points} pts
                </strong>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
