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

    // Wait for the initial posts request to finish.
    await screen.findByText("Hello neighbors!");

    const textarea = screen.getByRole("textbox", {
      name: /your community update/i,
    });

    fireEvent.change(textarea, {
      target: { value: "My new post" },
    });

    const publishButton = screen.getByRole("button", {
      name: /publish post/i,
    });

    expect(publishButton).toBeEnabled();

    fireEvent.click(publishButton);

    await waitFor(() => {
      expect(communityApi.createPost).toHaveBeenCalledWith(
        "My new post"
      );
    });

    // Wait until the asynchronous submission finishes.
    await waitFor(() => {
      expect(publishButton).toBeDisabled();
      expect(textarea).toHaveValue("");
    });
  });

  it("likes a post", async () => {
    vi.mocked(communityApi.likePost).mockResolvedValue();

    renderCommunity();

    const likeButton = await screen.findByRole("button", {
      name: /like post by neighbor123/i,
    });

    expect(likeButton).toHaveAttribute(
      "aria-pressed",
      "false"
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

    const unlikeButton = await screen.findByRole("button", {
      name: /unlike post by neighbor123/i,
    });

    expect(unlikeButton).toHaveAttribute(
      "aria-pressed",
      "true"
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

    const commentsButton = await screen.findByRole("button", {
      name: /comments \(0\)/i,
    });

    fireEvent.click(commentsButton);

    expect(
      await screen.findByText("Great post!")
    ).toBeInTheDocument();

    expect(
      communityApi.getComments
    ).toHaveBeenCalledWith(1);

    expect(commentsButton).toHaveAttribute(
      "aria-expanded",
      "true"
    );
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

    const commentsButton = await screen.findByRole("button", {
      name: /comments \(0\)/i,
    });

    fireEvent.click(commentsButton);

    // Wait until the comments section is visible.
    const commentInput = await screen.findByRole("textbox", {
      name: /add a comment/i,
    });

    fireEvent.change(commentInput, {
      target: { value: "Nice post!" },
    });

    const submitButton = screen.getByRole("button", {
      name: /post comment/i,
    });

    expect(submitButton).toBeEnabled();

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        communityApi.createComment
      ).toHaveBeenCalledWith(1, "Nice post!");
    });

    expect(
      await screen.findByText("Nice post!")
    ).toBeInTheDocument();
  });

  it("prevents liking your own post", async () => {
    vi.mocked(communityApi.getPosts).mockResolvedValue([
      {
        ...mockPost,
        author: "testuser",
      },
    ]);

    renderCommunity();

    const likeButton = await screen.findByRole("button", {
      name: /like post by testuser/i,
    });

    expect(likeButton).toBeDisabled();

    fireEvent.click(likeButton);

    expect(
      communityApi.likePost
    ).not.toHaveBeenCalled();
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


  it("shows an empty feed message", async () => {
    vi.mocked(communityApi.getPosts).mockResolvedValue([]);

    renderCommunity();

    expect(
      await screen.findByText(
        /no posts yet/i
      )
    ).toBeInTheDocument();
  });


  
it("preserves a successful comment when feed refresh fails", async () => {
  vi.mocked(communityApi.getPosts)
    .mockResolvedValueOnce([{ ...mockPost }])
    .mockRejectedValueOnce(new Error("Refresh failed"));

  vi.mocked(communityApi.createComment).mockResolvedValue({
    id: 22,
    post: 1,
    user: "testuser",
    content: "Thanks for sharing!",
    created_at: "2026-11-20T12:00:00Z",
  });

  renderCommunity();

  const commentsButton = await screen.findByRole("button", {
    name: /comments \(0\)/i,
  });

  fireEvent.click(commentsButton);

  const input = await screen.findByRole("textbox", {
    name: /add a comment/i,
  });

  fireEvent.change(input, {
    target: { value: "Thanks for sharing!" },
  });

  fireEvent.click(
    screen.getByRole("button", {
      name: /post comment/i,
    })
  );

  expect(
    await screen.findByText("Thanks for sharing!")
  ).toBeInTheDocument();

  expect(
    await screen.findByRole("alert")
  ).toHaveTextContent(
    /comment was posted/i
  );

  expect(input).toHaveValue("");
});

});
