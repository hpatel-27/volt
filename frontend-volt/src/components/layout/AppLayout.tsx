import { Outlet } from "react-router";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { TopBar } from "./TopBar";

export function AppLayout() {
  return (
    <div className="min-h-dvh flex bg-ink-950 text-bone-50">
      <Sidebar />
      <main className="flex-1 min-w-0 pb-20 md:pb-0">
        <TopBar />
        <div className="mx-auto w-full max-w-5xl px-4 md:px-8 py-6 md:py-10">
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
