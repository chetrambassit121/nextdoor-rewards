import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RegisteredUserRoute() {
  const { user, loading, isGuest } = useAuth();
  if (loading) return <p>Checking authentication...</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (isGuest) return <Navigate to="/profile" replace />;
  return <Outlet />;
}
