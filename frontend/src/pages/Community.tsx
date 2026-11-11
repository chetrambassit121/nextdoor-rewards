
import { useEffect, useState, type FormEvent } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import {
  getPosts,
  createPost,
  deletePost,
  getComments,
  createComment,
  likePost,
  unlikePost,
  type CommunityPost,
  type CommunityComment,
} from "../services/community";

import "./Community.css";


function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;

    if (typeof data?.detail === "string") {
      return data.detail;
    }

    if (Array.isArray(data?.content)) {
      return data.content.join(" ");
    }

    if (typeof data?.content === "string") {
      return data.content;
    }

    if (error.response?.status === 401) {
      return "Your session has expired. Please log in again.";
    }

    if (error.response?.status === 403) {
      return "You do not have permission to perform this action.";
    }

    if (error.response?.status === 404) {
      return "This post could not be found.";
    }

    if (error.response?.status === 429) {
      return "Too many requests. Please try again later.";
    }
  }

  return "Something went wrong. Please try again.";
}


export default function Community() {
  const { user } = useAuth();

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [busyPostId, setBusyPostId] = useState<number | null>(null);

  const [comments, setComments] = useState<
    Record<number, CommunityComment[]>
  >({});
  const [openComments, setOpenComments] = useState<number[]>([]);
  const [commentInputs, setCommentInputs] = useState<
    Record<number, string>
  >({});
  // const [likedPosts, setLikedPosts] = useState<number[]>([]);

  useEffect(() => {
    let active = true;

    async function loadPosts() {
      try {
        const data = await getPosts();
        if (active) setPosts(data);
      } catch (err) {
        if (active) setError(errorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadPosts();

    return () => {
      active = false;
    };
  }, []);

  async function refreshPosts() {
    const data = await getPosts();
    setPosts(data);
  }

  async function handleCreatePost(event: FormEvent) {
    event.preventDefault();

    const trimmed = content.trim();
    if (!trimmed || posting) return;

    setPosting(true);
    setError("");

    try {
      await createPost(trimmed);
      setContent("");
      await refreshPosts();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPosting(false);
    }
  }

  async function handleDeletePost(postId: number) {
    if (!window.confirm("Delete this post?")) return;

    setBusyPostId(postId);
    setError("");

    try {
      await deletePost(postId);
      setPosts((previous) =>
        previous.filter((post) => post.id !== postId)
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyPostId(null);
    }
  }

  async function handleToggleComments(postId: number) {
    if (openComments.includes(postId)) {
      setOpenComments((previous) =>
        previous.filter((id) => id !== postId)
      );
      return;
    }

    setBusyPostId(postId);
    setError("");

    try {
      const data = await getComments(postId);
      setComments((previous) => ({
        ...previous,
        [postId]: data,
      }));
      setOpenComments((previous) => [...previous, postId]);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyPostId(null);
    }
  }

  async function handleCreateComment(
    event: FormEvent,
    postId: number
  ) {
    event.preventDefault();

    const text = (commentInputs[postId] || "").trim();
    if (!text || busyPostId !== null) return;

    setBusyPostId(postId);
    setError("");

    try {
      const newComment = await createComment(postId, text);

      setComments((previous) => ({
        ...previous,
        [postId]: [
          newComment,
          ...(previous[postId] || []),
        ],
      }));

      setCommentInputs((previous) => ({
        ...previous,
        [postId]: "",
      }));

      await refreshPosts();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyPostId(null);
    }
  }


  async function handleLike(postId: number) {
    if (busyPostId !== null) return;

    const post = posts.find((item) => item.id === postId);
    if (!post) return;

    setBusyPostId(postId);
    setError("");

    try {
      if (post.is_liked) {
        await unlikePost(postId);
      } else {
        await likePost(postId);
      }

      // Fetch authoritative state from Django.
      await refreshPosts();
    } catch (err) {
      setError(errorMessage(err));

      // Recover state if the write succeeded but
      // the refresh failed or the server rejected it.
      try {
        await refreshPosts();
      } catch {
        // Keep the original error visible.
      }
    } finally {
      setBusyPostId(null);
    }
  }


  return (
    <main className="community-page">
      <header className="community-header">
        <div>
          <h1>Neighborhood Feed</h1>
          <p>Connect with your neighbors.</p>
        </div>

        <Link to="/dashboard" className="community-back">
          Dashboard
        </Link>
      </header>

      <section className="community-card">
        <h2>Create a Post</h2>

        <form onSubmit={handleCreatePost}>
          <textarea
            value={content}
            onChange={(event) =>
              setContent(event.target.value)
            }
            placeholder="What's happening in your neighborhood?"
            rows={4}
            maxLength={2000}
            required
          />

          <div className="community-form-footer">
            <span>{content.length}/2000</span>
            <button
              type="submit"
              disabled={!content.trim() || posting}
            >
              {posting ? "Posting..." : "Create Post"}
            </button>
          </div>
        </form>
      </section>

      {error && (
        <p className="community-error" role="alert">
          {error}
        </p>
      )}

      <section className="community-feed">
        <h2>Recent Posts</h2>

        {loading && <p>Loading community posts...</p>}

        {!loading && posts.length === 0 && (
          <p>No posts yet. Be the first to post!</p>
        )}

        {posts.map((post) => {
          const isAuthor = post.author === user?.username;
          // const isLiked = likedPosts.includes(post.id);
          const isLiked = post.is_liked;
          const commentsVisible = openComments.includes(post.id);
          const isBusy = busyPostId === post.id;
          // const isAnyPostBusy = busyPostId !== null;
          const isAnyPostBusy = busyPostId !== null;

          return (
            <article className="community-card" key={post.id}>
              <div className="community-post-header">
                <div>
                  <strong>@{post.author}</strong>
                  <time dateTime={post.created_at}>
                    {new Date(post.created_at).toLocaleString()}
                  </time>
                </div>

                {isAuthor && (
                  <button
                    className="community-delete"
                    // disabled={isBusy}
                    disabled={isAnyPostBusy}
                    onClick={() => void handleDeletePost(post.id)}
                  >
                    Delete
                  </button>
                )}
              </div>

              <p className="community-post-content">
                {post.content}
              </p>

              <div className="community-actions">
                <button
                  disabled={isAuthor || isAnyPostBusy}
                  aria-pressed={isLiked}
                  onClick={() => void handleLike(post.id)}
                >
                  {isLiked ? "♥ Liked" : "♡ Like"} ({post.likes_count})
                </button>

                <button
                  // disabled={isBusy}
                  disabled={isAnyPostBusy}
                  aria-expanded={commentsVisible}
                  onClick={() =>
                    void handleToggleComments(post.id)
                  }
                >
                  Comments ({post.comments_count})
                </button>
              </div>

              {commentsVisible && (
                <div className="community-comments">
                  {(comments[post.id] || []).map((comment) => (
                    <div
                      className="community-comment"
                      key={comment.id}
                    >
                      <strong>@{comment.user}</strong>
                      <p>{comment.content}</p>
                    </div>
                  ))}

                  {!isAuthor && (
                    <form
                      onSubmit={(event) =>
                        void handleCreateComment(
                          event,
                          post.id
                        )
                      }
                    >
                      <textarea
                        placeholder="Write a comment..."
                        value={commentInputs[post.id] || ""}
                        onChange={(event) =>
                          setCommentInputs((previous) => ({
                            ...previous,
                            [post.id]: event.target.value,
                          }))
                        }
                        rows={2}
                        maxLength={1000}
                        required
                      />

                      <button
                        type="submit"
                        disabled={
                          isBusy ||
                          !(commentInputs[post.id] || "").trim()
                        }
                      >
                        Comment
                      </button>
                    </form>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </section>
    </main>
  );
}
