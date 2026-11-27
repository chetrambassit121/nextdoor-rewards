
export interface RewardProfile {
  total_points: number;
  available_points: number;
  updated_at: string;
}

export interface RewardTransaction {
  id: number;
  activity_type: string;
  activity_display: string;
  points: number;
  reference_id: number | null;
  created_at: string;
}

export interface RewardMilestone {
  id: number;
  name: string;
  description: string;
  milestone_type: string;
  required_count: number;
  bonus_points: number;
  current_progress: number;
  is_unlocked: boolean;
}

export interface RewardAchievement {
  id: number;
  milestone: {
    id: number;
    name: string;
    description: string;
    milestone_type: string;
    required_count: number;
    bonus_points: number;
  };
  achieved_at: string;
}
