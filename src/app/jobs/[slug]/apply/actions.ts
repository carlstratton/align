"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { processApplicationScreening } from "@/lib/screening/process-application";

const MAX_CV_SIZE_BYTES = 3 * 1024 * 1024;
const ALLOWED_CV_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function submitApplicationAction(formData: FormData) {
  const slug = getString(formData, "slug");
  const name = getString(formData, "name");
  const email = getString(formData, "email");
  const phone = getString(formData, "phone");
  const consentAccepted = formData.get("consent") === "on";
  const file = formData.get("cv");

  if (!slug || !name || !email || !consentAccepted || !(file instanceof File)) {
    redirect(`/jobs/${slug}/apply?error=Please%20complete%20all%20required%20fields`);
  }

  if (!ALLOWED_CV_TYPES.has(file.type)) {
    redirect(
      `/jobs/${slug}/apply?error=Unsupported%20file%20type.%20Please%20re-save%20as%20DOCX%20or%20PDF.`,
    );
  }

  if (file.size > MAX_CV_SIZE_BYTES) {
    redirect(`/jobs/${slug}/apply?error=CV%20must%20be%203MB%20or%20smaller`);
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    redirect(`/jobs/${slug}/apply?error=Applications%20are%20temporarily%20unavailable`);
  }

  const { data: job } = await supabase
    .from("jobs")
    .select("id, status, application_method, screening_enabled")
    .eq("slug", slug)
    .single();

  if (!job || job.status !== "published" || job.application_method !== "internal") {
    redirect(`/jobs/${slug}/apply?error=This%20job%20is%20not%20accepting%20applications`);
  }

  const { data: candidate, error: candidateError } = await supabase
    .from("candidates")
    .insert({
      name,
      email,
      phone: phone || null,
    })
    .select("id")
    .single();

  if (candidateError || !candidate) {
    redirect(`/jobs/${slug}/apply?error=Could%20not%20save%20candidate%20details`);
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
  const cvStoragePath = `${job.id}/${candidate.id}/${crypto.randomUUID()}.${ext}`;
  const cvArrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("candidate-cvs")
    .upload(cvStoragePath, cvArrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    redirect(`/jobs/${slug}/apply?error=Could%20not%20upload%20CV`);
  }

  const { data: application, error: applicationError } = await supabase
    .from("applications")
    .insert({
      job_id: job.id,
      candidate_id: candidate.id,
      cv_storage_path: cvStoragePath,
      cv_original_filename: file.name,
      cv_mime_type: file.type,
      cv_file_size: file.size,
      consent_accepted: true,
      consent_text_version: "v1",
      consent_accepted_at: new Date().toISOString(),
      status: job.screening_enabled ? "processing" : "submitted",
    })
    .select("id")
    .single();

  if (applicationError || !application) {
    redirect(`/jobs/${slug}/apply?error=Could%20not%20create%20application`);
  }

  if (job.screening_enabled) {
    await processApplicationScreening(application.id);
  }

  redirect(`/jobs/${slug}/apply?success=1`);
}
