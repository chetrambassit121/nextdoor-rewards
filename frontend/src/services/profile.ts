import { api } from "./api";

export interface UserProfile {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
}

export type UpdateProfileData = Partial<
  Pick<UserProfile, "first_name" | "last_name" | "email">
>;

// GET: Retrieve the authenticated user's profile
export async function getUserProfile(): Promise<UserProfile> {
  const { data } = await api.get<UserProfile>("/auth/profile/");
  return data;
}

// PATCH: Update the authenticated user's profile
export async function updateUserProfile(
  updates: UpdateProfileData
): Promise<UserProfile> {
  const { data } = await api.patch<UserProfile>(
    "/auth/profile/",
    updates
  );

  return data;
}

// What this code does
// Function	Purpose
// UserProfile	TypeScript interface matching your Django serializer
// UpdateProfileData	Allows updating one or more editable fields
// getUserProfile()	Fetches the logged-in user's profile
// updateUserProfile()	Saves profile changes using PATCH