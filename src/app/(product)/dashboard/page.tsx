import Link from "next/link";
import { PageCard } from "@/components/layout/page-card";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { TypographyP } from "@/components/ui/typography";
import { isAdminEmail } from "@/lib/auth-admin";
import { hasPublicEnv } from "@/lib/env";

export default async function DashboardPage() {
  if (!hasPublicEnv()) {
    return (
      <PageCard
        title="Recruiter dashboard"
        description="Set Supabase env vars to enable authenticated dashboard data."
      />
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdmin = isAdminEmail(user?.email);

  return (
    <PageCard
      title="Recruiter dashboard"
      description="Track jobs, applications, screening outcomes, and interview invites from here."
      className="max-w-md"
    >
      <TypographyP className="text-sm [&:not(:first-child)]:mt-0">
        Signed in as <span className="font-medium text-foreground">{user?.email ?? "unknown user"}</span>.
      </TypographyP>
      <div className="mt-4">
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/availability">Manage availability</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/scoring-profiles">Tune scoring profiles</Link>
          </Button>
          {isAdmin ? (
            <Button asChild variant="outline">
              <Link href="/auth/signup">Add user</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </PageCard>
  );
}
