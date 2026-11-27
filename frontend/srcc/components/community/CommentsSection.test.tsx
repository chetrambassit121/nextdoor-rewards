import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import CommentsSection from "./CommentsSection";

describe("CommentsSection", () => {
  const defaultProps = {
    postId: 1,
    comments: [],
    value: "",
    busy: false,
    canComment: true,
    onChange: vi.fn(),
    onSubmit: vi.fn((event) => event.preventDefault()),
  };

  it("shows empty comment state", () => {
    render(<CommentsSection {...defaultProps} />);

    expect(
      screen.getByText(/no comments yet/i)
    ).toBeInTheDocument();
  });

  it("renders existing comments", () => {
    render(
      <CommentsSection
        {...defaultProps}
        comments={[
          {
            id: 10,
            post: 1,
            user: "neighbor",
            content: "Great work!",
            created_at: "2026-11-19T12:00:00Z",
          },
        ]}
      />
    );

    expect(
      screen.getByText("@neighbor")
    ).toBeInTheDocument();

    expect(
      screen.getByText("Great work!")
    ).toBeInTheDocument();
  });

  it("disables empty comment submission", () => {
    render(<CommentsSection {...defaultProps} />);

    expect(
      screen.getByRole("button", {
        name: /post comment/i,
      })
    ).toBeDisabled();
  });

  it("updates comment input", () => {
    const onChange = vi.fn();

    render(
      <CommentsSection
        {...defaultProps}
        onChange={onChange}
      />
    );

    fireEvent.change(
      screen.getByRole("textbox", {
        name: /add a comment/i,
      }),
      { target: { value: "Hello!" } }
    );

    expect(onChange).toHaveBeenCalledWith("Hello!");
  });

  it("prevents authors from commenting", () => {
    render(
      <CommentsSection
        {...defaultProps}
        canComment={false}
      />
    );

    expect(
      screen.queryByRole("textbox")
    ).not.toBeInTheDocument();
  });

  it("shows posting state", () => {
    render(
      <CommentsSection
        {...defaultProps}
        busy={true}
        value="Hello!"
      />
    );

    expect(
      screen.getByRole("button", {
        name: /posting/i,
      })
    ).toBeDisabled();
  });

  it("submits valid comments", () => {
    const onSubmit = vi.fn((event) => event.preventDefault());

    render(
      <CommentsSection
        {...defaultProps}
        value="Great work!"
        onSubmit={onSubmit}
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /post comment/i,
      })
    );

    expect(onSubmit).toHaveBeenCalledOnce();
  });
});
