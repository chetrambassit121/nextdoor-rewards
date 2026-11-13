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
    return <main><p>Loading rewards...</p></main>;
  }

  if (error) {
    return (
      <main>
        <p role="alert">{error}</p>
        <button onClick={() => void loadRewards()}>
          Retry
        </button>
      </main>
    );
  }

  return (
    <main className="rewards-dashboard">
      <h1>My Rewards</h1>
      <p>Your neighborhood contributions and achievements.</p>

      <section>
        <h2>Reward Points</h2>
        <p>Total: {profile?.total_points ?? 0}</p>
        <p>Available: {profile?.available_points ?? 0}</p>
      </section>

      <section>
        <h2>Earned Achievements</h2>

        {achievements.length === 0 ? (
          <p>No achievements earned yet.</p>
        ) : (
          <ul>
            {achievements.map((achievement) => (
              <li key={achievement.id}>
                <strong>{achievement.milestone.name}</strong>
                <p>{achievement.milestone.description}</p>
                <p>
                  +{achievement.milestone.bonus_points} points
                </p>
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

      <section>
        <h2>Milestone Progress</h2>

        {milestones.length === 0 ? (
          <p>No milestones available.</p>
        ) : (
          <ul>
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
                <li key={milestone.id}>
                  <h3>{milestone.name}</h3>
                  <p>{milestone.description}</p>

                  <progress value={progress} max={100} />

                  <p>
                    {milestone.current_progress} /{" "}
                    {milestone.required_count}
                  </p>

                  <p>
                    {milestone.is_unlocked
                      ? "Unlocked"
                      : `Reward: +${milestone.bonus_points} points`}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2>Recent Reward Activity</h2>

        {transactions.length === 0 ? (
          <p>No reward activity yet.</p>
        ) : (
          <ul>
            {transactions.slice(0, 10).map((transaction) => (
              <li key={transaction.id}>
                <span>{transaction.activity_display}</span>{" "}
                <strong>
                  {transaction.points > 0 ? "+" : ""}
                  {transaction.points} pts
                </strong>
                <p>
                  {new Date(
                    transaction.created_at
                  ).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <button onClick={() => void loadRewards()}>
        Refresh Rewards
      </button>
    </main>
  );
}
