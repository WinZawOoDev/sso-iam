import { redirect } from "next/navigation";

// The proxy already handles "/". This is a fallback for the route itself.
export default function HomePage() {
  redirect("/login");
}
