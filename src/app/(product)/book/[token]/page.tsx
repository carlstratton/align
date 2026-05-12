import { PageCard } from "@/components/layout/page-card";
import { createAdminClient } from "@/lib/supabase/admin";
import { confirmBookingAction } from "@/app/(product)/book/[token]/actions";
import { Button } from "@/components/ui/button";

/** Booking confirmation may call Google Calendar + email; avoid serverless timeouts on Vercel. */
export const maxDuration = 120;

type BookPageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
};

type AvailabilityWindow = {
  day_of_week: number;
  start_time: string;
  end_time: string;
  interview_duration_minutes: number;
  is_active: boolean;
};

function toDateForUtcTime(baseDate: Date, hhmm: string) {
  const [hours, minutes] = hhmm.split(":").map((part) => Number(part));
  return new Date(
    Date.UTC(
      baseDate.getUTCFullYear(),
      baseDate.getUTCMonth(),
      baseDate.getUTCDate(),
      Number.isFinite(hours) ? hours : 0,
      Number.isFinite(minutes) ? minutes : 0,
      0,
      0,
    ),
  );
}

function generateSlots(windows: AvailabilityWindow[], bookedStartTimes: Set<number>) {
  const now = new Date();
  const slots: { startsAt: string; endsAt: string; label: string }[] = [];

  for (let offset = 0; offset < 14; offset += 1) {
    const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset));
    const matchingWindows = windows.filter(
      (window) => window.is_active && window.day_of_week === day.getUTCDay(),
    );

    matchingWindows.forEach((window) => {
      const start = toDateForUtcTime(day, window.start_time);
      const end = toDateForUtcTime(day, window.end_time);
      const durationMs = window.interview_duration_minutes * 60 * 1000;

      for (let cursor = start.getTime(); cursor + durationMs <= end.getTime(); cursor += durationMs) {
        const startsAt = new Date(cursor);
        const endsAt = new Date(cursor + durationMs);
        const startsAtIso = startsAt.toISOString();
        const startsAtMs = startsAt.getTime();
        if (startsAt <= now) continue;
        if (bookedStartTimes.has(startsAtMs)) continue;

        slots.push({
          startsAt: startsAtIso,
          endsAt: endsAt.toISOString(),
          label: startsAt.toLocaleString(),
        });
      }
    });
  }

  return slots.slice(0, 40);
}

export default async function BookPage({ params, searchParams }: BookPageProps) {
  const { token } = await params;
  const query = await searchParams;
  const supabase = createAdminClient();

  const { data: bookingLink } = await supabase
    .from("booking_links")
    .select("id, status, expires_at, recruiter_id, application_id, applications(candidates(name), jobs(title))")
    .eq("token", token)
    .single();

  if (!bookingLink) {
    return <PageCard title="Invalid booking link" description="This booking link was not found." />;
  }

  if (query.success) {
    const { data: booking } = await supabase
      .from("bookings")
      .select("starts_at, ends_at, timezone, status")
      .eq("booking_link_id", bookingLink.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const startsAtLabel = booking?.starts_at
      ? new Date(booking.starts_at).toLocaleString("en-GB", { timeZone: booking.timezone ?? "UTC" })
      : null;

    return (
      <PageCard title="Booking confirmed" description="Your interview slot has been secured.">
        <p className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          Booking confirmed. You should receive a confirmation email shortly.
        </p>
        {startsAtLabel ? (
          <p className="text-sm text-slate-700">
            Scheduled for <span className="font-medium">{startsAtLabel}</span> {booking?.timezone ?? "UTC"}.
          </p>
        ) : null}
      </PageCard>
    );
  }

  if (bookingLink.status !== "active") {
    return (
      <PageCard
        title="Booking unavailable"
        description="This booking link is already used, expired, or cancelled."
      />
    );
  }

  const [windowsResponse, bookingsResponse] = await Promise.all([
    supabase
      .from("availability_windows")
      .select("day_of_week, start_time, end_time, interview_duration_minutes, is_active")
      .eq("recruiter_id", bookingLink.recruiter_id),
    supabase
      .from("bookings")
      .select("starts_at")
      .eq("recruiter_id", bookingLink.recruiter_id)
      .eq("status", "confirmed"),
  ]);

  const windows = (windowsResponse.data ?? []) as AvailabilityWindow[];
  const bookedStartTimes = new Set(
    (bookingsResponse.data ?? [])
      .map((booking) => new Date(booking.starts_at).getTime())
      .filter((value) => Number.isFinite(value)),
  );
  const slots = generateSlots(windows, bookedStartTimes);
  const application =
    bookingLink.applications && typeof bookingLink.applications === "object"
      ? bookingLink.applications
      : null;
  const candidateName =
    application &&
    "candidates" in application &&
    application.candidates &&
    typeof application.candidates === "object" &&
    "name" in application.candidates
      ? String(application.candidates.name ?? "Candidate")
      : "Candidate";
  const jobTitle =
    application &&
    "jobs" in application &&
    application.jobs &&
    typeof application.jobs === "object" &&
    "title" in application.jobs
      ? String(application.jobs.title ?? "Role")
      : "Role";

  return (
    <PageCard title="Book interview" description={`${candidateName}, choose a slot for ${jobTitle}.`}>
      {query.error ? (
        <p className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {query.error}
        </p>
      ) : null}
      {query.success ? (
        <p className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          Booking confirmed. You should receive a confirmation email shortly.
        </p>
      ) : null}

      <div className="space-y-2">
        {slots.map((slot) => (
          <form key={slot.startsAt} action={confirmBookingAction} className="flex items-center justify-between rounded-md border border-slate-200 p-3">
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="starts_at" value={slot.startsAt} />
            <input type="hidden" name="ends_at" value={slot.endsAt} />
            <p className="text-sm text-slate-700">{slot.label}</p>
            <Button
              type="submit"
              className="px-3"
            >
              Book
            </Button>
          </form>
        ))}
        {slots.length === 0 ? (
          <p className="text-sm text-slate-600">
            No slots are currently available. Please contact the recruiter for more options.
          </p>
        ) : null}
      </div>
    </PageCard>
  );
}
