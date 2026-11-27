import { api } from "./api";
import type { PublicUserProfile, PublicUserRewards } from "../types/users";

export async function getPublicUserProfile(id: number): Promise<PublicUserProfile> {
  const { data } = await api.get<PublicUserProfile>(`/users/${id}/`);
  return data;
}

export async function getPublicUserRewards(id: number): Promise<PublicUserRewards> {
  const { data } = await api.get<PublicUserRewards>(`/users/${id}/rewards/`);
  return data;
}
