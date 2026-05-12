import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageCard } from "@/components/layout/page-card";

type PublicJobPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function PublicJobPage({ params }: PublicJobPageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: job } = await supabase
    .from("jobs")
    .select(
      "id, title, summary, role_category, location_country, location_city, remote_type, hybrid_office_days_per_week, employment_type, seniority, salary_min, salary_max, salary_currency, responsibilities, requirements, nice_to_haves, benefits, skills, status, application_method, external_apply_url, companies(name)",
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

  const salaryLabel =
    job.salary_min && job.salary_max
      ? `${job.salary_currency ?? ""} ${job.salary_min.toLocaleString()} – ${job.salary_max.toLocaleString()}`.trim()
      : null;

  const showHybridOfficeExpectation =
    job.remote_type === "hybrid" &&
    typeof job.hybrid_office_days_per_week === "number" &&
    job.hybrid_office_days_per_week > 0;

  const hybridOfficeSentence = showHybridOfficeExpectation
    ? `This is a hybrid role, with an expectation of ${job.hybrid_office_days_per_week} day${job.hybrid_office_days_per_week === 1 ? "" : "s"} per week in the office${
        job.location_city ? ` (${job.location_city})` : ""
      }.`
    : null;

  const applyButton =
    job.application_method === "internal" ? (
      <Button asChild size="lg">
        <Link href={`/jobs/${slug}/apply`}>Apply now</Link>
      </Button>
    ) : (
      <Button asChild size="lg">
        <a href={job.external_apply_url || "#"} target="_blank" rel="noreferrer">
          Apply on company site
        </a>
      </Button>
    );

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      {/* Full-width header */}
      <header className="mb-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight text-black">{job.title}</h1>
            <p className="text-base text-slate-600">
              {companyName}
              {job.location_city || job.location_country
                ? ` · ${[job.location_city, job.location_country].filter(Boolean).join(", ")}`
                : null}
            </p>
            <div className="mt-1 flex flex-wrap gap-2">
              {job.employment_type ? (
                <Badge variant="secondary">{job.employment_type}</Badge>
              ) : null}
              {job.remote_type ? (
                <Badge variant="secondary">{job.remote_type}</Badge>
              ) : null}
              {job.seniority ? (
                <Badge variant="secondary">{job.seniority}</Badge>
              ) : null}
            </div>
            {salaryLabel ? (
              <p className="text-sm font-medium text-slate-700">{salaryLabel}</p>
            ) : null}
          </div>
          <div className="shrink-0">{applyButton}</div>
        </div>
      </header>

      <Separator />

      {/* Two-column body */}
      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_300px]">

        {/* Left — role content */}
        <main className="flex flex-col gap-8">
          {job.summary ? (
            <p className="text-base leading-relaxed text-slate-700">{job.summary}</p>
          ) : null}
          {hybridOfficeSentence ? (
            <p className="text-base leading-relaxed text-slate-700">{hybridOfficeSentence}</p>
          ) : null}

          {job.responsibilities?.length ? (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-black">Responsibilities</h2>
              <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
                {job.responsibilities.map((item: string) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {job.requirements?.length ? (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-black">Requirements</h2>
              <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
                {job.requirements.map((item: string) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {job.nice_to_haves?.length ? (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-black">Nice to have</h2>
              <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
                {job.nice_to_haves.map((item: string) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </main>

        {/* Right — sidebar */}
        <aside className="flex flex-col gap-4">
          {/* Role meta card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-900">Role details</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm text-slate-700">
              {job.role_category ? (
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Category</span>
                  <span className="text-right font-medium">{job.role_category}</span>
                </div>
              ) : null}
              {job.seniority ? (
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Seniority</span>
                  <span className="text-right font-medium">{job.seniority}</span>
                </div>
              ) : null}
              {job.employment_type ? (
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Contract</span>
                  <span className="text-right font-medium">{job.employment_type}</span>
                </div>
              ) : null}
              {job.remote_type ? (
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Remote</span>
                  <span className="text-right font-medium">
                    {job.remote_type === "hybrid" &&
                    typeof job.hybrid_office_days_per_week === "number" &&
                    job.hybrid_office_days_per_week > 0
                      ? `Hybrid (${job.hybrid_office_days_per_week}d office)`
                      : job.remote_type}
                  </span>
                </div>
              ) : null}
              {salaryLabel ? (
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Salary</span>
                  <span className="text-right font-medium">{salaryLabel}</span>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Skills */}
          {job.skills?.length ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-900">Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((skill: string) => (
                    <span
                      key={skill}
                      className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Benefits */}
          {job.benefits?.length ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-900">Benefits</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-1.5 pl-4 text-sm text-slate-700">
                  {job.benefits.map((item: string) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {/* AI screening notice */}
          <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            This application uses AI-assisted screening. A human recruiter remains responsible for
            hiring decisions.
          </p>
        </aside>
      </div>
    </div>
  );
}
