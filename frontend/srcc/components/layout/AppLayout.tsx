
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import PageContainer from "../ui/PageContainer";
import GuestBanner from "./GuestBanner";

export default function AppLayout() {
  return (
    <div className="app-shell">
      <Navbar />

      <main className="app-content">
        <PageContainer>
          <GuestBanner />
          <Outlet />
        </PageContainer>
      </main>
    </div>
  );
}
