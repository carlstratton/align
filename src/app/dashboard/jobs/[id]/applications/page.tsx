import Link from "next/link";
import { PageCard } from "@/components/layout/page-card";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type JobApplicationsPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string; sort?: string }>;
};

type ApplicationListItem = {
  id: string;
  status: string;
  applied_at: string;
  candidates: { name: string | null; email: string } | null;
  screening_results:
    | {
        overall_score: number;
        decision_band: string;
        recommendation: string;
        confidence_score?: number | null;
        strengths: unknown[];
        gaps: unknown[];
      }[]
    | {
        overall_score: number;
        decision_band: string;
        recommendation: string;
        confidence_score?: number | null;
        strengths: unknown[];
        gaps: unknown[];
      }
    | null;
};

export default async function JobApplicationsPage({
  params,
  searchParams,
}: JobApplicationsPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const sortBy = query.sort === "date" ? "date" : "score";
  const supabase = await createClient();

  const request = supabase
    .from("applications")
    .select(
      "id, status, applied_at, candidates(name, email), screening_results(overall_score, decision_band, recommendation, confidence_score, strengths, gaps)",
    )
    .eq("job_id", id);

  const { data } = await request.order("applied_at", { ascending: false });
  const applications = ((data ?? []) as unknown as ApplicationListItem[]).sort((a, b) => {
    if (sortBy === "date") {
      return new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime();
    }

    const aScreening = Array.isArray(a.screening_results) ? a.screening_results[0] : a.screening_results;
    const bScreening = Array.isArray(b.screening_results) ? b.screening_results[0] : b.screening_results;
    const aScore = aScreening?.overall_score ?? -1;
    const bScore = bScreening?.overall_score ?? -1;
    return bScore - aScore;
  });
  const aboveThreshold = applications.filter((application) => application.status === "pass");
  const belowThreshold = applications.filter((application) => application.status === "reject");
  const needsReview = applications.filter((application) => application.status === "review");

  const sections: Array<{ title: string; description: string; items: ApplicationListItem[] }> = [
    {
      title: "Above threshold",
      description: "Candidates whose contextual score passed the configured job threshold.",
      items: aboveThreshold,
    },
    {
      title: "Below threshold",
      description: "Candidates whose contextual score is below threshold.",
      items: belowThreshold,
    },
    {
      title: "Needs review",
      description: "Candidates needing recruiter judgment due to near-threshold, low confidence, or risks.",
      items: needsReview,
    },
  ];

  function renderApplicationCard(application: ApplicationListItem) {
    const screening = Array.isArray(application.screening_results)
      ? application.screening_results[0]
      : application.screening_results;
    const score = screening?.overall_score;
    const strengthsCount = Array.isArray(screening?.strengths) ? screening.strengths.length : 0;
    const gapsCount = Array.isArray(screening?.gaps) ? screening.gaps.length : 0;
    const confidence = screening?.confidence_score;

    return (
      <Link
        key={application.id}
        href={`/dashboard/applications/${application.id}?job_id=${id}`}
        className="block rounded-md border border-border bg-card p-4 hover:bg-muted/60"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-medium">
            {application.candidates?.name ?? "Candidate"} - {application.candidates?.email}
          </p>
          <p className="text-xs text-muted-foreground">{new Date(application.applied_at).toLocaleString()}</p>
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-700">
          <Badge variant="outline">Status: {application.status}</Badge>
          <Badge variant="outline">Score: {typeof score === "number" ? score : "N/A"}</Badge>
          <Badge variant="outline">Band: {screening?.decision_band ?? "N/A"}</Badge>
          <span>Confidence: {typeof confidence === "number" ? `${confidence}%` : "N/A"}</span>
          <span>Recommendation: {screening?.recommendation ?? "N/A"}</span>
          <span>Strengths: {strengthsCount}</span>
          <span>Gaps: {gapsCount}</span>
        </div>
      </Link>
    );
  }

  return (
    <PageCard title="Applications" description="Review ranked candidates by threshold outcome.">
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <Button asChild size="xs" variant="outline">
          <Link href={`/dashboard/jobs/${id}/applications`}>All</Link>
        </Button>
        <Button asChild size="xs" variant="outline">
          <Link href={`/dashboard/jobs/${id}/applications?sort=score`}>Sort: score</Link>
        </Button>
        <Button asChild size="xs" variant="outline">
          <Link href={`/dashboard/jobs/${id}/applications?sort=date`}>Sort: date</Link>
        </Button>
      </div>

      <div className="space-y-6">
        {sections.map((section) => (
          <section key={section.title}>
            <div className="mb-2">
              <h3 className="text-sm font-semibold">{section.title}</h3>
              <p className="text-xs text-muted-foreground">{section.description}</p>
            </div>
            <div className="space-y-3">
              {section.items.map((application) => renderApplicationCard(application))}
              {section.items.length === 0 ? (
                <p className="text-sm text-slate-600">No applications in this bucket.</p>
              ) : null}
            </div>
          </section>
        ))}
        {applications.length === 0 ? <p className="text-sm text-slate-600">No applications yet for this job.</p> : null}
      </div>
      <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        AI screening is assistive only. Recruiters remain responsible for final decisions.
      </p>
    </PageCard>
  );
}
