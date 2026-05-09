import Link from "next/link";
import { PageCard } from "@/components/layout/page-card";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type PublicJobListItem = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  role_category: string | null;
  location_city: string | null;
  location_country: string | null;
  remote_type: string;
  employment_type: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  created_at: string;
  companies: { name: string } | null;
};

export default async function PublicJobsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("jobs")
    .select(
      "id, slug, title, summary, role_category, location_city, location_country, remote_type, employment_type, salary_min, salary_max, salary_currency, created_at, companies(name)",
    )
    .eq("status", "published")
    .order("created_at", { ascending: false });

  const jobs = (data ?? []) as unknown as PublicJobListItem[];

  return (
    <PageCard title="Open roles" description="Browse currently published opportunities.">
      <div className="space-y-3">
        {jobs.map((job) => (
          <article key={job.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold">{job.title}</h2>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline">{job.remote_type}</Badge>
                <Badge variant="outline">{job.employment_type}</Badge>
              </div>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {job.companies?.name ?? "Company"} • {job.location_city ?? "City"},{" "}
              {job.location_country ?? "Country"}
            </p>
            {job.summary ? <p className="mt-2 text-sm text-foreground">{job.summary}</p> : null}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {job.salary_currency ?? "GBP"} {job.salary_min ?? 0} - {job.salary_max ?? 0}
              </p>
              <Button asChild size="sm">
                <Link href={`/jobs/${job.slug}`}>View job</Link>
              </Button>
            </div>
          </article>
        ))}
        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No published jobs are available right now.</p>
        ) : null}
      </div>
    </PageCard>
  );
}
