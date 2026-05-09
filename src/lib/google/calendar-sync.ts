import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret } from "@/lib/security/encryption";
import {
  createGoogleCalendarEventWithMeet,
  refreshGoogleAccessToken,
} from "@/lib/google/calendar";

type SyncResult = {
  ok: boolean;
  eventId: string | null;
  eventHtmlLink: string | null;
  meetLink: string | null;
  error: string | null;
};

function pickFirst<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function syncBookingToGoogleCalendar(bookingId: string): Promise<SyncResult> {
  const supabase = createAdminClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, recruiter_id, starts_at, ends_at, timezone, application_id, applications(candidates(name, email), jobs(title))",
    )
    .eq("id", bookingId)
    .single();

  if (!booking) {
    return { ok: false, eventId: null, eventHtmlLink: null, meetLink: null, error: "Booking not found." };
  }

  const { data: recruiterProfile } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", booking.recruiter_id)
    .single();
  const { data: googleAccount } = await supabase
    .from("recruiter_google_accounts")
    .select("encrypted_refresh_token")
    .eq("recruiter_id", booking.recruiter_id)
    .maybeSingle();

  if (!googleAccount?.encrypted_refresh_token) {
    await supabase
      .from("bookings")
      .update({
        calendar_sync_status: "failed",
        calendar_sync_error: "Google Calendar not connected for this recruiter.",
      })
      .eq("id", booking.id);
    return {
      ok: false,
      eventId: null,
      eventHtmlLink: null,
      meetLink: null,
      error: "Google Calendar not connected for this recruiter.",
    };
  }

  try {
    const refreshToken = decryptSecret(googleAccount.encrypted_refresh_token);
    const token = await refreshGoogleAccessToken(refreshToken);

    const application = pickFirst(booking.applications as unknown as Record<string, unknown> | Array<Record<string, unknown>>);
    const candidate = application ? pickFirst(application.candidates as unknown as Record<string, unknown> | Array<Record<string, unknown>>) : null;
    const job = application ? pickFirst(application.jobs as unknown as Record<string, unknown> | Array<Record<string, unknown>>) : null;

    const candidateEmail = candidate && "email" in candidate ? String(candidate.email ?? "") : "";
    const candidateName = candidate && "name" in candidate ? String(candidate.name ?? "Candidate") : "Candidate";
    const recruiterEmail = recruiterProfile?.email ?? "";
    const recruiterName = recruiterProfile?.full_name ?? "Recruiter";
    const jobTitle = job && "title" in job ? String(job.title ?? "Interview") : "Interview";

    const event = await createGoogleCalendarEventWithMeet({
      accessToken: token.access_token,
      summary: `${jobTitle} interview`,
      description: `Interview booking between ${candidateName} and ${recruiterName}.`,
      startsAtIso: booking.starts_at,
      endsAtIso: booking.ends_at,
      timezone: booking.timezone || "UTC",
      attendees: [candidateEmail, recruiterEmail],
      requestId: `booking-${booking.id}-${Date.now()}`,
    });

    const hasCalendarLink = Boolean(event.htmlLink);
    const hasMeetLink = Boolean(event.meetLink);
    const syncStatus = hasCalendarLink && hasMeetLink ? "synced" : "partial";
    const syncError =
      syncStatus === "partial"
        ? "Google event created, but one or more links were missing (calendar link and/or Google Meet)."
        : null;

    await supabase
      .from("bookings")
      .update({
        calendar_event_id: event.eventId,
        calendar_html_link: event.htmlLink,
        meeting_url: event.meetLink,
        calendar_sync_status: syncStatus,
        calendar_sync_error: syncError,
      })
      .eq("id", booking.id);

    return {
      ok: syncStatus === "synced",
      eventId: event.eventId,
      eventHtmlLink: event.htmlLink,
      meetLink: event.meetLink,
      error: syncError,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Calendar sync failed.";
    await supabase
      .from("bookings")
      .update({
        calendar_sync_status: "failed",
        calendar_sync_error: message,
      })
      .eq("id", booking.id);
    return {
      ok: false,
      eventId: null,
      eventHtmlLink: null,
      meetLink: null,
      error: message,
    };
  }
}
