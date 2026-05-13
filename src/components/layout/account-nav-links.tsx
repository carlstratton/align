import Link from "next/link";
import { logoutAction } from "@/app/(product)/auth/actions";
import { cn } from "@/lib/utils";

type AccountNavLinksProps = {
  className?: string;
  linkClassName?: string;
  signedIn: boolean;
};

export function AccountNavLinks({ className, linkClassName, signedIn }: AccountNavLinksProps) {
  const linkClass =
    linkClassName ?? cn("text-sm text-muted-foreground transition-colors hover:text-foreground");

  if (!signedIn) {
    return (
      <div className={className}>
        <Link href="/auth/login" className={linkClass}>
          Log in
        </Link>
        <Link href="/auth/signup" className={linkClass}>
          Sign up
        </Link>
      </div>
    );
  }

  return (
    <div className={className}>
      <Link href="/dashboard" className={linkClass}>
        Dashboard
      </Link>
      <Link href="/dashboard/jobs" className={linkClass}>
        Jobs
      </Link>
      <Link href="/dashboard/applications" className={linkClass}>
        Applications
      </Link>
      <Link href="/dashboard/availability" className={linkClass}>
        Availability
      </Link>
      <form action={logoutAction} className="inline-flex items-center">
        <button
          type="submit"
          className={`${linkClass} cursor-pointer border-0 bg-transparent p-0 font-inherit`}
        >
          Logout
        </button>
      </form>
    </div>
  );
}
