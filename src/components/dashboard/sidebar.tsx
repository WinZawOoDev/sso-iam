"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Settings, ShieldCheck, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { title: string; href: string; icon: LucideIcon };

const mainItems: NavItem[] = [
  { title: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { title: "Settings", href: "/dashboard/settings", icon: Settings },
];

const adminItems: { item: NavItem; key: "users" | "roles" }[] = [
  { item: { title: "Users", href: "/dashboard/admin/users", icon: Users }, key: "users" },
  { item: { title: "Roles", href: "/dashboard/admin/roles", icon: ShieldCheck }, key: "roles" },
];

// Visibility is decided on the server from permissions. Hiding a link is only
// a convenience: the pages and actions enforce the same checks.
export function Sidebar({ canViewUsers, canViewRoles }: { canViewUsers: boolean; canViewRoles: boolean }) {
  const pathname = usePathname();
  const allowed = { users: canViewUsers, roles: canViewRoles };
  const visibleAdmin = adminItems.filter((entry) => allowed[entry.key]).map((entry) => entry.item);

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="flex shrink-0 flex-col gap-6 border-b bg-background p-4 md:w-60 md:border-b-0 md:border-r">
      <Link href="/dashboard" className="flex items-center gap-2 px-2 font-semibold">
        <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <LayoutDashboard className="size-4" />
        </span>
        SSO IAM
      </Link>

      <nav className="flex flex-col gap-1">
        <div className="flex gap-1 md:flex-col">
          {mainItems.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href)} />
          ))}
        </div>

        {visibleAdmin.length > 0 ? (
          <div className="mt-4 flex flex-col gap-1">
            <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Administration
            </p>
            <div className="flex gap-1 md:flex-col">
              {visibleAdmin.map((item) => (
                <NavLink key={item.href} item={item} active={isActive(item.href)} />
              ))}
            </div>
          </div>
        ) : null}
      </nav>
    </aside>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
      )}
    >
      <item.icon className="size-4" />
      {item.title}
    </Link>
  );
}
