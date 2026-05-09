import Link from "next/link";
import { logoutAction } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { hasPublicEnv } from "@/lib/env";

export async function AuthNav() {
  if (!hasPublicEnv()) {
    return (
      <>
        <Link href="/auth/login">Login</Link>
        <Link href="/auth/signup">Sign up</Link>
      </>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <>
        <Link href="/auth/login">Login</Link>
        <Link href="/auth/signup">Sign up</Link>
      </>
    );
  }

  return (
    <>
      <Link href="/dashboard">Dashboard</Link>
      <Link href="/dashboard/jobs">Jobs</Link>
      <Link href="/dashboard/applications">Applications</Link>
      <Link href="/dashboard/availability">Availability</Link>
      <form action={logoutAction}>
        <button type="submit" className="cursor-pointer">
          Logout
        </button>
      </form>
    </>
  );
}
