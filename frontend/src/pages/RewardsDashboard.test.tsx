import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react";

import RewardsDashboard from "./RewardsDashboard";
import * as rewardsApi from "../services/rewards";

import type {
  RewardProfile,
  RewardTransaction,
  RewardMilestone,
  RewardAchievement,
} from "../types/rewards";


///
// What these tests verify
// Test area	Expected behavior
// Loading	Shows loading message
// API calls	Fetches all four datasets
// Points	Shows total and available balance
// Achievements	Shows earned milestones
// Progress	Calculates percentage correctly
// Unlocked status	Shows unlocked milestone
// Transactions	Displays positive and negative points
// Empty data	Shows helpful empty messages
// API errors	Displays an error and retry button
// Retry	Recovers after failed request
// Refresh	Displays newly fetched data
// Transaction limit	Shows at most 10 records
// Progress boundaries	Clamps values between 0–100%
///


vi.mock("../services/rewards", () => ({
  getRewardProfile: vi.fn(),
  getRewardTransactions: vi.fn(),
  getRewardMilestones: vi.fn(),
  getRewardAchievements: vi.fn(),
}));

const mockProfile: RewardProfile = {
  total_points: 175,
  available_points: 150,
  updated_at: "2026-11-13T12:00:00Z",
};

const mockMilestone: RewardMilestone = {
  id: 1,
  name: "Helpful Neighbor",
  description: "Write 25 comments",
  milestone_type: "comments",
  required_count: 25,
  bonus_points: 75,
  current_progress: 15,
  is_unlocked: false,
};

const mockAchievement: RewardAchievement = {
  id: 1,
  milestone: {
    id: 2,
    name: "First Steps",
    description: "Create your first post",
    milestone_type: "posts",
    required_count: 1,
    bonus_points: 25,
  },
  achieved_at: "2026-11-12T12:00:00Z",
};

const mockTransaction: RewardTransaction = {
  id: 1,
  activity_type: "post_created",
  activity_display: "Created a post",
  points: 10,
  reference_id: 1,
  created_at: "2026-11-13T12:00:00Z",
};

function renderDashboard() {
  return render(<RewardsDashboard />);
}

beforeEach(() => {
  vi.resetAllMocks();

  vi.mocked(rewardsApi.getRewardProfile)
    .mockResolvedValue({ ...mockProfile });

  vi.mocked(rewardsApi.getRewardTransactions)
    .mockResolvedValue([{ ...mockTransaction }]);

  vi.mocked(rewardsApi.getRewardMilestones)
    .mockResolvedValue([{ ...mockMilestone }]);

  vi.mocked(rewardsApi.getRewardAchievements)
    .mockResolvedValue([{ ...mockAchievement }]);
});

describe("Rewards Dashboard", () => {
  it("shows a loading state", () => {
    vi.mocked(rewardsApi.getRewardProfile)
      .mockImplementation(() => new Promise(() => {}));

    renderDashboard();

    expect(
      screen.getByText("Loading rewards...")
    ).toBeInTheDocument();
  });

  it("fetches all four rewards endpoints", async () => {
    renderDashboard();

    expect(
      await screen.findByRole("heading", {
        name: "My Rewards",
      })
    ).toBeInTheDocument();

    expect(rewardsApi.getRewardProfile)
      .toHaveBeenCalledOnce();

    expect(rewardsApi.getRewardTransactions)
      .toHaveBeenCalledOnce();

    expect(rewardsApi.getRewardMilestones)
      .toHaveBeenCalledOnce();

    expect(rewardsApi.getRewardAchievements)
      .toHaveBeenCalledOnce();
  });

  it("displays total and available points", async () => {
    renderDashboard();

    expect(
      await screen.findByText("Total: 175")
    ).toBeInTheDocument();

    expect(
      screen.getByText("Available: 150")
    ).toBeInTheDocument();
  });

  it("displays earned achievements", async () => {
    renderDashboard();

    expect(
      await screen.findByText("First Steps")
    ).toBeInTheDocument();

    expect(
      screen.getByText("Create your first post")
    ).toBeInTheDocument();

    expect(
      screen.getByText("+25 points")
    ).toBeInTheDocument();
  });

  it("displays milestone progress", async () => {
    renderDashboard();

    expect(
      await screen.findByText("Helpful Neighbor")
    ).toBeInTheDocument();

    expect(
      screen.getByText("15 / 25")
    ).toBeInTheDocument();

    expect(
      screen.getByText("Reward: +75 points")
    ).toBeInTheDocument();

    const progress = screen.getByRole("progressbar");

    expect(progress).toHaveAttribute("value", "60");
    expect(progress).toHaveAttribute("max", "100");
  });

  it("displays unlocked milestones", async () => {
    vi.mocked(rewardsApi.getRewardMilestones)
      .mockResolvedValue([
        {
          ...mockMilestone,
          current_progress: 25,
          is_unlocked: true,
        },
      ]);

    renderDashboard();

    expect(
      await screen.findByText("Unlocked")
    ).toBeInTheDocument();

    expect(
      screen.getByRole("progressbar")
    ).toHaveAttribute("value", "100");
  });

  it("displays positive reward transactions", async () => {
    renderDashboard();

    expect(
      await screen.findByText("Created a post")
    ).toBeInTheDocument();

    expect(
      screen.getByText("+10 pts")
    ).toBeInTheDocument();
  });

  it("displays negative reward transactions", async () => {
    vi.mocked(rewardsApi.getRewardTransactions)
      .mockResolvedValue([
        {
          ...mockTransaction,
          id: 2,
          activity_display: "Deleted a post",
          points: -10,
        },
      ]);

    renderDashboard();

    expect(
      await screen.findByText("Deleted a post")
    ).toBeInTheDocument();

    expect(
      screen.getByText("-10 pts")
    ).toBeInTheDocument();
  });

  it("displays empty states", async () => {
    vi.mocked(rewardsApi.getRewardAchievements)
      .mockResolvedValue([]);

    vi.mocked(rewardsApi.getRewardMilestones)
      .mockResolvedValue([]);

    vi.mocked(rewardsApi.getRewardTransactions)
      .mockResolvedValue([]);

    renderDashboard();

    expect(
      await screen.findByText("No achievements earned yet.")
    ).toBeInTheDocument();

    expect(
      screen.getByText("No milestones available.")
    ).toBeInTheDocument();

    expect(
      screen.getByText("No reward activity yet.")
    ).toBeInTheDocument();
  });

  it("displays an error when an API request fails", async () => {
    vi.mocked(rewardsApi.getRewardProfile)
      .mockRejectedValue(new Error("Network error"));

    renderDashboard();

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent(
      "Unable to load rewards. Please try again."
    );

    expect(
      screen.getByRole("button", { name: "Retry" })
    ).toBeInTheDocument();
  });

  it("retries successfully after an API failure", async () => {
    vi.mocked(rewardsApi.getRewardProfile)
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValue(mockProfile);

    renderDashboard();

    expect(
      await screen.findByRole("alert")
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Retry" })
    );

    expect(
      await screen.findByText("Total: 175")
    ).toBeInTheDocument();

    expect(rewardsApi.getRewardProfile)
      .toHaveBeenCalledTimes(2);
  });

  it("refreshes rewards when requested", async () => {
    renderDashboard();

    expect(
      await screen.findByText("Total: 175")
    ).toBeInTheDocument();

    vi.mocked(rewardsApi.getRewardProfile)
      .mockResolvedValue({
        ...mockProfile,
        total_points: 200,
      });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Refresh Rewards",
      })
    );

    expect(
      await screen.findByText("Total: 200")
    ).toBeInTheDocument();

    expect(rewardsApi.getRewardProfile)
      .toHaveBeenCalledTimes(2);
  });

  it("displays at most ten transactions", async () => {
    const transactions: RewardTransaction[] =
      Array.from({ length: 12 }, (_, index) => ({
        ...mockTransaction,
        id: index + 1,
        activity_display: `Activity ${index + 1}`,
      }));

    vi.mocked(rewardsApi.getRewardTransactions)
      .mockResolvedValue(transactions);

    renderDashboard();

    expect(
      await screen.findByText("Activity 1")
    ).toBeInTheDocument();

    expect(
      screen.getByText("Activity 10")
    ).toBeInTheDocument();

    expect(
      screen.queryByText("Activity 11")
    ).not.toBeInTheDocument();

    expect(
      screen.queryByText("Activity 12")
    ).not.toBeInTheDocument();
  });

  it("never displays progress above 100%", async () => {
    vi.mocked(rewardsApi.getRewardMilestones)
      .mockResolvedValue([
        {
          ...mockMilestone,
          current_progress: 30,
          required_count: 25,
        },
      ]);

    renderDashboard();

    await screen.findByText("Helpful Neighbor");

    expect(
      screen.getByRole("progressbar")
    ).toHaveAttribute("value", "100");
  });

  it("never displays negative progress", async () => {
    vi.mocked(rewardsApi.getRewardMilestones)
      .mockResolvedValue([
        {
          ...mockMilestone,
          current_progress: -5,
        },
      ]);

    renderDashboard();

    await screen.findByText("Helpful Neighbor");

    expect(
      screen.getByRole("progressbar")
    ).toHaveAttribute("value", "0");
  });
});
