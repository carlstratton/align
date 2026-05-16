import { PageCard } from "@/components/layout/page-card";
import { createClient } from "@/lib/supabase/server";
import { createJobAction } from "@/app/(product)/dashboard/jobs/actions";
import { JobPillBuilder } from "@/components/jobs/job-pill-builder";

type NewJobPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function NewJobPage({ searchParams }: NewJobPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, logo_storage_path, about")
    .eq("owner_id", user?.id ?? "");

  const companyOptions = companies ?? [];

  return (
    <PageCard
      title="Create job"
      description="Select keyword pills, generate a unique AI draft, then edit and publish."
    >
      <JobPillBuilder
        companies={companyOptions}
        createAction={createJobAction}
        error={params.error}
      />
    </PageCard>
  );
}
