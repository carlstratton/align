import Link from "next/link";
import { PageCard } from "@/components/layout/page-card";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  activateScoringProfileAction,
  cloneScoringProfileAction,
  createScoringProfileAction,
} from "@/app/(product)/dashboard/scoring-profiles/actions";
import { listScoringProfiles } from "@/lib/screening/scoring-profiles";

type ScoringProfilesPageProps = {
  searchParams: Promise<{ error?: string; success?: string }>;
};

type AnalyticsRow = {
  prompt_version: string | null;
  decision_band: string;
  confidence_score: number | null;
};

export default async function ScoringProfilesPage({ searchParams }: ScoringProfilesPageProps) {
  const query = await searchParams;
  const profiles = await listScoringProfiles();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const { data: recruiterJobs } = await admin
    .from("jobs")
    .select("id")
    .eq("recruiter_id", user?.id ?? "");
  const jobIds = (recruiterJobs ?? []).map((job) => job.id);

  let analyticsRows: AnalyticsRow[] = [];
  if (jobIds.length) {
    const { data } = await admin
      .from("screening_results")
      .select("prompt_version, decision_band, confidence_score")
      .in("job_id", jobIds);
    analyticsRows = (data ?? []) as AnalyticsRow[];
  }

  const analytics = analyticsRows.reduce<Record<string, { total: number; pass: number; review: number; reject: number; confidenceAvg: number }>>(
    (acc, row) => {
      const key = row.prompt_version ?? "legacy-heuristic";
      const existing = acc[key] ?? { total: 0, pass: 0, review: 0, reject: 0, confidenceAvg: 0 };
      existing.total += 1;
      if (row.decision_band === "pass") existing.pass += 1;
      if (row.decision_band === "review") existing.review += 1;
      if (row.decision_band === "reject") existing.reject += 1;
      existing.confidenceAvg += row.confidence_score ?? 0;
      acc[key] = existing;
      return acc;
    },
    {},
  );

  return (
    <PageCard
      title="Scoring profiles"
      description="Create, clone, and activate versioned ranking algorithms for Claude screening."
    >
      <div className="mb-3">
        <Link href="/dashboard/applications" className="text-sm text-slate-700 underline underline-offset-2">
          Back to applications
        </Link>
      </div>
      {query.error ? (
        <p className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{query.error}</p>
      ) : null}
      {query.success ? (
        <p className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          Profile {query.success}.
        </p>
      ) : null}

      <section className="mb-6 space-y-3">
        <h3 className="text-sm font-semibold">Create profile version</h3>
        <form action={createScoringProfileAction} className="grid gap-3 rounded-md border border-slate-200 p-3 md:grid-cols-2">
          <label className="text-sm">
            Key
            <input name="key" required defaultValue="contextual-v2" className="mt-1 w-full rounded-md border border-input px-2 py-2" />
          </label>
          <label className="text-sm">
            Name
            <input name="name" required defaultValue="Contextual Experiment v2" className="mt-1 w-full rounded-md border border-input px-2 py-2" />
          </label>
          <label className="text-sm">
            Version
            <input name="version" required defaultValue="contextual-v2" className="mt-1 w-full rounded-md border border-input px-2 py-2" />
          </label>
          <label className="text-sm">
            Model
            <input name="model" required defaultValue="claude-3-5-sonnet-latest" className="mt-1 w-full rounded-md border border-input px-2 py-2" />
          </label>
          <label className="text-sm md:col-span-2">
            Prompt template
            <textarea
              name="prompt_template"
              required
              rows={3}
              defaultValue="You are screening a candidate CV for a recruiter. Return strict JSON only and fully populate every rubric criterion."
              className="mt-1 w-full rounded-md border border-input px-2 py-2"
            />
          </label>
          <label className="text-sm">Role relevance weight<input name="role_relevance" type="number" step="0.01" defaultValue={0.35} className="mt-1 w-full rounded-md border border-input px-2 py-2" /></label>
          <label className="text-sm">Tenure stability weight<input name="tenure_stability" type="number" step="0.01" defaultValue={0.2} className="mt-1 w-full rounded-md border border-input px-2 py-2" /></label>
          <label className="text-sm">Education quality weight<input name="education_quality" type="number" step="0.01" defaultValue={0.15} className="mt-1 w-full rounded-md border border-input px-2 py-2" /></label>
          <label className="text-sm">Achievements impact weight<input name="achievements_impact" type="number" step="0.01" defaultValue={0.2} className="mt-1 w-full rounded-md border border-input px-2 py-2" /></label>
          <label className="text-sm">Consistency risk weight<input name="consistency_risk" type="number" step="0.01" defaultValue={0.1} className="mt-1 w-full rounded-md border border-input px-2 py-2" /></label>
          <label className="text-sm">Review buffer<input name="review_buffer_below_threshold" type="number" defaultValue={12} className="mt-1 w-full rounded-md border border-input px-2 py-2" /></label>
          <label className="text-sm">Low confidence cutoff<input name="low_confidence_cutoff" type="number" defaultValue={45} className="mt-1 w-full rounded-md border border-input px-2 py-2" /></label>
          <label className="text-sm">Risk flags for review<input name="high_risk_flags_for_review" type="number" defaultValue={3} className="mt-1 w-full rounded-md border border-input px-2 py-2" /></label>
          <div className="md:col-span-2">
            <Button type="submit">Create profile</Button>
          </div>
        </form>
      </section>

      <section className="mb-6 space-y-3">
        <h3 className="text-sm font-semibold">Profile versions</h3>
        <div className="space-y-3">
          {profiles.map((profile) => (
            <div key={profile.id} className="rounded-md border border-slate-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{profile.name}</p>
                {profile.is_active ? <Badge>Active</Badge> : <Badge variant="outline">Inactive</Badge>}
              </div>
              <p className="mt-1 text-sm text-slate-700">
                Version: <span className="font-medium">{profile.version}</span> • Model: {profile.config.model}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <form action={activateScoringProfileAction}>
                  <input type="hidden" name="profile_id" value={profile.id} />
                  <Button type="submit" variant="outline" size="xs" disabled={profile.id.startsWith("default-") || profile.is_active}>
                    Set active
                  </Button>
                </form>
                <form action={cloneScoringProfileAction}>
                  <input type="hidden" name="profile_id" value={profile.id} />
                  <Button type="submit" variant="outline" size="xs" disabled={profile.id.startsWith("default-")}>
                    Clone
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold">Profile analytics</h3>
        <div className="space-y-2">
          {Object.entries(analytics).map(([version, row]) => (
            <div key={version} className="rounded-md border border-slate-200 p-3 text-sm text-slate-700">
              <p className="font-medium">{version}</p>
              <p>
                Total: {row.total} • Pass: {row.pass} • Review: {row.review} • Reject: {row.reject} • Avg confidence:{" "}
                {row.total ? Math.round(row.confidenceAvg / row.total) : 0}%
              </p>
            </div>
          ))}
          {Object.keys(analytics).length === 0 ? (
            <p className="text-sm text-slate-600">No screening analytics yet for your jobs.</p>
          ) : null}
        </div>
      </section>
    </PageCard>
  );
}
