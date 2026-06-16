import { Outlet } from "react-router-dom";
import { useAppearance } from "@/stores/appearance";
import { Sidebar } from "./Sidebar";
import { SidebarSplit } from "./SidebarSplit";
import { Topbar } from "./Topbar";

export function AppShell() {
  const { layout } = useAppearance();

  return (
    <div className="app">
      {layout === "sidebar"       && <Sidebar />}
      {layout === "sidebar-split" && <SidebarSplit />}
      <Topbar />
      <main className="[grid-area:main] overflow-auto p-6 bg-background">
        <Outlet />
      </main>
    </div>
  );
}
