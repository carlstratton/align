"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createApplicationWithUploadedCv,
  validateCvFile,
} from "@/lib/applications/create-with-cv";

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

  const cvError = validateCvFile(file);
  if (cvError) {
    redirect(`/jobs/${slug}/apply?error=${encodeURIComponent(cvError)}`);
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

  let applicationId: string;
  try {
    ({ applicationId } = await createApplicationWithUploadedCv(supabase, {
      jobId: job.id,
      file,
      candidateName: name,
      candidateEmail: email,
      phone: phone || null,
      consentTextVersion: "v1",
      status: job.screening_enabled ? "processing" : "submitted",
      source: "candidate_apply",
    }));
  } catch {
    redirect(`/jobs/${slug}/apply?error=Could%20not%20submit%20application.%20Please%20try%20again.`);
  }

  if (job.screening_enabled) {
    const { processApplicationScreening } = await import("@/lib/screening/process-application");
    await processApplicationScreening(applicationId);
  }

  redirect(`/jobs/${slug}/apply?success=1`);
}
