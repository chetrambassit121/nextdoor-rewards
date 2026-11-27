import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import { getPublicUserProfile, getPublicUserRewards } from "../services/users";
import type { PublicUserProfile as Profile, PublicUserRewards } from "../types/users";
import "./RewardsDashboard.css";
import "./PublicUserProfile.css";

export default function PublicUserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const id = Number(userId);
  const validId = Number.isSafeInteger(id) && id > 0;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rewards, setRewards] = useState<PublicUserRewards | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [reload, setReload] = useState(0);

  const retry = useCallback(() => setReload((value) => value + 1), []);

  useEffect(() => {
    if (!validId) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    let active = true;
    setLoading(true);
    setError("");
    setNotFound(false);
    setProfile(null);
    setRewards(null);

    Promise.all([getPublicUserProfile(id), getPublicUserRewards(id)])
      .then(([user, data]) => {
        if (!active) return;
        setProfile(user);
        setRewards(data);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        if (axios.isAxiosError(reason) && reason.response?.status === 404) {
          setNotFound(true);
        } else {
          setError("Unable to load this member's profile. Please try again.");
        }
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [id, validId, reload]);

  if (loading) return <main className="rewards-dashboard"><div className="rewards-state" role="status">Loading member profile...</div></main>;
  if (notFound) return <main className="rewards-dashboard"><div className="rewards-state"><h1>Member not found</h1><Link to="/community">Back to Community</Link></div></main>;
  if (error || !profile || !rewards) return <main className="rewards-dashboard"><div className="rewards-state"><p role="alert">{error || "Unable to load profile."}</p><button className="rewards-button" onClick={retry}>Retry</button></div></main>;

  return (
    <main className="rewards-dashboard public-profile">
      <header className="rewards-header">
        <div><Link className="public-back" to="/community">← Community</Link><h1>{profile.username}</h1><p>Member since {new Date(profile.date_joined).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</p></div>
        <span className="public-readonly">Community profile</span>
      </header>

      <section className="public-stats" aria-label="Community statistics">
        {[
          { label: "Total points", value: rewards.total_points },
          { label: "Achievements", value: rewards.achievements_count },
          { label: "Posts", value: profile.stats.posts },
          { label: "Comments", value: profile.stats.comments },
          { label: "Likes received", value: profile.stats.likes_received },
        ].map((stat) => <div className="public-stat" key={stat.label}><span>{stat.label}</span><strong>{stat.value.toLocaleString()}</strong></div>)}
      </section>

      <section className="rewards-section" aria-labelledby="public-achievements-heading">
        <div className="rewards-section-heading"><h2 id="public-achievements-heading">Unlocked Achievements</h2></div>
        {rewards.achievements.length === 0 ? <p className="rewards-empty">No achievements earned yet.</p> : (
          <ul className="achievement-grid">
            {rewards.achievements.map((achievement) => <li className="achievement-card" key={achievement.id}>
              <div className="achievement-icon" aria-hidden="true">🏆</div>
              <strong>{achievement.milestone.name}</strong>
              <p>{achievement.milestone.description}</p>
              <span className="achievement-points">+{achievement.milestone.bonus_points} points</span>
              <small>Earned: {new Date(achievement.achieved_at).toLocaleDateString()}</small>
            </li>)}
          </ul>
        )}
      </section>

      <section className="rewards-section" aria-labelledby="public-milestones-heading">
        <div className="rewards-section-heading"><h2 id="public-milestones-heading">Milestone Progress</h2></div>
        {rewards.milestones.length === 0 ? <p className="rewards-empty">No milestones available.</p> : (
          <ul className="milestone-list">
            {rewards.milestones.map((milestone) => {
              const progress = Math.min(100, Math.max(0, milestone.current_progress / Math.max(milestone.required_count, 1) * 100));
              return <li className="milestone-card" key={milestone.id}>
                <div className="milestone-heading"><div><h3>{milestone.name}</h3><p>{milestone.description}</p></div><span className={milestone.is_unlocked ? "milestone-status unlocked" : "milestone-status"}>{milestone.is_unlocked ? "Unlocked" : `Reward: +${milestone.bonus_points} points`}</span></div>
                <progress value={progress} max={100} aria-label={`${milestone.name} progress`} />
                <div className="milestone-footer"><span>{milestone.current_progress} / {milestone.required_count}</span><span>{Math.round(progress)}% complete</span></div>
              </li>;
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
