import Link from "next/link";
import { PageCard } from "@/components/layout/page-card";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type PublicJobPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function PublicJobPage({ params }: PublicJobPageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: job } = await supabase
    .from("jobs")
    .select(
      "id, title, summary, role_category, location_country, location_city, remote_type, employment_type, seniority, salary_min, salary_max, salary_currency, responsibilities, requirements, nice_to_haves, benefits, skills, status, application_method, external_apply_url, companies(name)",
    )
    .eq("slug", slug)
    .single();

  if (!job || job.status !== "published") {
    return <PageCard title="Job not found" description="This role is no longer available." />;
  }

  const companyName =
    job.companies && typeof job.companies === "object" && "name" in job.companies
      ? String(job.companies.name)
      : "Company";

  return (
    <PageCard
      title={job.title}
      description={`${companyName} • ${job.location_city}, ${job.location_country}`}
    >
      <div className="mb-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <Badge variant="outline">{job.remote_type}</Badge>
        <Badge variant="outline">{job.employment_type}</Badge>
        <Badge variant="outline">{job.seniority}</Badge>
        <Badge variant="outline">{job.role_category}</Badge>
        <Badge variant="outline">
          {job.salary_currency} {job.salary_min} - {job.salary_max}
        </Badge>
      </div>
      <p className="mb-4 text-sm text-slate-700">{job.summary}</p>
      <section className="mb-4">
        <h3 className="mb-2 text-sm font-semibold">Responsibilities</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          {(job.responsibilities ?? []).map((item: string) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <section className="mb-4">
        <h3 className="mb-2 text-sm font-semibold">Requirements</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          {(job.requirements ?? []).map((item: string) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      {job.nice_to_haves?.length ? (
        <section className="mb-4">
          <h3 className="mb-2 text-sm font-semibold">Nice-to-haves</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            {job.nice_to_haves.map((item: string) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {job.benefits?.length ? (
        <section className="mb-4">
          <h3 className="mb-2 text-sm font-semibold">Benefits</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            {job.benefits.map((item: string) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {job.skills?.length ? (
        <section className="mb-4">
          <h3 className="mb-2 text-sm font-semibold">Skills</h3>
          <div className="flex flex-wrap gap-2">
            {job.skills.map((skill: string) => (
              <span key={skill} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs">
                {skill}
              </span>
            ))}
          </div>
        </section>
      ) : null}
      <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        This application uses AI-assisted screening. A human recruiter remains
        responsible for hiring decisions.
      </p>
      {job.application_method === "internal" ? (
        <Button asChild>
          <Link href={`/jobs/${slug}/apply`}>Apply</Link>
        </Button>
      ) : (
        <Button asChild>
          <a href={job.external_apply_url || "#"} target="_blank" rel="noreferrer">
            Apply on company site
          </a>
        </Button>
      )}
    </PageCard>
  );
}
