/* eslint-disable @next/next/no-html-link-for-pages -- these are route handlers that redirect off-site to the provider. A client-side <Link> transition would try to fetch them as RSC payloads. */
import { buttonVariants } from "@/components/ui/button";

export function SocialButtons() {
  return (
    <div className="grid gap-2">
      <a
        href="/api/auth/oauth/google"
        className={buttonVariants({ variant: "outline", className: "w-full" })}
      >
        Continue with Google
      </a>
      <a
        href="/api/auth/oauth/github"
        className={buttonVariants({ variant: "outline", className: "w-full" })}
      >
        Continue with GitHub
      </a>
    </div>
  );
}
