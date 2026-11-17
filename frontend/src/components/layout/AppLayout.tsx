import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

export default function AppLayout() {
  return (
    <div className="app-shell">
      <Navbar />
      <div className="app-content">
        <Outlet />
      </div>
    </div>
  );
}
