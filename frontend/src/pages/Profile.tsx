import { useEffect, useState } from "react";
import { getUserProfile, type UserProfile } from "../services/profile";

export default function Profile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function fetchProfile() {
      try {
        const data = await getUserProfile();

        if (active) {
          setProfile(data);
        }
      } catch {
        if (active) {
          setError("Failed to load user profile.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void fetchProfile();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <p>Loading profile...</p>;
  }

  if (error) {
    return <p role="alert">{error}</p>;
  }

  if (!profile) {
    return <p>No profile found.</p>;
  }

  return (
    <div>
      <h1>My Profile</h1>

      <p><strong>ID:</strong> {profile.id}</p>
      <p><strong>Username:</strong> {profile.username}</p>
      <p><strong>First Name:</strong> {profile.first_name}</p>
      <p><strong>Last Name:</strong> {profile.last_name}</p>
      <p><strong>Email:</strong> {profile.email}</p>
    </div>
  );
}


// How it works
// Code	Purpose
// useEffect()	Fetches profile when component mounts
// getUserProfile()	Calls Django's /api/auth/profile/
// useState()	Stores profile, loading, and error
// setProfile(data)	Saves the API response
// profile.first_name	Displays the first name
// active	Prevents state updates after cleanup