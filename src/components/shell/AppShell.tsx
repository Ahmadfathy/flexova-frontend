import { Outlet } from "react-router-dom";
import { useAppearance } from "@/stores/appearance";
import { Sidebar } from "./Sidebar";
import { SidebarSplit } from "./SidebarSplit";
import { Topbar } from "./Topbar";
import { GlobalCreateModals } from "./GlobalCreateModals";

export function AppShell() {
  const { layout } = useAppearance();

  return (
    <div className="app">
      {/* hidden sm:contents — hides the nav entirely on mobile (no ghost row);
          display:contents dissolves the wrapper so the <aside> participates
          directly in the grid on desktop without an extra grid item. */}
      {layout === "sidebar"       && <div className="hidden sm:contents"><Sidebar /></div>}
      {layout === "sidebar-split" && <div className="hidden sm:contents"><SidebarSplit /></div>}
      <Topbar />
      <main className="[grid-area:main] overflow-auto p-6 bg-background">
        <Outlet />
      </main>
      {/* Global create dispatcher — mounts the active create modal/drawer
          over whatever page is showing, so it never forces navigation. */}
      <GlobalCreateModals />
    </div>
  );
}
