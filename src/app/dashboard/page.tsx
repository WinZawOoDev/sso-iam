import type { Metadata } from "next";
import { Activity, CreditCard, TrendingUp, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Overview" };

// Placeholder numbers. Replace with real data from your own data layer.
const stats = [
  { title: "Total users", value: "2,350", icon: Users, change: "+12% from last month" },
  { title: "Active sessions", value: "1,204", icon: Activity, change: "+4% from last week" },
  { title: "Revenue", value: "$45,231", icon: CreditCard, change: "+20% from last month" },
  { title: "Conversion rate", value: "3.2%", icon: TrendingUp, change: "+0.4% from last month" },
];

const activity = [
  { id: 1, text: "New user registered", time: "2 minutes ago" },
  { id: 2, text: "Password changed for jane@example.com", time: "1 hour ago" },
  { id: 3, text: "New sign-in from an unrecognized device", time: "3 hours ago" },
  { id: 4, text: "Role updated to Admin", time: "Yesterday" },
];

export default function DashboardPage() {
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">Sample data shown for layout purposes.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription>{stat.title}</CardDescription>
              <stat.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>Latest events across your workspace</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {activity.map((item) => (
              <li key={item.id} className="flex items-center justify-between py-3 text-sm">
                <span>{item.text}</span>
                <span className="text-muted-foreground">{item.time}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
