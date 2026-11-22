import { Navigate, Route, Routes } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Community from "./pages/Community";
import ChangePassword from "./pages/ChangePassword";
import RewardsDashboard from "./pages/RewardsDashboard";

import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";
import PublicUserProfile from "./pages/PublicUserProfile";

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Authenticated routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/community" element={<Community />} />
          <Route path="/rewards" element={<RewardsDashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route
            path="/users/:userId"
            element={<PublicUserProfile />}
          />
          <Route
            path="/change-password"
            element={<ChangePassword />}
          />

        </Route>
      </Route>

      <Route
        path="/"
        element={<Navigate to="/dashboard" replace />}
      />

      <Route
        path="*"
        element={<Navigate to="/dashboard" replace />}
      />
    </Routes>
  );
}
