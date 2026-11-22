import { Link } from "react-router-dom";
import type { FormEvent } from "react";
import type { CommunityComment } from "../../services/community";
import "./CommentsSection.css";

interface CommentsSectionProps {
  postId: number;
  comments: CommunityComment[];
  value: string;
  busy: boolean;
  canComment: boolean;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString();
}

export default function CommentsSection({
  postId,
  comments,
  value,
  busy,
  canComment,
  onChange,
  onSubmit,
}: CommentsSectionProps) {
  const remaining = 1000 - value.length;

  return (
    <section
      className="comments-section"
      aria-label="Post comments"
      aria-busy={busy}
    >
      <div className="comments-section-header">
        <h3>Comments</h3>
        <span>{comments.length} loaded</span>
      </div>

      {comments.length === 0 ? (
        <p className="comments-empty">
          No comments yet. Start the conversation!
        </p>
      ) : (
        <div className="comments-list">
          {comments.map((comment) => (
            <article
              className="comment-item"
              key={comment.id}
            >
              <div
                className="comment-avatar"
                aria-hidden="true"
              >
                {comment.user.slice(0, 2).toUpperCase()}
              </div>

              <div className="comment-bubble">
                <div className="comment-meta">
                  {comment.user_id != null ? (
                    <Link className="comment-user-link" to={`/users/${comment.user_id}`}>
                      @{comment.user}
                    </Link>
                  ) : (
                    <strong>@{comment.user}</strong>
                  )}

                  <time dateTime={comment.created_at}>
                    {formatDate(comment.created_at)}
                  </time>
                </div>

                <p>{comment.content}</p>
              </div>
            </article>
          ))}
        </div>
      )}

      {canComment && (
        <form
          className="comment-form"
          onSubmit={onSubmit}
        >
          <label htmlFor={`comment-input-${postId}`}>
            Add a comment
          </label>

          <textarea
            id={`comment-input-${postId}`}
            value={value}
            onChange={(event) =>
              onChange(event.target.value)
            }
            placeholder="Write a thoughtful comment..."
            rows={2}
            maxLength={1000}
            disabled={busy}
            required
          />

          <div className="comment-form-footer">
            <span
              className={
                remaining <= 100
                  ? "comment-counter warning"
                  : "comment-counter"
              }
            >
              {value.length} / 1000
            </span>

            <button
              type="submit"
              disabled={
                busy ||
                !value.trim() ||
                value.length > 1000
              }
            >
              {busy ? "Posting..." : "Post Comment"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
