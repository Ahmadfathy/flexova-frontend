import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppShell } from "@/components/shell/AppShell";
import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/patterns/Skeletons";

const DashboardPage = lazy(() => import("@/features/dashboard/DashboardPage"));

function PageFallback() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
      {label} — قريباً
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route
            index
            element={
              <Suspense fallback={<PageFallback />}>
                <DashboardPage />
              </Suspense>
            }
          />
          <Route path="/inventory"   element={<ComingSoon label="المخزون" />} />
          <Route path="/sales"       element={<ComingSoon label="المبيعات" />} />
          <Route path="/purchasing"  element={<ComingSoon label="المشتريات" />} />
          <Route path="/customers"   element={<ComingSoon label="العملاء" />} />
          <Route path="/accounting"  element={<ComingSoon label="الحسابات" />} />
          <Route path="/hr"          element={<ComingSoon label="الموارد البشرية" />} />
          <Route path="/reports"     element={<ComingSoon label="التقارير" />} />
          <Route path="/permissions" element={<ComingSoon label="الصلاحيات" />} />
          <Route path="/settings"    element={<ComingSoon label="الإعدادات" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
