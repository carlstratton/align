import Link from "next/link";
import { PageCard } from "@/components/layout/page-card";
import { createClient } from "@/lib/supabase/server";
import { setJobStatusAction } from "@/app/(product)/dashboard/jobs/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TypographyP } from "@/components/ui/typography";
import { JobPublishedDialog } from "@/components/jobs/job-published-dialog";

type JobDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; published?: string }>;
};

export default async function JobDetailPage({ params, searchParams }: JobDetailPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: job } = await supabase
    .from("jobs")
    .select(
      "id, title, slug, status, role_category, summary, screening_threshold, updated_at, published_at, closed_at",
    )
    .eq("id", id)
    .single();

  if (!job) {
    return <PageCard title="Job not found" description="This job does not exist or you do not have access." />;
  }

  return (
    <PageCard title={job.title} description="">
      {query.published === "true" && job.slug ? (
        <JobPublishedDialog jobTitle={job.title} jobSlug={job.slug} />
      ) : null}
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
      <TypographyP className="text-sm text-foreground [&:not(:first-child)]:mt-0">{job.summary}</TypographyP>
      <div className="mt-3 space-y-1 text-sm text-muted-foreground">
        <TypographyP className="text-sm [&:not(:first-child)]:mt-0">Role category: {job.role_category}</TypographyP>
        <TypographyP className="text-sm [&:not(:first-child)]:mt-0">Threshold: {job.screening_threshold}</TypographyP>
        <TypographyP className="text-sm [&:not(:first-child)]:mt-0">
          Updated: {new Date(job.updated_at).toLocaleString()}
        </TypographyP>
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
