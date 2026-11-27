import type { RewardAchievement, RewardMilestone } from "./rewards";

export interface PublicUserProfile {
  id: number;
  username: string;
  date_joined: string;
  stats: { posts: number; comments: number; likes_received: number };
  total_points: number;
  achievements_count: number;
}

export interface PublicUserRewards {
  user_id: number;
  username: string;
  total_points: number;
  achievements_count: number;
  achievements: RewardAchievement[];
  milestones: RewardMilestone[];
}
