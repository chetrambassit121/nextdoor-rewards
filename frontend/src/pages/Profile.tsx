
import { useEffect, useState, type FormEvent } from "react";
import axios from "axios";

import {
  getUserProfile,
  updateUserProfile,
  type UserProfile,
} from "../services/profile";

export default function Profile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    async function fetchProfile() {
      try {
        const data = await getUserProfile();

        if (active) {
          setProfile(data);
          setFirstName(data.first_name);
          setLastName(data.last_name);
          setEmail(data.email);
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

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (saving) return;

    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const updatedProfile = await updateUserProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
      });

      setProfile(updatedProfile);
      setFirstName(updatedProfile.first_name);
      setLastName(updatedProfile.last_name);
      setEmail(updatedProfile.email);

      setSuccess("Profile updated successfully!");
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 400) {
        const details = err.response.data as Record<string, unknown>;
        const messages = Object.values(details).flat().map(String);
        setError(messages.join(" ") || "Invalid profile information.");
      } else {
        setError("Failed to update profile. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p>Loading profile...</p>;
  }

  if (!profile) {
    return <p role="alert">{error || "No profile found."}</p>;
  }

  return (
    <div>
      <h1>My Profile</h1>

      <p>
        <strong>Username:</strong> {profile.username}
      </p>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="firstName">First Name</label>
          <input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="lastName">Last Name</label>
          <input
            id="lastName"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>

      {error && <p role="alert">{error}</p>}
      {success && <p role="status">{success}</p>}
    </div>
  );
}

// Understand the React code
// Here are the important additions:
// Code	Purpose
// useState()	Stores editable form values
// setFirstName()	Updates first-name input
// setLastName()	Updates last-name input
// setEmail()	Updates email input
// handleSubmit()	Handles form submission
// e.preventDefault()	Prevents page reload
// updateUserProfile()	Sends PATCH request to Django
// setSaving()	Prevents repeated submissions
// setSuccess()	Displays confirmation
// setError()	Displays API or validation errors

// Notice that we aren't allowing users to edit their username. Your Django serializer already defines username as read-only.