import { PageCard } from "@/components/layout/page-card";
import { createClient } from "@/lib/supabase/server";
import { createCompanyAction, createJobAction } from "@/app/dashboard/jobs/actions";
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
    .select("id, name")
    .eq("owner_id", user?.id ?? "");

  const companyOptions = companies ?? [];

  if (companyOptions.length === 0) {
    return (
      <PageCard
        title="Create your first company"
        description="You need a company profile before creating jobs."
      >
        <form action={createCompanyAction} className="max-w-md space-y-3">
          {params.error ? (
            <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {params.error}
            </p>
          ) : null}
          <label className="block text-sm">
            Company name
            <input
              name="name"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              required
            />
          </label>
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Create company
          </button>
        </form>
      </PageCard>
    );
  }

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
