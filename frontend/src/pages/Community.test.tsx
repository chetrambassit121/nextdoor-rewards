
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import Community from "./Community";
import * as communityApi from "../services/community";

vi.mock("../services/community", () => ({
  getPosts: vi.fn(),
  createPost: vi.fn(),
  deletePost: vi.fn(),
  getComments: vi.fn(),
  createComment: vi.fn(),
  likePost: vi.fn(),
  unlikePost: vi.fn(),
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: 1,
      username: "testuser",
    },
  }),
}));

const mockPost: communityApi.CommunityPost = {
  id: 1,
  author: "neighbor123",
  content: "Hello neighbors!",
  comments_count: 0,
  likes_count: 0,
  is_liked: false,
  created_at: "2026-11-10T18:00:00Z",
  updated_at: "2026-11-10T18:00:00Z",
};

function renderCommunity() {
  return render(
    <MemoryRouter>
      <Community />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.resetAllMocks();

  vi.mocked(communityApi.getPosts).mockResolvedValue([
    { ...mockPost },
  ]);

  vi.mocked(communityApi.getComments).mockResolvedValue([]);
});

describe("Community Feed", () => {
  it("displays community posts", async () => {
    renderCommunity();

    expect(
      await screen.findByText("Hello neighbors!")
    ).toBeInTheDocument();

    expect(
      screen.getByText("@neighbor123")
    ).toBeInTheDocument();
  });

  it("creates a new post", async () => {
    vi.mocked(communityApi.createPost).mockResolvedValue({
      ...mockPost,
      id: 2,
      author: "testuser",
      content: "My new post",
    });

    renderCommunity();

    const textarea = screen.getByPlaceholderText(
      "What's happening in your neighborhood?"
    );

    fireEvent.change(textarea, {
      target: { value: "My new post" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Create Post" })
    );

    await waitFor(() => {
      expect(communityApi.createPost).toHaveBeenCalledWith(
        "My new post"
      );
    });
  });

  it("likes a post", async () => {
    vi.mocked(communityApi.likePost).mockResolvedValue();

    renderCommunity();

    const likeButton = await screen.findByRole(
      "button",
      { name: /like \(0\)/i }
    );

    fireEvent.click(likeButton);

    await waitFor(() => {
      expect(communityApi.likePost).toHaveBeenCalledWith(1);
    });
  });

  it("unlikes an already liked post", async () => {
    vi.mocked(communityApi.getPosts).mockResolvedValue([
      {
        ...mockPost,
        is_liked: true,
        likes_count: 1,
      },
    ]);

    vi.mocked(communityApi.unlikePost).mockResolvedValue();

    renderCommunity();

    const unlikeButton = await screen.findByRole(
      "button",
      { name: /liked \(1\)/i }
    );

    fireEvent.click(unlikeButton);

    await waitFor(() => {
      expect(communityApi.unlikePost).toHaveBeenCalledWith(1);
    });
  });

  it("loads comments", async () => {
    vi.mocked(communityApi.getComments).mockResolvedValue([
      {
        id: 10,
        user: "neighbor456",
        post: 1,
        content: "Great post!",
        created_at: "2026-11-10T18:05:00Z",
      },
    ]);

    renderCommunity();

    const commentsButton = await screen.findByRole(
      "button",
      { name: /comments \(0\)/i }
    );

    fireEvent.click(commentsButton);

    expect(
      await screen.findByText("Great post!")
    ).toBeInTheDocument();
  });

  it("creates a comment", async () => {
    vi.mocked(communityApi.createComment).mockResolvedValue({
      id: 11,
      user: "testuser",
      post: 1,
      content: "Nice post!",
      created_at: "2026-11-10T18:10:00Z",
    });

    renderCommunity();

    fireEvent.click(
      await screen.findByRole(
        "button",
        { name: /comments \(0\)/i }
      )
    );

    const commentInput = await screen.findByPlaceholderText(
      "Write a comment..."
    );

    fireEvent.change(commentInput, {
      target: { value: "Nice post!" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Comment" })
    );

    await waitFor(() => {
      expect(communityApi.createComment).toHaveBeenCalledWith(
        1,
        "Nice post!"
      );
    });
  });

  it("prevents liking your own post", async () => {
    vi.mocked(communityApi.getPosts).mockResolvedValue([
      {
        ...mockPost,
        author: "testuser",
      },
    ]);

    renderCommunity();

    const likeButton = await screen.findByRole(
      "button",
      { name: /like \(0\)/i }
    );

    expect(likeButton).toBeDisabled();
  });

  it("displays an error when loading fails", async () => {
    vi.mocked(communityApi.getPosts).mockRejectedValue(
      new Error("Network error")
    );

    renderCommunity();

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent(
      "Something went wrong. Please try again."
    );
  });
});
