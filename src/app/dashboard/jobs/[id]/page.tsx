import Link from "next/link";
import { PageCard } from "@/components/layout/page-card";
import { createClient } from "@/lib/supabase/server";
import { setJobStatusAction } from "@/app/dashboard/jobs/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type JobDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function JobDetailPage({ params, searchParams }: JobDetailPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: job } = await supabase
    .from("jobs")
    .select(
      "id, title, status, role_category, summary, screening_threshold, updated_at, published_at, closed_at",
    )
    .eq("id", id)
    .single();

  if (!job) {
    return <PageCard title="Job not found" description="This job does not exist or you do not have access." />;
  }

  return (
    <PageCard title={job.title} description="">
      {query.error ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {query.error}
        </p>
      ) : null}
      <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
        <Badge variant={job.status === "published" ? "default" : job.status === "closed" ? "destructive" : "outline"}>
          {job.status}
        </Badge>
        <span>Updated {new Date(job.updated_at).toLocaleString()}</span>
      </div>
      <p className="text-sm text-slate-700">{job.summary}</p>
      <div className="mt-3 text-sm text-slate-600">
        <p>Role category: {job.role_category}</p>
        <p>Threshold: {job.screening_threshold}</p>
        <p>Updated: {new Date(job.updated_at).toLocaleString()}</p>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button asChild>
          <Link href={`/dashboard/jobs/${id}/applications`}>View applications</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/dashboard/jobs/${id}/edit`}>Edit job</Link>
        </Button>
        {job.status !== "published" ? (
          <form action={setJobStatusAction}>
            <input type="hidden" name="job_id" value={id} />
            <input type="hidden" name="status" value="published" />
            <Button type="submit">Publish</Button>
          </form>
        ) : null}
        {job.status !== "closed" ? (
          <form action={setJobStatusAction}>
            <input type="hidden" name="job_id" value={id} />
            <input type="hidden" name="status" value="closed" />
            <Button
              type="submit"
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              Close job
            </Button>
          </form>
        ) : (
          <form action={setJobStatusAction}>
            <input type="hidden" name="job_id" value={id} />
            <input type="hidden" name="status" value="published" />
            <Button type="submit" variant="outline">
              Reopen
            </Button>
          </form>
        )}
      </div>
    </PageCard>
  );
}
