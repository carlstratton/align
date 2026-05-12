import Link from "next/link";
import { PageCard } from "@/components/layout/page-card";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { hasPublicEnv } from "@/lib/env";

type RecruiterJobApplicationCounts = {
  id: string;
  title: string;
  status: string;
  applications: { status: string }[] | null;
};

function countByStatus(applications: { status: string }[] | null, status: string) {
  return (applications ?? []).filter((application) => application.status === status).length;
}

export default async function DashboardApplicationsPage() {
  if (!hasPublicEnv()) {
    return (
      <PageCard
        title="Applications"
        description="Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to load application data."
      />
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("jobs")
    .select("id, title, status, applications(status)")
    .eq("recruiter_id", user?.id ?? "")
    .order("updated_at", { ascending: false });

  const jobs = (data ?? []) as unknown as RecruiterJobApplicationCounts[];

  return (
    <PageCard
      title="Applications"
      description="Applications for jobs you posted, with quick pass/review/reject counts."
    >
      <div className="mb-4">
        <Button asChild variant="outline" size="xs">
          <Link href="/dashboard/scoring-profiles">Manage scoring profiles</Link>
        </Button>
      </div>
      <div className="space-y-3">
        {jobs.map((job) => {
          const total = (job.applications ?? []).length;
          const pass = countByStatus(job.applications, "pass");
          const review = countByStatus(job.applications, "review");
          const reject = countByStatus(job.applications, "reject");

          return (
            <Link
              key={job.id}
              href={`/dashboard/jobs/${job.id}/applications`}
              className="block rounded-md border border-border bg-card p-4 hover:bg-muted/60"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{job.title}</p>
                <Badge variant={job.status === "published" ? "default" : "outline"}>{job.status}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-700">
                <span>Total: {total}</span>
                <span>Above threshold: {pass}</span>
                <span>Needs review: {review}</span>
                <span>Below threshold: {reject}</span>
              </div>
            </Link>
          );
        })}
      </div>
      {jobs.length === 0 ? (
        <p className="text-sm text-slate-600">No job applications yet for your posted jobs.</p>
      ) : null}
    </PageCard>
  );
}
