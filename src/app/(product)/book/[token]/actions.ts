"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send-email";
import { syncBookingToGoogleCalendar } from "@/lib/google/calendar-sync";
import { getServerEnv } from "@/lib/env";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function pickFirst<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function confirmBookingAction(formData: FormData) {
  const token = getString(formData, "token");
  const startsAt = getString(formData, "starts_at");
  const endsAt = getString(formData, "ends_at");

  const supabase = createAdminClient();

  const { data: bookingLink } = await supabase
    .from("booking_links")
    .select(
      "id, application_id, recruiter_id, status, expires_at, applications(candidate_id, candidates(name, email), jobs(title))",
    )
    .eq("token", token)
    .single();

  if (!bookingLink || bookingLink.status !== "active") {
    redirect(`/book/${token}?error=Booking%20link%20is%20invalid%20or%20already%20used`);
  }

  if (bookingLink.expires_at && new Date(bookingLink.expires_at).getTime() < Date.now()) {
    await supabase.from("booking_links").update({ status: "expired" }).eq("id", bookingLink.id);
    redirect(`/book/${token}?error=Booking%20link%20has%20expired`);
  }

  const applicationForCandidate = pickFirst(
    bookingLink.applications as
      | { candidate_id?: string | null }
      | Array<{ candidate_id?: string | null }>
      | null
      | undefined,
  );
  const candidateId =
    applicationForCandidate && "candidate_id" in applicationForCandidate
      ? String(applicationForCandidate.candidate_id ?? "")
      : "";

  if (!candidateId) {
    redirect(`/book/${token}?error=Unable%20to%20book%20because%20candidate%20details%20are%20missing`);
  }

  const { data: existingBooking } = await supabase
    .from("bookings")
    .select("id")
    .eq("booking_link_id", bookingLink.id)
    .maybeSingle();

  if (existingBooking?.id) {
    await supabase.from("booking_links").update({ status: "used" }).eq("id", bookingLink.id);
    revalidatePath(`/book/${token}`);
    redirect(`/book/${token}?success=1`);
  }

  const { data: booking, error } = await supabase
    .from("bookings")
    .insert({
    booking_link_id: bookingLink.id,
    application_id: bookingLink.application_id,
    recruiter_id: bookingLink.recruiter_id,
    candidate_id: candidateId,
    starts_at: startsAt,
    ends_at: endsAt,
    timezone: "UTC",
    status: "confirmed",
    })
    .select("id")
    .single();

  if (error || !booking) {
    const reason = error?.message
      ? `Booking failed: ${error.message}`
      : "Selected slot is no longer available";
    redirect(`/book/${token}?error=${encodeURIComponent(reason)}`);
  }

  await supabase.from("booking_links").update({ status: "used" }).eq("id", bookingLink.id);
  const application = pickFirst(
    bookingLink.applications as
      | {
          candidates?: { name?: string | null; email?: string | null } | null;
          jobs?: { title?: string | null } | null;
        }
      | Array<{
          candidates?: { name?: string | null; email?: string | null } | null;
          jobs?: { title?: string | null } | null;
        }>
      | null
      | undefined,
  );
  const candidate =
    application &&
    "candidates" in application &&
    application.candidates &&
    typeof application.candidates === "object"
      ? application.candidates
      : null;
  const job =
    application &&
    "jobs" in application &&
    application.jobs &&
    typeof application.jobs === "object"
      ? application.jobs
      : null;

  const candidateEmail = candidate && "email" in candidate ? String(candidate.email ?? "") : "";
  const candidateName = candidate && "name" in candidate ? String(candidate.name ?? "Candidate") : "Candidate";
  const jobTitle = job && "title" in job ? String(job.title ?? "the role") : "the role";

  const {
    data: recruiterProfile,
  } = await supabase.from("profiles").select("email, full_name").eq("id", bookingLink.recruiter_id).single();
  const recruiterEmail = recruiterProfile?.email ?? "";
  const recruiterName = recruiterProfile?.full_name ?? "Recruiter";
  const slotText = new Date(startsAt).toLocaleString("en-GB", { timeZone: "UTC" }) + " UTC";
  const appBaseUrl = getServerEnv().APP_BASE_URL;
  const icsUrl = `${appBaseUrl}/api/bookings/${booking.id}/ics`;
  const syncResult = await syncBookingToGoogleCalendar(booking.id);
  const calendarLink = syncResult.eventHtmlLink;
  const meetLink = syncResult.meetLink;
  const syncWarning = syncResult.error
    ? `\nCalendar sync status: ${syncResult.error}\n`
    : "";

  if (candidateEmail) {
    await sendEmail({
      to: candidateEmail,
      subject: `Booking confirmed for ${jobTitle}`,
      text: `Hi ${candidateName},\n\nYour interview for ${jobTitle} is confirmed for ${slotText}.\n${
        meetLink ? `\nGoogle Meet: ${meetLink}\n` : ""
      }${calendarLink ? `\nAdd to Google Calendar: ${calendarLink}\n` : ""}${syncWarning}\nAdd to calendar (ICS): ${icsUrl}\n\nBest regards,\n${recruiterName}`,
      html: `<p>Hi ${candidateName},</p><p>Your interview for <strong>${jobTitle}</strong> is confirmed for <strong>${slotText}</strong>.</p>${
        meetLink ? `<p><strong>Google Meet:</strong> <a href="${meetLink}">${meetLink}</a></p>` : ""
      }${calendarLink ? `<p><a href="${calendarLink}">Add to Google Calendar</a></p>` : ""}${
        syncResult.error ? `<p><strong>Calendar sync status:</strong> ${syncResult.error}</p>` : ""
      }<p><a href="${icsUrl}">Add to calendar (.ics)</a></p><p>Best regards,<br/>${recruiterName}</p>`,
    });
  }

  if (recruiterEmail) {
    await sendEmail({
      to: recruiterEmail,
      subject: `New interview booked: ${jobTitle}`,
      text: `A candidate has booked an interview for ${jobTitle} at ${slotText}.\n${
        meetLink ? `\nGoogle Meet: ${meetLink}\n` : ""
      }${calendarLink ? `\nGoogle Calendar event: ${calendarLink}\n` : ""}${syncWarning}\nICS: ${icsUrl}`,
      html: `<p>A candidate has booked an interview for <strong>${jobTitle}</strong> at <strong>${slotText}</strong>.</p>${
        meetLink ? `<p><strong>Google Meet:</strong> <a href="${meetLink}">${meetLink}</a></p>` : ""
      }${calendarLink ? `<p><a href="${calendarLink}">Open Google Calendar event</a></p>` : ""}${
        syncResult.error ? `<p><strong>Calendar sync status:</strong> ${syncResult.error}</p>` : ""
      }<p><a href="${icsUrl}">Download ICS</a></p>`,
    });
  }

  revalidatePath(`/book/${token}`);
  redirect(`/book/${token}?success=1`);
}
