import { PageCard } from "@/components/layout/page-card";
import { createClient } from "@/lib/supabase/server";
import { updateJobAction } from "@/app/(product)/dashboard/jobs/actions";
import { JobForm } from "@/components/jobs/job-form";

type EditJobPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function EditJobPage({ params, searchParams }: EditJobPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: companies }, { data: job }] = await Promise.all([
    supabase.from("companies").select("id, name").eq("owner_id", user?.id ?? ""),
    supabase
      .from("jobs")
      .select(
        "id, company_id, title, role_category, location_country, location_city, remote_type, hybrid_office_days_per_week, employment_type, seniority, salary_min, salary_max, salary_currency, summary, responsibilities, requirements, nice_to_haves, benefits, skills, screening_threshold, logo_storage_path",
      )
      .eq("id", id)
      .single(),
  ]);

  if (!job) {
    return <PageCard title="Job not found" description="Unable to load job for editing." />;
  }

  return (
    <PageCard title="Edit job" description="Update your role details and save changes.">
      <JobForm
        companies={companies ?? []}
        action={updateJobAction}
        defaultValues={job}
        existingLogoPath={job.logo_storage_path}
        submitLabel="Save changes"
        error={query.error}
      />
    </PageCard>
  );
}
