import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

import { MemoryRouter } from "react-router-dom";
import Dashboard from "./Dashboard";

import * as rewardsApi from "../services/rewards";
import * as communityApi from "../services/community";

import type {
  RewardProfile,
  RewardTransaction,
  RewardMilestone,
  RewardAchievement,
} from "../types/rewards";

import type {
  CommunityPost,
} from "../services/community";

// Mock authentication context
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: 1,
      username: "testneighbor",
      email: "neighbor@example.com",
    },
    loading: false,
  }),
}));

// Mock API services
vi.mock("../services/rewards", () => ({
  getRewardProfile: vi.fn(),
  getRewardTransactions: vi.fn(),
  getRewardMilestones: vi.fn(),
  getRewardAchievements: vi.fn(),
}));

vi.mock("../services/community", () => ({
  getPosts: vi.fn(),
}));

const mockProfile: RewardProfile = {
  total_points: 175,
  available_points: 150,
  updated_at: "2026-11-19T12:00:00Z",
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
  achieved_at: "2026-11-18T12:00:00Z",
};

const mockTransaction: RewardTransaction = {
  id: 1,
  activity_type: "post_created",
  activity_display: "Created a post",
  points: 10,
  reference_id: 1,
  created_at: "2026-11-19T12:00:00Z",
};

const mockPost: CommunityPost = {
  id: 1,
  author: "neighbor2",
  content: "Welcome to our neighborhood!",
  comments_count: 3,
  likes_count: 5,
  is_liked: false,
  created_at: "2026-11-19T12:00:00Z",
  updated_at: "2026-11-19T12:00:00Z",
};

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );
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

  vi.mocked(communityApi.getPosts)
    .mockResolvedValue([{ ...mockPost }]);
});

describe("Modern Dashboard", () => {

  it("shows a loading state", () => {
    vi.mocked(rewardsApi.getRewardProfile)
      .mockImplementation(() => new Promise(() => {}));

    renderDashboard();

    expect(
      screen.getByText(/loading your dashboard/i)
    ).toBeInTheDocument();
  });

  it("fetches all five API datasets", async () => {
    renderDashboard();

    await waitFor(() => {
      expect(rewardsApi.getRewardProfile)
        .toHaveBeenCalledTimes(1);

      expect(rewardsApi.getRewardTransactions)
        .toHaveBeenCalledTimes(1);

      expect(rewardsApi.getRewardMilestones)
        .toHaveBeenCalledTimes(1);

      expect(rewardsApi.getRewardAchievements)
        .toHaveBeenCalledTimes(1);

      expect(communityApi.getPosts)
        .toHaveBeenCalledTimes(1);
    });
  });

  it("displays the authenticated username", async () => {
    renderDashboard();

    expect(
      await screen.findByText(/welcome back, testneighbor/i)
    ).toBeInTheDocument();
  });

  it("displays total and available points", async () => {
    renderDashboard();

    const stats = await screen.findByRole("region", {
      name: /dashboard statistics/i,
    });

    expect(
      within(stats).getByText("175")
    ).toBeInTheDocument();

    expect(
      within(stats).getByText("150")
    ).toBeInTheDocument();
  });

  it("displays earned achievements count", async () => {
    renderDashboard();

    const stats = await screen.findByRole("region", {
        name: /dashboard statistics/i,
    });

    const achievementsLabel = within(stats).getByText("Achievements");

    const achievementsCard = achievementsLabel.closest(".ui-card");

    expect(achievementsCard).not.toBeNull();

    expect(
        within(achievementsCard as HTMLElement).getByText("1")
    ).toBeInTheDocument();
  });

  it("displays milestone progress", async () => {
    renderDashboard();

    expect(
      await screen.findByText("Helpful Neighbor")
    ).toBeInTheDocument();

    expect(
      screen.getByText(/60% complete/i)
    ).toBeInTheDocument();

    const progress = screen.getByRole("progressbar", {
      name: /helpful neighbor progress/i,
    });

    expect(progress).toHaveAttribute("value", "60");
  });

  it("never displays milestone progress above 100%", async () => {
    vi.mocked(rewardsApi.getRewardMilestones)
      .mockResolvedValue([
        {
          ...mockMilestone,
          current_progress: 40,
          required_count: 25,
        },
      ]);

    renderDashboard();

    const progress = await screen.findByRole("progressbar");

    expect(progress).toHaveAttribute("value", "100");
  });

  it("displays recent reward transactions", async () => {
    renderDashboard();

    expect(
      await screen.findByText("Created a post")
    ).toBeInTheDocument();

    expect(
      screen.getByText("+10 pts")
    ).toBeInTheDocument();
  });

  it("shows only five recent transactions", async () => {
    const transactions = Array.from(
      { length: 8 },
      (_, index): RewardTransaction => ({
        ...mockTransaction,
        id: index + 1,
        activity_display: `Activity ${index + 1}`,
        created_at: new Date(
          Date.UTC(2026, 10, index + 1)
        ).toISOString(),
      })
    );

    vi.mocked(rewardsApi.getRewardTransactions)
      .mockResolvedValue(transactions);

    renderDashboard();

    await screen.findByText("Activity 8");

    expect(
      screen.getAllByText(/^Activity \d+$/)
    ).toHaveLength(5);

    expect(
      screen.queryByText("Activity 1")
    ).not.toBeInTheDocument();
  });

  it("displays community posts", async () => {
    renderDashboard();

    expect(
      await screen.findByText(
        "Welcome to our neighborhood!"
      )
    ).toBeInTheDocument();

    expect(
      screen.getByText("neighbor2")
    ).toBeInTheDocument();

    expect(
      screen.getByText(/5 likes/i)
    ).toBeInTheDocument();
  });

  it("shows only three community posts", async () => {
    const posts = Array.from(
      { length: 6 },
      (_, index): CommunityPost => ({
        ...mockPost,
        id: index + 1,
        content: `Community message ${index + 1}`,
      })
    );

    vi.mocked(communityApi.getPosts)
      .mockResolvedValue(posts);

    renderDashboard();

    await screen.findByText("Community message 1");

    expect(
      screen.getAllByText(/^Community message \d+$/)
    ).toHaveLength(3);

    expect(
      screen.queryByText("Community message 4")
    ).not.toBeInTheDocument();
  });

  it("displays empty states", async () => {
    vi.mocked(rewardsApi.getRewardTransactions)
      .mockResolvedValue([]);

    vi.mocked(rewardsApi.getRewardMilestones)
      .mockResolvedValue([]);

    vi.mocked(communityApi.getPosts)
      .mockResolvedValue([]);

    renderDashboard();

    expect(
      await screen.findByText(/no milestones available/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/no reward activity yet/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/no community posts yet/i)
    ).toBeInTheDocument();
  });

  it("shows an error when an API request fails", async () => {
    vi.mocked(rewardsApi.getRewardProfile)
      .mockRejectedValue(new Error("Network error"));

    renderDashboard();

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent(/unable to load your dashboard/i);

    expect(
      screen.getByRole("button", { name: "Retry" })
    ).toBeInTheDocument();
  });

  it("retries successfully after an API failure", async () => {
    vi.mocked(rewardsApi.getRewardProfile)
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce(mockProfile);

    renderDashboard();

    await screen.findByRole("alert");

    fireEvent.click(
      screen.getByRole("button", { name: "Retry" })
    );

    await waitFor(() => {
      expect(
        screen.getByText("175")
      ).toBeInTheDocument();
    });

    expect(
      rewardsApi.getRewardProfile
    ).toHaveBeenCalledTimes(2);
  });

  it("refreshes dashboard data", async () => {
    vi.mocked(rewardsApi.getRewardProfile)
      .mockResolvedValueOnce(mockProfile)
      .mockResolvedValueOnce({
        ...mockProfile,
        total_points: 250,
      });

    renderDashboard();

    await screen.findByText("175");

    fireEvent.click(
      screen.getByRole("button", {
        name: /refresh dashboard/i,
      })
    );

    expect(
      await screen.findByText("250")
    ).toBeInTheDocument();

    expect(
      rewardsApi.getRewardProfile
    ).toHaveBeenCalledTimes(2);
  });

  it("provides navigation to community, rewards and profile", async () => {
    renderDashboard();

    await screen.findByText("175");

    expect(
      screen.getByRole("link", {
        name: "Explore Community",
      })
    ).toHaveAttribute("href", "/community");

    expect(
      screen.getByRole("link", {
        name: "View My Rewards",
      })
    ).toHaveAttribute("href", "/rewards");

    expect(
      screen.getByRole("link", {
        name: "Edit My Profile",
      })
    ).toHaveAttribute("href", "/profile");
  });

});
