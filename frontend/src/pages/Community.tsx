import { useEffect, useState, type FormEvent } from "react";

import axios from "axios";

import { Link } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

import PostCard from "../components/community/PostCard";

import CreatePostCard from "../components/community/CreatePostCard";

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

import CommentsSection from "../components/community/CommentsSection";

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

type PostAction = "like" | "comments" | "comment" | "delete";

type BusyPost = {
  id: number;
  action: PostAction;
} | null;

export default function Community() {

const { user } = useAuth();

const [posts, setPosts] = useState<CommunityPost[]>([]);

const [content, setContent] = useState("");

const [loading, setLoading] = useState(true);

const [posting, setPosting] = useState(false);

const [error, setError] = useState("");


const [busyPost, setBusyPost] = useState<BusyPost>(null);

const [postSuccess, setPostSuccess] = useState("");

const [comments, setComments] = useState<

    Record<number, CommunityComment[]>

  >({});

const [openComments, setOpenComments] = useState<number[]>([]);

const [commentInputs, setCommentInputs] = useState<

    Record<number, string>

  >({});

// Fetch community posts on initial load.

  useEffect(() => {

let active = true;

async function loadPosts() {

      try {

const data = await getPosts();

        if (active) {

          setPosts(data);

        }

      } catch (err) {

        if (active) {

          setError(errorMessage(err));

        }

      } finally {

        if (active) {

          setLoading(false);

        }

      }

    }

    void loadPosts();

    return () => {

      active = false;

    };

  }, []);

// Refresh posts using Django as the source of truth.

async function refreshPosts() {

const data = await getPosts();

    setPosts(data);

  }

// Create a new community post.

async function handleCreatePost(event: FormEvent) {

    event.preventDefault();

const trimmed = content.trim();

    if (!trimmed || trimmed.length > 2000 || posting) {

      return;

    }

    setPosting(true);

    setError("");

    setPostSuccess("");

    try {

      await createPost(trimmed);

// The post was successfully saved in Django.

      setContent("");

      setPostSuccess("Your post was published successfully!");

// Refresh the feed to display the latest posts.

     try {
      await refreshPosts();
    } catch {
      setError(
        "Your comment was posted, but the feed counts could not refresh."
      );
    }

    } catch (err) {

      setError(errorMessage(err));

    } finally {

      setPosting(false);

    }

  }

// Delete a post owned by the authenticated user.

async function handleDeletePost(postId: number) {

    if (busyPost !== null) return;

    if (!window.confirm("Delete this post?")) return;

    setBusyPost({ id: postId, action: "delete" });

    setError("");

    try {

      await deletePost(postId);

      setPosts((previous) =>

        previous.filter((post) => post.id !== postId)

      );

      setOpenComments((previous) =>

        previous.filter((id) => id !== postId)

      );

    } catch (err) {

      setError(errorMessage(err));

    } finally {

      setBusyPost(null);

    }

  }

// Open or close comments for a post.

async function handleToggleComments(postId: number) {

    if (busyPost !== null) return;

    if (openComments.includes(postId)) {

      setOpenComments((previous) =>

        previous.filter((id) => id !== postId)

      );

      return;

    }

    setBusyPost({ id: postId, action: "comments" });

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

      setBusyPost(null);

    }

  }

// Create a comment on a community post.
async function handleCreateComment(
  event: FormEvent,
  postId: number
) {
  event.preventDefault();

  const text = (commentInputs[postId] || "").trim();

  if (!text || busyPost !== null) return;

  setBusyPost({ id: postId, action: "comment" });
  setError("");

  try {
    const newComment = await createComment(postId, text);

    // Comment successfully saved in Django.
    setComments((previous) => ({
      ...previous,
      [postId]: [
        newComment,
        ...(previous[postId] || []),
      ],
    }));

    // Clear comment input.
    setCommentInputs((previous) => ({
      ...previous,
      [postId]: "",
    }));

    // Refresh feed counts without losing the successful comment.
    try {
      await refreshPosts();
    } catch {
      setError(
        "Your comment was posted, but the feed counts could not refresh."
      );
    }
  } catch (err) {
    // Only comment submission failures reach this block.
    setError(errorMessage(err));
  } finally {
    setBusyPost(null);
  }
}

// Like or unlike a post.

async function handleLike(postId: number) {

    if (busyPost !== null) return;

const post = posts.find((item) => item.id === postId);

    if (!post) return;

    setBusyPost({ id: postId, action: "like" });

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

// Recover server state if the request partially succeeded.

      try {

        await refreshPosts();

      } catch {

// Keep the original error visible.

      }

    } finally {

      setBusyPost(null);

    }

  }

  return (

    <main className="community-page">

      {/* Page header */}

      <header className="community-header">

        <div>

          <h1>Neighborhood Feed</h1>

          <p>Connect with your neighbors.</p>

        </div>

        <Link

          to="/dashboard"

          className="community-back"

        >

          Dashboard

        </Link>

      </header>

      {/* Error message */}

      {error && (

        <p className="community-error" role="alert">

          {error}

        </p>

      )}

      {/* Create post form */}

      <CreatePostCard

        username={user?.username ?? "Neighbor"}

        content={content}

        posting={posting}

        onContentChange={(value) => {

          setContent(value);

          if (postSuccess) {

            setPostSuccess("");

          }

        }}

        onSubmit={handleCreatePost}

      />

      {postSuccess && (

        <p className="community-success" role="status">

          {postSuccess}

        </p>

      )}

      {/* Community feed */}

      <section className="community-feed">

        <h2>Recent Posts</h2>

        {loading && (

          <p>Loading community posts...</p>

        )}

        {!loading && posts.length === 0 && (

          <p>No posts yet. Be the first to post!</p>

        )}

        {!loading &&

          posts.map((post) => {

            const isAuthor = post.author === user?.username;

            const commentsVisible = openComments.includes(post.id);

            const isBusy = busyPost?.id === post.id;

            const isAnyPostBusy = busyPost !== null;

            const isLiking =
              busyPost?.id === post.id &&
              busyPost.action === "like";

            const isCommenting =
              busyPost?.id === post.id &&
              busyPost.action === "comment";

            return (

              <PostCard

                key={post.id}

                post={post}

                isAuthor={isAuthor}

                isBusy={isBusy}

                isLiking={isLiking}

                isAnyPostBusy={isAnyPostBusy}
                

                commentsVisible={commentsVisible}

                onLike={(id) => void handleLike(id)}

                onToggleComments={(id) =>

                  void handleToggleComments(id)

                }

                onDelete={(id) => void handleDeletePost(id)}

              >

                <CommentsSection

                  postId={post.id}

                  comments={comments[post.id] || []}

                  value={commentInputs[post.id] || ""}

                  // busy={busyPost?.id === post.id && busyPost.action === "comment"}
                  busy={isCommenting}

                  canComment={!isAuthor}

                  onChange={(value) =>

                    setCommentInputs((previous) => ({

                      ...previous,

                      [post.id]: value,

                    }))

                  }

                  onSubmit={(event) =>

                    void handleCreateComment(event, post.id)

                  }

                />

              </PostCard>

            );

          })}

      </section>

    </main>

  );

}