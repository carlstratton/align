"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerEnv } from "@/lib/env";
import { sendEmail } from "@/lib/email/send-email";
import { syncBookingToGoogleCalendar } from "@/lib/google/calendar-sync";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function pickFirst<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function updateApplicationStatusAction(formData: FormData) {
  const applicationId = getString(formData, "application_id");
  const jobId = getString(formData, "job_id");
  const status = getString(formData, "status");
  const supabase = await createClient();

  const { error } = await supabase
    .from("applications")
    .update({
      status,
      manual_status: status,
    })
    .eq("id", applicationId);

  if (error) {
    redirect(`/dashboard/applications/${applicationId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/dashboard/applications/${applicationId}`);
  revalidatePath(`/dashboard/jobs/${jobId}/applications`);
  redirect(`/dashboard/applications/${applicationId}`);
}

export async function createBookingLinkAction(formData: FormData) {
  const applicationId = getString(formData, "application_id");
  const jobId = getString(formData, "job_id");
  const recruiterId = getString(formData, "recruiter_id");
  const supabase = await createClient();
  const token = crypto.randomUUID();

  const { error } = await supabase.from("booking_links").insert({
    application_id: applicationId,
    recruiter_id: recruiterId,
    token,
    status: "active",
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
  });

  if (error) {
    redirect(`/dashboard/applications/${applicationId}?error=${encodeURIComponent(error.message)}`);
  }

  const { data: context } = await supabase
    .from("applications")
    .select("id, candidates(name, email), jobs(title)")
    .eq("id", applicationId)
    .single();
  const appBaseUrl = getServerEnv().APP_BASE_URL;
  const bookingUrl = `${appBaseUrl}/book/${token}`;

  const candidate = pickFirst(
    context?.candidates as { name?: string | null; email?: string | null } | Array<{ name?: string | null; email?: string | null }> | null | undefined,
  );
  const job = pickFirst(
    context?.jobs as { title?: string | null } | Array<{ title?: string | null }> | null | undefined,
  );
  const candidateEmail = candidate && "email" in candidate ? String(candidate.email ?? "") : "";
  const candidateName = candidate && "name" in candidate ? String(candidate.name ?? "Candidate") : "Candidate";
  const jobTitle = job && "title" in job ? String(job.title ?? "the role") : "the role";

  if (!candidateEmail) {
    redirect(`/dashboard/applications/${applicationId}?error=Candidate%20email%20is%20missing%2C%20invite%20was%20not%20sent`);
  }

  const emailResult = await sendEmail({
      to: candidateEmail,
      subject: `Interview invitation for ${jobTitle}`,
      text: `Hi ${candidateName},\n\nYou are invited to schedule an interview for ${jobTitle}.\n\nBook here: ${bookingUrl}\n\nBest regards,\nRecruitment Team`,
      html: `<p>Hi ${candidateName},</p><p>You are invited to schedule an interview for <strong>${jobTitle}</strong>.</p><p><a href="${bookingUrl}">Book your interview slot</a></p><p>Best regards,<br/>Recruitment Team</p>`,
  });

  if (!emailResult.sent) {
    redirect(
      `/dashboard/applications/${applicationId}?error=${encodeURIComponent(
        `Interview link created, but invite email failed to send: ${emailResult.reason ?? "unknown error"}`,
      )}`,
    );
  }

  revalidatePath(`/dashboard/applications/${applicationId}`);
  revalidatePath(`/dashboard/jobs/${jobId}/applications`);
  redirect(`/dashboard/applications/${applicationId}?success=invite`);
}

export async function retryBookingCalendarSyncAction(formData: FormData) {
  const applicationId = getString(formData, "application_id");
  const bookingId = getString(formData, "booking_id");
  const jobId = getString(formData, "job_id");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: application } = await supabase
    .from("applications")
    .select("jobs(recruiter_id)")
    .eq("id", applicationId)
    .single();
  const jobs = application?.jobs;
  const recruiterId =
    jobs && typeof jobs === "object" && "recruiter_id" in jobs ? String(jobs.recruiter_id ?? "") : "";
  if (!recruiterId || recruiterId !== user.id) {
    redirect(`/dashboard/applications/${applicationId}?error=You%20are%20not%20authorized%20to%20sync%20this%20booking`);
  }

  const result = await syncBookingToGoogleCalendar(bookingId);
  revalidatePath(`/dashboard/applications/${applicationId}`);
  revalidatePath(`/dashboard/jobs/${jobId}/applications`);
  if (!result.ok) {
    redirect(`/dashboard/applications/${applicationId}?error=${encodeURIComponent(result.error ?? "Calendar sync failed")}`);
  }
  redirect(`/dashboard/applications/${applicationId}?success=calendar-sync`);
}
