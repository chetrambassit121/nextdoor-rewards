import { Link } from "react-router-dom";
import type { CommunityPost } from "../../services/community";
import "./PostCard.css";

interface PostCardProps {
  post: CommunityPost;
  isAuthor: boolean;
  isBusy: boolean;
  isLiking: boolean;
  isAnyPostBusy: boolean;
  commentsVisible: boolean;
  onLike: (postId: number) => void;
  onToggleComments: (postId: number) => void;
  onDelete: (postId: number) => void;
  children?: React.ReactNode;
}

function getInitials(username: string): string {
  return username.slice(0, 2).toUpperCase();
}

function formatPostDate(date: string): string {
  const timestamp = new Date(date).getTime();
  const difference = Date.now() - timestamp;

  if (!Number.isFinite(timestamp)) return date;

  if (difference < 0) {
    return new Date(date).toLocaleDateString();
  }

  const minutes = Math.floor(difference / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(date).toLocaleDateString();
}

export default function PostCard({
  post,
  isAuthor,
  isBusy,
  isLiking,
  isAnyPostBusy,
  commentsVisible,
  onLike,
  onToggleComments,
  onDelete,
  children,
}: PostCardProps) {
  return (
    <article
      className="post-card"
      aria-busy={isBusy}
    >
      <header className="post-card-header">
        <div className="post-card-author">
          <div
            className="post-card-avatar"
            aria-hidden="true"
          >
            {getInitials(post.author)}
          </div>

          <div className="post-card-author-info">
            {post.author_id != null ? (
              <Link
                to={`/users/${post.author_id}`}
                className="post-card__author-link"
                title={`View ${post.author}'s profile`}
              >
                @{post.author}
                <span
                  className="post-card__author-arrow"
                  aria-hidden="true"
                >
                  ↗
                </span>
              </Link>
            ) : (
              <strong>@{post.author}</strong>
            )}

            <time
              dateTime={post.created_at}
              title={new Date(post.created_at).toLocaleString()}
            >
              {formatPostDate(post.created_at)}
            </time>
          </div>
        </div>

        {isAuthor && (
          <button
            type="button"
            className="post-card-delete"
            disabled={isAnyPostBusy}
            onClick={() => onDelete(post.id)}
            aria-label={`Delete post by ${post.author}`}
          >
            Delete
          </button>
        )}
      </header>

      <p className="post-card-content">
        {post.content}
      </p>

      <div className="post-card-stats">
        <span>
          {post.likes_count}{" "}
          {post.likes_count === 1 ? "like" : "likes"}
        </span>

        <span>
          {post.comments_count}{" "}
          {post.comments_count === 1
            ? "comment"
            : "comments"}
        </span>
      </div>

      <div className="post-card-actions">
        
      <button
        type="button"
        className={
            post.is_liked
            ? "post-card-action post-card-action-liked"
            : "post-card-action"
        }
        disabled={isAuthor || isAnyPostBusy}
        aria-pressed={post.is_liked}
        aria-label={
            post.is_liked
            ? `Unlike post by ${post.author}`
            : `Like post by ${post.author}`
        }
        onClick={() => onLike(post.id)}
        >
        <span aria-hidden="true">
            {post.is_liked ? "♥" : "♡"}
        </span>

        {isLiking
          ? "Updating..."
          : post.is_liked
            ? "Liked"
            : "Like"}
      </button>


        <button
          type="button"
          className="post-card-action"
          disabled={isAnyPostBusy}
          aria-expanded={commentsVisible}
          onClick={() => onToggleComments(post.id)}
        >
          <span aria-hidden="true">♧</span>
          Comments ({post.comments_count})
        </button>
      </div>

      {commentsVisible && children}
    </article>
  );
}
