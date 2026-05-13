import { PageCard } from "@/components/layout/page-card";
import { createClient } from "@/lib/supabase/server";
import { submitApplicationAction } from "@/app/(product)/jobs/[slug]/apply/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Vercel/serverless: allow CV screening (often 30–90s) before the request is killed. Requires Pro for >60s on many plans. */
export const maxDuration = 300;

type ApplyPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
};

export default async function ApplyPage({ params, searchParams }: ApplyPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: job } = await supabase
    .from("jobs")
    .select("id, title, status, application_method")
    .eq("slug", slug)
    .single();

  if (!job || job.status !== "published") {
    return <PageCard title="Job unavailable" description="This job is not currently open for applications." />;
  }

  if (job.application_method !== "internal") {
    return (
      <PageCard
        title={`Apply: ${job.title}`}
        description="This role uses an external application flow managed by the employer."
      />
    );
  }

  return (
    <PageCard
      title={`Apply: ${job.title}`}
      description="Submit your details and CV to apply for this role."
    >
      <form action={submitApplicationAction} className="max-w-2xl space-y-4">
        <input type="hidden" name="slug" value={slug} />
        {query.error ? (
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {query.error}
          </p>
        ) : null}
        {query.success ? (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            Application submitted successfully. A recruiter will review your profile.
          </p>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="apply-name">Full name</Label>
            <Input id="apply-name" name="name" required className="w-full" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apply-email">Email</Label>
            <Input id="apply-email" name="email" type="email" required className="w-full" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="apply-phone">Phone (optional)</Label>
          <Input id="apply-phone" name="phone" className="w-full" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="apply-cv">Upload CV (PDF or DOCX, max 3MB)</Label>
          <input
            id="apply-cv"
            name="cv"
            type="file"
            required
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <label className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <input name="consent" type="checkbox" required className="mt-0.5" />
          <span>
            I understand that this application may be assessed using AI-assisted
            screening. A human recruiter remains responsible for hiring decisions.
            My CV and application data will be used to evaluate my fit for this role.
          </span>
        </label>
        <Button type="submit" className="w-full">
          Submit application
        </Button>
      </form>
    </PageCard>
  );
}
