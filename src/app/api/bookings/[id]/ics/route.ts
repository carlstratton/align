import { createAdminClient } from "@/lib/supabase/admin";

type RouteParams = {
  params: Promise<{ id: string }>;
};

function escapeIcsText(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll(";", "\\;").replaceAll(",", "\\,").replaceAll("\n", "\\n");
}

function toIcsUtc(dateIso: string) {
  return new Date(dateIso).toISOString().replaceAll("-", "").replaceAll(":", "").replace(".000", "");
}

function pickFirst<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, starts_at, ends_at, applications(candidates(name), jobs(title))")
    .eq("id", id)
    .single();

  if (!booking) {
    return new Response("Booking not found.", { status: 404 });
  }

  const application = pickFirst(booking.applications as unknown as Record<string, unknown> | Array<Record<string, unknown>>);
  const candidate = application ? pickFirst(application.candidates as unknown as Record<string, unknown> | Array<Record<string, unknown>>) : null;
  const job = application ? pickFirst(application.jobs as unknown as Record<string, unknown> | Array<Record<string, unknown>>) : null;
  const candidateName = candidate && "name" in candidate ? String(candidate.name ?? "Candidate") : "Candidate";
  const jobTitle = job && "title" in job ? String(job.title ?? "Interview") : "Interview";

  const dtStamp = toIcsUtc(new Date().toISOString());
  const dtStart = toIcsUtc(booking.starts_at);
  const dtEnd = toIcsUtc(booking.ends_at);
  const summary = escapeIcsText(`${jobTitle} interview`);
  const description = escapeIcsText(`Interview booking with ${candidateName}.`);
  const uid = `${booking.id}@align-recruit`;

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Align Recruit//Interview Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");

  return new Response(ics, {
    status: 200,
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="interview-${booking.id}.ics"`,
      "cache-control": "private, max-age=60",
    },
  });
}
