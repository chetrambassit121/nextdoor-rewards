
import { api } from "./api";

export interface CommunityPost {
  id: number;
  author: string;
  content: string;
  comments_count: number;
  likes_count: number;
  created_at: string;
  updated_at: string;
}

export interface CommunityComment {
  id: number;
  user: string;
  post: number;
  content: string;
  created_at: string;
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export async function getPosts(): Promise<CommunityPost[]> {
  const response = await api.get<
    CommunityPost[] | PaginatedResponse<CommunityPost>
  >("/community/posts/");

  return Array.isArray(response.data)
    ? response.data
    : response.data.results;
}

export async function createPost(
  content: string
): Promise<CommunityPost> {
  const response = await api.post<CommunityPost>(
    "/community/posts/",
    { content }
  );

  return response.data;
}

export async function deletePost(
  postId: number
): Promise<void> {
  await api.delete(`/community/posts/${postId}/`);
}

export async function getComments(
  postId: number
): Promise<CommunityComment[]> {
  const response = await api.get<
    CommunityComment[] | PaginatedResponse<CommunityComment>
  >(`/community/posts/${postId}/comments/`);

  return Array.isArray(response.data)
    ? response.data
    : response.data.results;
}

export async function createComment(
  postId: number,
  content: string
): Promise<CommunityComment> {
  const response = await api.post<CommunityComment>(
    `/community/posts/${postId}/comments/`,
    { content }
  );

  return response.data;
}

export async function likePost(
  postId: number
): Promise<void> {
  await api.post(`/community/posts/${postId}/like/`);
}

export async function unlikePost(
  postId: number
): Promise<void> {
  await api.delete(`/community/posts/${postId}/like/`);
}
