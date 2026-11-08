import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { user } = useAuth();

  return (
    <div>
      <h1>My Profile</h1>
      <p>Username: {user?.username}</p>
      <p>Email: {user?.email}</p>
    </div>
  );
}