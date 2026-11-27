import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import CreatePostCard from "./CreatePostCard";

describe("CreatePostCard", () => {
  const defaultProps = {
    username: "neighbor",
    content: "",
    posting: false,
    onContentChange: vi.fn(),
    onSubmit: vi.fn(),
  };

  it("renders the logged-in username", () => {
    render(<CreatePostCard {...defaultProps} />);

    expect(
      screen.getByText("Posting as @neighbor")
    ).toBeInTheDocument();
  });

  it("disables publishing when content is empty", () => {
    render(<CreatePostCard {...defaultProps} />);

    expect(
      screen.getByRole("button", { name: /publish post/i })
    ).toBeDisabled();
  });

  it("enables publishing when content is valid", () => {
    render(
      <CreatePostCard
        {...defaultProps}
        content="Hello neighbors!"
      />
    );

    expect(
      screen.getByRole("button", { name: /publish post/i })
    ).toBeEnabled();
  });

  it("updates the content through the callback", () => {
    const onContentChange = vi.fn();

    render(
      <CreatePostCard
        {...defaultProps}
        onContentChange={onContentChange}
      />
    );

    fireEvent.change(
      screen.getByRole("textbox", {
        name: /your community update/i,
      }),
      { target: { value: "Community cleanup!" } }
    );

    expect(onContentChange).toHaveBeenCalledWith(
      "Community cleanup!"
    );
  });

  it("displays the character counter", () => {
    render(
      <CreatePostCard
        {...defaultProps}
        content="Hello"
      />
    );

    expect(
      screen.getByText("5 / 2,000")
    ).toBeInTheDocument();
  });

  it("shows publishing feedback", () => {
    render(
      <CreatePostCard
        {...defaultProps}
        content="Hello!"
        posting={true}
      />
    );

    expect(
      screen.getByRole("button", { name: /publishing/i })
    ).toBeDisabled();
  });

  it("submits valid content", () => {
    const onSubmit = vi.fn((event) => event.preventDefault());

    render(
      <CreatePostCard
        {...defaultProps}
        content="Hello neighbors!"
        onSubmit={onSubmit}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: /publish post/i })
    );

    expect(onSubmit).toHaveBeenCalledOnce();
  });
});
