import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductBreadcrumbs } from "@/components/layout/product-breadcrumbs";
import { getListingLogoPublicUrl } from "@/lib/listing-logo";
import { formatJobPostedLabel, formatSalaryRangeLabel, formatEmploymentType, formatRemoteType } from "@/lib/format-job-listing";
import { getPublicEnv } from "@/lib/env";
import { getPublishedJobsForBoard } from "@/lib/jobs/published-queries";

type PublicJobListItem = {
  id: string;
  slug: string;
  title: string;
  location_city: string | null;
  location_country: string | null;
  remote_type: string;
  hybrid_office_days_per_week: number | null;
  employment_type: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  logo_storage_path: string | null;
  created_at: string;
  published_at: string | null;
  companies: { name: string; logo_storage_path: string | null } | null;
};

function workArrangementLabel(job: PublicJobListItem): string {
  if (job.remote_type === "hybrid") {
    const d = job.hybrid_office_days_per_week;
    if (typeof d === "number" && d > 0) {
      return `Hybrid · ${d} ${d === 1 ? "day" : "days"} in office`;
    }
  }
  return formatRemoteType(job.remote_type);
}

export default async function PublicJobsPage() {
  const { NEXT_PUBLIC_SUPABASE_URL } = getPublicEnv();
  const { jobs: rawJobs, error } = await getPublishedJobsForBoard();
  const jobs = rawJobs as unknown as PublicJobListItem[];

  return (
    <div className="w-full">
      <ProductBreadcrumbs items={[{ label: "Home", href: "/" }, { label: "Open Roles" }]} />

      <h1 className="mt-20 lg:mt-10 text-[26px] font-medium leading-none tracking-tight text-black lg:text-[40px]">Open Roles</h1>

      {process.env.NODE_ENV === "development" && error ? (
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          <strong>Open roles query failed (dev):</strong> {error.message}. If the list is empty, run
          SQL migration <code className="rounded bg-amber-100 px-1">20260514140000_public_job_board_rls.sql</code>{" "}
          in Supabase, or set <code className="rounded bg-amber-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code> in{" "}
          <code className="rounded bg-amber-100 px-1">.env.local</code> for local development.
        </p>
      ) : null}

      <div className="mt-10">
        {jobs.length === 0 ? (
          <p className="text-[18px] font-medium leading-[23px] text-muted-foreground">
            No published jobs are available right now.
          </p>
        ) : (
          <ul className="divide-y divide-border border-b border-border">
            {jobs.map((job) => {
              const companyName = job.companies?.name ?? "Company";
              const city = job.location_city ?? "City";
              const country = job.location_country ?? "Country";
              const postedAt = job.published_at ?? job.created_at;
              const postedLabel = formatJobPostedLabel(postedAt);
              const salaryLabel = [
                formatSalaryRangeLabel(job.salary_currency, job.salary_min, job.salary_max),
                postedLabel,
              ]
                .filter(Boolean)
                .join(" • ");

              const logoUrl = getListingLogoPublicUrl(
                NEXT_PUBLIC_SUPABASE_URL,
                job.logo_storage_path,
                job.companies?.logo_storage_path ?? null,
              );

              const badgeClass =
                "h-auto rounded-md border border-black px-2 py-0.5 text-[12px] font-medium leading-4 text-black";

              return (
                <li key={job.id} className="flex flex-wrap items-center gap-6 py-8 lg:flex-nowrap lg:gap-8">
                  <div className="order-1 shrink-0">
                    <Link
                      href={`/jobs/${job.slug}`}
                      className="inline-block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      aria-label={`View ${job.title}`}
                    >
                      {logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={logoUrl}
                          alt=""
                          width={90}
                          height={90}
                          className="size-[90px] rounded-lg border border-border object-cover"
                        />
                      ) : (
                        <div className="size-[90px] rounded-lg bg-muted" aria-hidden />
                      )}
                    </Link>
                  </div>

                  <div className="order-3 min-w-0 flex-1 lg:order-2">
                    <h2 className="text-[26px] font-medium leading-none text-black">{job.title}</h2>
                    <p className="mt-2 text-[18px] font-medium leading-[23px] text-muted-foreground">
                      {companyName} • {city}, {country}
                      {salaryLabel ? ` • ${salaryLabel}` : ""}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="outline" className={badgeClass}>
                        {workArrangementLabel(job)}
                      </Badge>
                      <Badge variant="outline" className={badgeClass}>
                        {formatEmploymentType(job.employment_type)}
                      </Badge>
                    </div>
                  </div>

                  <div className="order-4 w-full shrink-0 lg:order-3 lg:w-auto lg:justify-self-end">
                    <Button asChild size="lg" className="w-full rounded-md bg-black px-8 text-white hover:bg-black/90 lg:w-auto">
                      <Link href={`/jobs/${job.slug}`}>View</Link>
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
