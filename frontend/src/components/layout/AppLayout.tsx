import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import PageContainer from "../ui/PageContainer";

export default function AppLayout() {
  return (
    <div className="app-shell">
      <Navbar />

      <main className="app-content">
        <PageContainer>
          <Outlet />
        </PageContainer>
      </main>
    </div>
  );
}

