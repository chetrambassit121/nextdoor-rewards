
import {api} from "./api";

import type {
  RewardProfile,
  RewardTransaction,
  RewardMilestone,
  RewardAchievement,
} from "../types/rewards";

export async function getRewardProfile(): Promise<RewardProfile> {
  const response = await api.get<RewardProfile>("/rewards/me/");
  return response.data;
}

export async function getRewardTransactions(): Promise<RewardTransaction[]> {
  const response = await api.get<RewardTransaction[]>(
    "/rewards/transactions/"
  );
  return response.data;
}

export async function getRewardMilestones(): Promise<RewardMilestone[]> {
  const response = await api.get<RewardMilestone[]>(
    "/rewards/milestones/"
  );
  return response.data;
}

export async function getRewardAchievements(): Promise<RewardAchievement[]> {
  const response = await api.get<RewardAchievement[]>(
    "/rewards/achievements/"
  );
  return response.data;
}
