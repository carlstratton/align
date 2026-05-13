import Link from "next/link";
import { PageCard } from "@/components/layout/page-card";
import { createClient } from "@/lib/supabase/server";
import {
  createBookingLinkAction,
  retryBookingCalendarSyncAction,
  updateApplicationStatusAction,
} from "@/app/(product)/dashboard/applications/actions";
import { getServerEnv } from "@/lib/env";
import { Button } from "@/components/ui/button";
import {
  TypographyH3,
  TypographyLarge,
  TypographyList,
  TypographyListItem,
  TypographyMuted,
  TypographyP,
} from "@/components/ui/typography";

type ApplicationDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ job_id?: string; error?: string; success?: string }>;
};

type ActivityEntry = {
  id: string;
  timestamp: string;
  title: string;
  detail: string;
};

type InsightItem = {
  title?: string;
  evidence?: string;
  relevance?: string;
};

function toInsightItems(value: unknown[]): InsightItem[] {
  const mapped = value.map((item): InsightItem | null => {
    if (typeof item === "string") {
      return { title: item };
    }
    if (!item || typeof item !== "object") {
      return null;
    }
    const record = item as Record<string, unknown>;
    return {
      title: typeof record.title === "string" ? record.title : undefined,
      evidence: typeof record.evidence === "string" ? record.evidence : undefined,
      relevance: typeof record.relevance === "string" ? record.relevance : undefined,
    };
  });
  return mapped.filter(
    (item): item is InsightItem =>
      item !== null && Boolean(item.title || item.evidence || item.relevance),
  );
}

type ApplicationDetail = {
  id: string;
  job_id: string;
  status: string;
  applied_at: string;
  candidates: { name: string | null; email: string; phone: string | null } | null;
  jobs: { title: string; recruiter_id: string } | null;
  screening_results:
    | {
        overall_score: number;
        recommendation: string;
        decision_band: string;
        confidence_score?: number | null;
        prompt_version?: string | null;
        summary: string | null;
        score_breakdown?: Record<string, unknown> | null;
        strengths: unknown[];
        gaps: unknown[];
        missing_requirements: string[] | null;
        relevant_experience: unknown[];
        risk_flags: unknown[];
        suggested_follow_up_questions: string[] | null;
      }[]
    | {
        overall_score: number;
        recommendation: string;
        decision_band: string;
        confidence_score?: number | null;
        prompt_version?: string | null;
        summary: string | null;
        score_breakdown?: Record<string, unknown> | null;
        strengths: unknown[];
        gaps: unknown[];
        missing_requirements: string[] | null;
        relevant_experience: unknown[];
        risk_flags: unknown[];
        suggested_follow_up_questions: string[] | null;
      }
    | null;
};

export default async function ApplicationDetailPage({
  params,
  searchParams,
}: ApplicationDetailPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from("applications")
    .select(
      "id, job_id, status, applied_at, candidates(name, email, phone), jobs(title, recruiter_id), screening_results(overall_score, recommendation, decision_band, confidence_score, prompt_version, summary, score_breakdown, strengths, gaps, missing_requirements, relevant_experience, risk_flags, suggested_follow_up_questions)",
    )
    .eq("id", id)
    .single();
  const { data: bookingLinks } = await supabase
    .from("booking_links")
    .select("id, token, status, expires_at, created_at")
    .eq("application_id", id)
    .order("created_at", { ascending: false })
    .limit(20);
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, status, starts_at, created_at, meeting_url, calendar_html_link, calendar_sync_status, calendar_sync_error")
    .eq("application_id", id)
    .order("created_at", { ascending: false })
    .limit(20);

  const application = data as unknown as ApplicationDetail | null;
  const bookingLink = bookingLinks?.[0];
  const booking = bookings?.[0];
  const appBaseUrl = getServerEnv().APP_BASE_URL;
  const bookingUrl = bookingLink ? `${appBaseUrl}/book/${bookingLink.token}` : null;

  if (!application) {
    return <PageCard title="Application not found" description="Unable to load this application." />;
  }

  const screening = Array.isArray(application.screening_results)
    ? application.screening_results[0]
    : application.screening_results;
  const strengths = Array.isArray(screening?.strengths) ? screening.strengths : [];
  const gaps = Array.isArray(screening?.gaps) ? screening.gaps : [];
  const strengthItems = toInsightItems(strengths);
  const gapItems = toInsightItems(gaps);
  const missingRequirements = screening?.missing_requirements ?? [];
  const followUps = screening?.suggested_follow_up_questions ?? [];
  const confidenceScore =
    typeof screening?.confidence_score === "number" ? screening.confidence_score : null;
  const dimensions =
    screening?.score_breakdown &&
    typeof screening.score_breakdown === "object" &&
    "dimensions" in screening.score_breakdown &&
    screening.score_breakdown.dimensions &&
    typeof screening.score_breakdown.dimensions === "object"
      ? (screening.score_breakdown.dimensions as Record<
          string,
          { score?: number; rationale?: string; evidence?: string[] }
        >)
      : {};
  const breakdown =
    screening?.score_breakdown && typeof screening.score_breakdown === "object"
      ? (screening.score_breakdown as Record<string, unknown>)
      : {};
  const profileVersion =
    typeof screening?.prompt_version === "string" && screening.prompt_version
      ? screening.prompt_version
      : typeof breakdown.profile_version === "string" && breakdown.profile_version
        ? breakdown.profile_version
        : "legacy-heuristic";
  const profileName =
    typeof breakdown.profile_name === "string" && breakdown.profile_name
      ? breakdown.profile_name
      : "Legacy heuristic profile";
  const threshold =
    typeof breakdown.threshold === "number" ? breakdown.threshold : "N/A";
  const weights =
    breakdown.weights && typeof breakdown.weights === "object"
      ? (breakdown.weights as Record<string, number>)
      : null;
  const jobApplicationsPath = `/dashboard/jobs/${query.job_id ?? application.job_id}/applications`;
  const activityEntries: ActivityEntry[] = [
    {
      id: `applied-${application.id}`,
      timestamp: application.applied_at,
      title: "Application submitted",
      detail: `${application.candidates?.name ?? "Candidate"} applied for ${application.jobs?.title ?? "the role"}.`,
    },
    ...(bookingLinks ?? []).map((link) => ({
      id: `invite-${link.id}`,
      timestamp: link.created_at,
      title: "Interview invite sent",
      detail: `Booking link created (${link.status})${
        link.expires_at ? `, expires ${new Date(link.expires_at).toLocaleString()}` : ""
      }.`,
    })),
    ...(bookings ?? []).map((item) => ({
      id: `booking-${item.id}`,
      timestamp: item.created_at,
      title: "Interview slot booked",
      detail: `Slot ${
        item.starts_at ? new Date(item.starts_at).toLocaleString() : "time unavailable"
      } (${item.status}).`,
    })),
    ...(bookings ?? [])
      .filter((item) => Boolean(item.calendar_sync_status))
      .map((item) => ({
        id: `calendar-sync-${item.id}`,
        timestamp: item.created_at,
        title:
          item.calendar_sync_status === "synced"
            ? "Calendar sync completed"
            : item.calendar_sync_status === "partial"
              ? "Calendar sync partially completed"
              : "Calendar sync failed",
        detail:
          item.calendar_sync_status === "synced"
            ? "Google Calendar event and Meet link were attached successfully."
            : item.calendar_sync_error ?? "Calendar sync did not complete successfully.",
      })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <PageCard title="Application review" description={`Candidate: ${application.candidates?.name ?? "Unknown"}`}>
      <div className="mb-4">
        <Link
          href={jobApplicationsPath}
          className="text-sm text-slate-700 underline underline-offset-2"
        >
          Back to applications
        </Link>
      </div>
      {query.error ? (
        <p className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {query.error}
        </p>
      ) : null}
      {query.success ? (
        <p className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {query.success === "calendar-sync"
            ? "Calendar sync completed successfully."
            : "Interview invite link created successfully."}
        </p>
      ) : null}
      {bookingUrl ? (
        <div className="mb-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">
          <TypographyP className="!mt-0 font-medium">Latest booking link ({bookingLink?.status})</TypographyP>
          <TypographyP className="!mt-1 break-all">{bookingUrl}</TypographyP>
        </div>
      ) : null}
      {booking ? (
        <div className="mb-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">
          <TypographyP className="!mt-0 font-medium">Latest booking status</TypographyP>
          <TypographyP className="!mt-1">
            {booking.status} ({new Date(booking.created_at).toLocaleString()})
          </TypographyP>
          <TypographyP className="!mt-1">
            Calendar sync: {booking.calendar_sync_status ?? "not_synced"}
          </TypographyP>
          {booking.meeting_url ? (
            <TypographyP className="!mt-1 break-all">
              Meet link:{" "}
              <a href={booking.meeting_url} className="underline underline-offset-2">
                {booking.meeting_url}
              </a>
            </TypographyP>
          ) : null}
          {booking.calendar_html_link ? (
            <TypographyP className="!mt-1 break-all">
              Google Calendar event:{" "}
              <a href={booking.calendar_html_link} className="underline underline-offset-2">
                {booking.calendar_html_link}
              </a>
            </TypographyP>
          ) : null}
          {booking.calendar_sync_error ? (
            <TypographyP className="!mt-1 text-red-700">
              Sync error: {booking.calendar_sync_error}
            </TypographyP>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2 text-sm">
        <TypographyP className="!mt-0">Job: {application.jobs?.title ?? "Unknown role"}</TypographyP>
        <TypographyP className="!mt-0">Email: {application.candidates?.email}</TypographyP>
        <TypographyP className="!mt-0">Phone: {application.candidates?.phone ?? "N/A"}</TypographyP>
        <TypographyP className="!mt-0">Status: {application.status}</TypographyP>
        <TypographyP className="!mt-0">Applied: {new Date(application.applied_at).toLocaleString()}</TypographyP>
        <TypographyP className="!mt-0">Scoring profile: {profileName}</TypographyP>
        <TypographyP className="!mt-0">Profile version: {profileVersion}</TypographyP>
      </div>

      <div className="mt-5 grid gap-3 text-sm md:grid-cols-3">
        <div className="space-y-1 rounded-md border border-slate-200 p-3">
          <TypographyMuted className="text-xs">AI score</TypographyMuted>
          <TypographyLarge className="text-xl">{screening?.overall_score ?? "N/A"}</TypographyLarge>
        </div>
        <div className="space-y-1 rounded-md border border-slate-200 p-3">
          <TypographyMuted className="text-xs">Recommendation</TypographyMuted>
          <TypographyLarge className="text-xl">{screening?.recommendation ?? "N/A"}</TypographyLarge>
        </div>
        <div className="space-y-1 rounded-md border border-slate-200 p-3">
          <TypographyMuted className="text-xs">Decision band</TypographyMuted>
          <TypographyLarge className="text-xl">{screening?.decision_band ?? "N/A"}</TypographyLarge>
        </div>
      </div>
      <div className="mt-3 space-y-1 rounded-md border border-slate-200 p-3 text-sm">
        <TypographyMuted className="text-xs">AI confidence</TypographyMuted>
        <TypographyLarge className="text-lg">
          {confidenceScore !== null ? `${confidenceScore}%` : "N/A"}
        </TypographyLarge>
      </div>

      <div className="mt-5 space-y-4 text-sm">
        <section>
          <TypographyH3>Summary</TypographyH3>
          <TypographyP className="!mt-1 text-slate-700">{screening?.summary ?? "No summary available."}</TypographyP>
        </section>
        <section>
          <TypographyH3>Contextual rubric breakdown</TypographyH3>
          {Object.entries(dimensions).length ? (
            <div className="mt-2 space-y-2">
              {Object.entries(dimensions).map(([key, value]) => (
                <div key={key} className="rounded-md border border-slate-200 p-3">
                  <p className="font-medium capitalize">{key.replaceAll("_", " ")}</p>
                  <p className="text-slate-700">Score: {typeof value?.score === "number" ? value.score : "N/A"}</p>
                  <p className="mt-1 text-slate-600">{value?.rationale ?? "No rationale provided."}</p>
                  {Array.isArray(value?.evidence) && value.evidence.length ? (
                    <ul className="mt-1 list-disc pl-5 text-slate-700">
                      {value.evidence.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-slate-700">No rubric breakdown available.</p>
          )}
        </section>
        <section>
          <TypographyH3>Weighted scoring math</TypographyH3>
          <div className="mt-1 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
            <p>Threshold: {threshold}</p>
            <p className="mt-1">Overall score: {screening?.overall_score ?? "N/A"}</p>
            {weights ? (
              <ul className="mt-2 list-disc pl-5">
                {Object.entries(weights).map(([key, value]) => (
                  <li key={key}>
                    {key.replaceAll("_", " ")} weight: {Math.round(value * 100)}%
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1">No stored weights available for this run.</p>
            )}
          </div>
        </section>
        <section>
          <TypographyH3>Strengths</TypographyH3>
          {strengthItems.length ? (
            <div className="mt-2 space-y-2">
              {strengthItems.map((item, index) => (
                <div key={`strength-${index}`} className="rounded-md border border-slate-200 p-3">
                  {item.title ? <p className="font-medium">{item.title}</p> : null}
                  {item.evidence ? <p className="mt-1 text-slate-700">{item.evidence}</p> : null}
                  {item.relevance ? <p className="mt-1 text-slate-600">Relevance: {item.relevance}</p> : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-slate-700">No strengths highlighted.</p>
          )}
        </section>
        <section>
          <TypographyH3>Gaps</TypographyH3>
          {gapItems.length ? (
            <div className="mt-2 space-y-2">
              {gapItems.map((item, index) => (
                <div key={`gap-${index}`} className="rounded-md border border-slate-200 p-3">
                  {item.title ? <p className="font-medium">{item.title}</p> : null}
                  {item.evidence ? <p className="mt-1 text-slate-700">{item.evidence}</p> : null}
                  {item.relevance ? <p className="mt-1 text-slate-600">Relevance: {item.relevance}</p> : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-slate-700">No gaps highlighted.</p>
          )}
        </section>
        <section>
          <TypographyH3>Missing requirements</TypographyH3>
          <TypographyList className="my-0 ml-0 mt-1 pl-5 text-slate-700">
            {missingRequirements.map((item) => (
              <TypographyListItem key={item}>{item}</TypographyListItem>
            ))}
            {missingRequirements.length === 0 ? <TypographyListItem>None highlighted.</TypographyListItem> : null}
          </TypographyList>
        </section>
        <section>
          <TypographyH3>Relevant experience</TypographyH3>
          <pre className="mt-1 overflow-x-auto rounded-md bg-slate-50 p-3 text-xs text-slate-700">
            {JSON.stringify(screening?.relevant_experience ?? [], null, 2)}
          </pre>
        </section>
        <section>
          <TypographyH3>Risk flags</TypographyH3>
          <pre className="mt-1 overflow-x-auto rounded-md bg-slate-50 p-3 text-xs text-slate-700">
            {JSON.stringify(screening?.risk_flags ?? [], null, 2)}
          </pre>
        </section>
        <section>
          <TypographyH3>Suggested follow-up questions</TypographyH3>
          <TypographyList className="my-0 ml-0 mt-1 pl-5 text-slate-700">
            {followUps.map((item) => (
              <TypographyListItem key={item}>{item}</TypographyListItem>
            ))}
            {followUps.length === 0 ? (
              <TypographyListItem>No follow-up questions suggested.</TypographyListItem>
            ) : null}
          </TypographyList>
        </section>
      </div>

      {application.candidates?.email?.endsWith("@candidates.local") ? (
        <p className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          No email address was found in this CV. Add one to the candidate record before sending an
          interview invitation.
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <form action={createBookingLinkAction}>
          <input type="hidden" name="application_id" value={application.id} />
          <input type="hidden" name="job_id" value={application.job_id} />
          <input type="hidden" name="recruiter_id" value={application.jobs?.recruiter_id ?? ""} />
          <Button
            type="submit"
            className="px-4"
            disabled={application.candidates?.email?.endsWith("@candidates.local") ?? false}
          >
            Invite to interview
          </Button>
        </form>
        {booking ? (
          <form action={retryBookingCalendarSyncAction}>
            <input type="hidden" name="application_id" value={application.id} />
            <input type="hidden" name="job_id" value={application.job_id} />
            <input type="hidden" name="booking_id" value={booking.id} />
            <Button type="submit" variant="outline" className="px-4">
              Retry calendar sync
            </Button>
          </form>
        ) : null}

        <form action={updateApplicationStatusAction}>
          <input type="hidden" name="application_id" value={application.id} />
          <input type="hidden" name="job_id" value={application.job_id} />
          <input type="hidden" name="status" value="review" />
          <Button
            type="submit"
            variant="outline"
            className="px-4"
          >
            Mark as review
          </Button>
        </form>

        <form action={updateApplicationStatusAction}>
          <input type="hidden" name="application_id" value={application.id} />
          <input type="hidden" name="job_id" value={application.job_id} />
          <input type="hidden" name="status" value="reject" />
          <Button
            type="submit"
            variant="outline"
            className="border-red-300 text-red-700"
          >
            Reject
          </Button>
        </form>
      </div>

      <p className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        AI recommendations are advisory. Recruiters must make final hiring decisions.
      </p>

      <section className="mt-6">
        <TypographyH3 className="text-sm">Activity log</TypographyH3>
        <div className="mt-3 space-y-2">
          {activityEntries.map((entry) => (
            <div key={entry.id} className="rounded-md border border-slate-200 bg-white p-3 text-sm">
              <TypographyP className="!mt-0 font-medium text-slate-900">{entry.title}</TypographyP>
              <TypographyMuted className="text-xs">{new Date(entry.timestamp).toLocaleString()}</TypographyMuted>
              <TypographyP className="!mt-1 text-slate-700">{entry.detail}</TypographyP>
            </div>
          ))}
        </div>
      </section>
    </PageCard>
  );
}
