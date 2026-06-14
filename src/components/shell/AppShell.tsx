import { Outlet } from "react-router-dom";
import { useAppearance } from "@/stores/appearance";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { cn } from "@/lib/utils";

export function AppShell() {
  const { nav } = useAppearance();

  return (
    <div className="app">
      {nav === "vertical" && <Sidebar />}
      <Topbar />
      <main className="[grid-area:main] overflow-auto p-6 bg-background">
        <Outlet />
      </main>
    </div>
  );
}
