import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-muted/40 px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2 font-semibold">
        <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <LayoutDashboard className="size-4" />
        </span>
        SSO IAM Dashboard
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
