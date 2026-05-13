import Link from "next/link";
import { PageCard } from "@/components/layout/page-card";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TypographyLarge, TypographyMuted } from "@/components/ui/typography";

export default async function DashboardJobsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title, status, updated_at")
    .eq("recruiter_id", user?.id ?? "")
    .order("updated_at", { ascending: false });

  return (
    <PageCard title="Jobs" description="Create, publish, and manage structured role specifications.">
      <div className="mb-4">
        <Button asChild>
          <Link href="/dashboard/jobs/new">Create new job</Link>
        </Button>
      </div>
      <div className="space-y-2">
        {(jobs ?? []).map((job) => (
          <Link
            key={job.id}
            href={`/dashboard/jobs/${job.id}`}
            className="block rounded-md border border-border bg-card p-3 hover:bg-muted/70"
          >
            <div className="flex items-center justify-between gap-2">
              <TypographyLarge className="text-base font-medium">{job.title}</TypographyLarge>
              <Badge variant={job.status === "published" ? "default" : job.status === "closed" ? "destructive" : "outline"}>
                {job.status}
              </Badge>
            </div>
            <TypographyMuted className="mt-1 text-xs">{`Updated ${new Date(job.updated_at).toLocaleString()}`}</TypographyMuted>
          </Link>
        ))}
        {jobs?.length === 0 ? (
          <TypographyMuted className="text-foreground/80">No jobs yet. Create your first role.</TypographyMuted>
        ) : null}
      </div>
    </PageCard>
  );
}
