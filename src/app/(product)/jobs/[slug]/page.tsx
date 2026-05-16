import Link from "next/link";
import { getPublishedJobDetailBySlug } from "@/lib/jobs/published-queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageCard } from "@/components/layout/page-card";
import { ProductBreadcrumbs } from "@/components/layout/product-breadcrumbs";
import { getPublicEnv } from "@/lib/env";
import { getListingLogoPublicUrl } from "@/lib/listing-logo";
import { formatEmploymentType, formatRemoteType, formatSeniority } from "@/lib/format-job-listing";
import {
  TypographyH1,
  TypographyH2,
  TypographyH4,
  TypographyList,
  TypographyListItem,
  TypographyMuted,
  TypographyP,
} from "@/components/ui/typography";
import { flattenJobListingItems } from "@/lib/jobs";

type PublicJobPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function PublicJobPage({ params }: PublicJobPageProps) {
  const { slug } = await params;
  const { job } = await getPublishedJobDetailBySlug(slug);

  if (!job || job.status !== "published") {
    return (
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <ProductBreadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Open Roles", href: "/jobs" },
            { label: "Job not found" },
          ]}
        />
        <PageCard title="Job not found" description="This role is no longer available." />
      </div>
    );
  }

  const { NEXT_PUBLIC_SUPABASE_URL } = getPublicEnv();
  const companyRecord =
    job.companies && typeof job.companies === "object"
      ? (job.companies as { name?: string; logo_storage_path?: string | null })
      : null;
  const companyName = companyRecord?.name ? String(companyRecord.name) : "Company";
  const logoUrl = getListingLogoPublicUrl(
    NEXT_PUBLIC_SUPABASE_URL,
    (job as unknown as { logo_storage_path?: string | null }).logo_storage_path ?? null,
    companyRecord?.logo_storage_path ?? null,
  );

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

  const jobRaw = job as unknown as {
    responsibilities?: string[];
    requirements?: string[];
    nice_to_haves?: string[];
    benefits?: string[];
    skills?: string[];
  };
  const responsibilities = flattenJobListingItems(jobRaw.responsibilities);
  const requirements = flattenJobListingItems(jobRaw.requirements);
  const niceToHaves = flattenJobListingItems(jobRaw.nice_to_haves);
  const benefits = flattenJobListingItems(jobRaw.benefits);
  const skills = flattenJobListingItems(jobRaw.skills);

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
      <ProductBreadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Open Roles", href: "/jobs" },
          { label: job.title },
        ]}
      />
      {/* Full-width header */}
      <header className="mb-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-start">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt=""
                width={90}
                height={90}
                className="size-[90px] shrink-0 rounded-lg border border-border object-cover"
              />
            ) : (
              <div className="size-[90px] shrink-0 rounded-lg bg-muted" aria-hidden />
            )}
            <div className="flex min-w-0 flex-col gap-2">
            <TypographyH1>{job.title}</TypographyH1>
            <TypographyP className="!mt-0 text-base text-muted-foreground">
              {companyName}
              {job.location_city || job.location_country
                ? ` · ${[job.location_city, job.location_country].filter(Boolean).join(", ")}`
                : null}
            </TypographyP>
            <div className="mt-1 flex flex-wrap gap-2">
              {job.employment_type ? (
                <Badge variant="secondary">{formatEmploymentType(job.employment_type)}</Badge>
              ) : null}
              {job.remote_type ? (
                <Badge variant="secondary">{formatRemoteType(job.remote_type)}</Badge>
              ) : null}
              {job.seniority ? (
                <Badge variant="secondary">{formatSeniority(job.seniority)}</Badge>
              ) : null}
            </div>
            {salaryLabel ? (
              <TypographyP className="!mt-0 text-sm font-medium">{salaryLabel}</TypographyP>
            ) : null}
            </div>
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
            <TypographyP className="text-base leading-relaxed">{job.summary}</TypographyP>
          ) : null}
          {hybridOfficeSentence ? (
            <TypographyP className="text-base leading-relaxed">{hybridOfficeSentence}</TypographyP>
          ) : null}

          {responsibilities.length ? (
            <section>
              <TypographyH2 className="mb-3 border-0 pb-0 text-lg sm:text-xl">Responsibilities</TypographyH2>
              <TypographyList className="my-0 ml-0 list-outside list-disc space-y-2 pl-5 text-sm leading-relaxed">
                {responsibilities.map((item, i) => (
                  <TypographyListItem key={`resp-${i}-${item.slice(0, 48)}`}>{item}</TypographyListItem>
                ))}
              </TypographyList>
            </section>
          ) : null}

          {requirements.length ? (
            <section>
              <TypographyH2 className="mb-3 border-0 pb-0 text-lg sm:text-xl">Requirements</TypographyH2>
              <TypographyList className="my-0 ml-0 list-outside list-disc space-y-2 pl-5 text-sm leading-relaxed">
                {requirements.map((item, i) => (
                  <TypographyListItem key={`req-${i}-${item.slice(0, 48)}`}>{item}</TypographyListItem>
                ))}
              </TypographyList>
            </section>
          ) : null}

          {niceToHaves.length ? (
            <section>
              <TypographyH2 className="mb-3 border-0 pb-0 text-lg sm:text-xl">Nice to have</TypographyH2>
              <TypographyList className="my-0 ml-0 list-outside list-disc space-y-2 pl-5 text-sm leading-relaxed">
                {niceToHaves.map((item, i) => (
                  <TypographyListItem key={`nice-${i}-${item.slice(0, 48)}`}>{item}</TypographyListItem>
                ))}
              </TypographyList>
            </section>
          ) : null}
        </main>

        {/* Right — sidebar */}
        <aside className="flex flex-col gap-4">
          {/* Role meta card */}
          <Card>
            <CardHeader className="pb-0">
              <TypographyH4>Role details</TypographyH4>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
              {job.role_category ? (
                <div className="flex justify-between gap-2">
                  <span>Category</span>
                  <span className="text-right font-medium text-foreground">{job.role_category}</span>
                </div>
              ) : null}
              {job.seniority ? (
                <div className="flex justify-between gap-2">
                  <span>Seniority</span>
                  <span className="text-right font-medium text-foreground">{formatSeniority(job.seniority)}</span>
                </div>
              ) : null}
              {job.employment_type ? (
                <div className="flex justify-between gap-2">
                  <span>Contract</span>
                  <span className="text-right font-medium text-foreground">{formatEmploymentType(job.employment_type)}</span>
                </div>
              ) : null}
              {job.remote_type ? (
                <div className="flex justify-between gap-2">
                  <span>Remote</span>
                  <span className="text-right font-medium text-foreground">
                    {job.remote_type === "hybrid" &&
                    typeof job.hybrid_office_days_per_week === "number" &&
                    job.hybrid_office_days_per_week > 0
                      ? `Hybrid (${job.hybrid_office_days_per_week}d in office)`
                      : formatRemoteType(job.remote_type)}
                  </span>
                </div>
              ) : null}
              {salaryLabel ? (
                <div className="flex justify-between gap-2">
                  <span>Salary</span>
                  <span className="text-right font-medium text-foreground">{salaryLabel}</span>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Skills */}
          {skills.length ? (
            <Card>
              <CardHeader className="pb-0">
                <TypographyH4>Skills</TypographyH4>
              </CardHeader>
              <CardContent>
                <TypographyList className="my-0 ml-0 list-outside list-disc space-y-1.5 pl-5 text-sm">
                  {skills.map((skill, i) => (
                    <TypographyListItem key={`skill-${i}-${skill.slice(0, 48)}`}>{skill}</TypographyListItem>
                  ))}
                </TypographyList>
              </CardContent>
            </Card>
          ) : null}

          {/* Benefits */}
          {benefits.length ? (
            <Card>
              <CardHeader className="pb-0">
                <TypographyH4>Benefits</TypographyH4>
              </CardHeader>
              <CardContent>
                <TypographyList className="my-0 ml-0 list-outside list-disc space-y-1.5 pl-5 text-sm">
                  {benefits.map((item, i) => (
                    <TypographyListItem key={`ben-${i}-${item.slice(0, 48)}`}>{item}</TypographyListItem>
                  ))}
                </TypographyList>
              </CardContent>
            </Card>
          ) : null}

          {/* AI screening notice */}
          <TypographyMuted className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            This application uses AI-assisted screening. A human recruiter remains responsible for
            hiring decisions.
          </TypographyMuted>
        </aside>
      </div>
    </div>
  );
}
