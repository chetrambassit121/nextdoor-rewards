import { useState, type FormEvent } from "react";
import "./CreatePostCard.css";

const MAX_POST_LENGTH = 2000;

interface CreatePostCardProps {
  username: string;
  content: string;
  posting: boolean;
  onContentChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export default function CreatePostCard({
  username,
  content,
  posting,
  onContentChange,
  onSubmit,
}: CreatePostCardProps) {
  const [focused, setFocused] = useState(false);

  const remaining = MAX_POST_LENGTH - content.length;
  const isNearLimit = remaining <= 200;
  const isInvalid =
    !content.trim() || content.length > MAX_POST_LENGTH;

  const initials = username.slice(0, 2).toUpperCase() || "U";

  return (
    <section
      className="create-post-card"
      aria-labelledby="create-post-heading"
    >
      <div className="create-post-header">
        <div className="create-post-avatar" aria-hidden="true">
          {initials}
        </div>

        <div className="create-post-heading">
          <h2 id="create-post-heading">
            Share with your neighborhood
          </h2>
          <p>Posting as @{username}</p>
        </div>
      </div>

      <form onSubmit={onSubmit}>
        <div
          className={`create-post-editor ${
            focused ? "create-post-editor-focused" : ""
          }`}
        >
          <label
            htmlFor="community-post-content"
            className="create-post-label"
          >
            Your community update
          </label>

          <textarea
            id="community-post-content"
            value={content}
            onChange={(event) =>
              onContentChange(event.target.value)
            }
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="What's happening in your neighborhood?"
            rows={4}
            maxLength={MAX_POST_LENGTH}
            disabled={posting}
            required
            aria-describedby="create-post-counter"
          />

          <div className="create-post-counter-row">
            <span
              id="create-post-counter"
              className={
                isNearLimit
                  ? "create-post-counter create-post-counter-warning"
                  : "create-post-counter"
              }
              aria-live="polite"
            >
              {content.length.toLocaleString()} /{" "}
              {MAX_POST_LENGTH.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="create-post-footer">
          <span className="create-post-hint">
            Share something helpful with your community
          </span>

          <button
            type="submit"
            className="create-post-submit"
            disabled={isInvalid || posting}
          >
            {posting ? (
              <>
                <span
                  className="create-post-spinner"
                  aria-hidden="true"
                />
                Publishing...
              </>
            ) : (
              <>
                <span aria-hidden="true">↗</span>
                Publish Post
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
