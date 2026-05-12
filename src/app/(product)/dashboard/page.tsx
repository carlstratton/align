import Link from "next/link";
import { PageCard } from "@/components/layout/page-card";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
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

  return (
    <PageCard
      title="Recruiter dashboard"
      description="Track jobs, applications, screening outcomes, and interview invites from here."
      className="max-w-md"
    >
      <p className="text-sm text-slate-600">
        Signed in as <span className="font-medium">{user?.email ?? "unknown user"}</span>.
      </p>
      <div className="mt-4">
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/availability">Manage availability</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/scoring-profiles">Tune scoring profiles</Link>
          </Button>
        </div>
      </div>
    </PageCard>
  );
}
