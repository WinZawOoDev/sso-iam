import { Suspense } from "react";
import { DashboardShell } from "@/components/dashboard/shell";

// The session is read inside DashboardShell, so it sits behind this Suspense
// boundary (required by Cache Components) and doesn't block the static shell.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Loading...
        </div>
      }
    >
      <DashboardShell>{children}</DashboardShell>
    </Suspense>
  );
}
