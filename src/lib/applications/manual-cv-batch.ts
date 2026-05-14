import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerEnv } from "@/lib/env";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createApplicationWithUploadedCv,
  displayNameFromCvFilename,
  validateCvFile,
} from "@/lib/applications/create-with-cv";

const MAX_FILES = 20;

/** Server actions sometimes deliver Blobs; normalize so validation and storage get a File. */
function filesFromFormData(formData: FormData): File[] {
  const raw = formData.getAll("files");
  const out: File[] = [];
  for (const entry of raw) {
    if (entry instanceof File) {
      out.push(entry);
      continue;
    }
    const maybeBlob = entry as unknown;
    if (typeof Blob !== "undefined" && maybeBlob instanceof Blob) {
      const type = maybeBlob.type || "application/octet-stream";
      const fallbackName = type.includes("pdf") ? "upload.pdf" : "upload.docx";
      out.push(new File([maybeBlob], fallbackName, { type }));
    }
  }
  return out;
}

async function moveManualUploadsToReview(
  supabase: SupabaseClient,
  params: { jobId: string; applicationIds: string[]; message: string },
) {
  const { jobId, applicationIds, message } = params;
  if (!applicationIds.length) return;

  const reviewedAt = Date.now();
  await supabase
    .from("applications")
    .update({ status: "review" })
    .in("id", applicationIds);

  await supabase.from("screening_results").upsert(
    applicationIds.map((applicationId) => ({
      application_id: applicationId,
      job_id: jobId,
      overall_score: 0,
      recommendation: "not_recommended" as const,
      decision_band: "review" as const,
      confidence_score: null,
      summary: "Screening could not start automatically and requires recruiter review.",
      score_breakdown: { method: "contextual-v1", failure: true, failed_at: reviewedAt },
      strengths: [],
      gaps: [],
      missing_requirements: [],
      relevant_experience: [],
      risk_flags: ["Automated screening did not start; manual review required."],
      suggested_follow_up_questions: [
        "Can you walk through your most relevant experience for this role?",
        "Which outcomes in your recent roles are you most proud of?",
      ],
      human_review_note:
        "This is an AI-assisted workflow fallback. Recruiter review is required before decisions.",
      model_provider: "anthropic",
      model_name: "unknown",
      prompt_version: "unknown",
      processing_time_ms: null,
      error_message: message,
    })),
    { onConflict: "application_id" },
  );
}

export type ManualCvBatchError =
  | { kind: "unauthorized" }
  | { kind: "forbidden" }
  | { kind: "bad_request"; message: string }
  | { kind: "service_unavailable" };

export type ManualCvBatchValidationDetail = { filename: string; message: string };

export type ManualCvBatchResult =
  | {
      ok: true;
      applicationIds: string[];
      errors: ManualCvBatchValidationDetail[];
    }
  | {
      ok: false;
      error: ManualCvBatchError;
      details?: ManualCvBatchValidationDetail[];
    };

/**
 * Shared implementation for recruiter manual CV batch upload (auth must be verified by caller).
 */
export async function runManualCvBatchUpload(params: {
  supabase: SupabaseClient;
  jobId: string;
  userId: string;
  formData: FormData;
}): Promise<ManualCvBatchResult> {
  const { supabase, jobId, userId, formData } = params;

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id, recruiter_id, screening_enabled, application_method")
    .eq("id", jobId)
    .maybeSingle();

  if (jobError || !job || job.recruiter_id !== userId) {
    return { ok: false, error: { kind: "forbidden" } };
  }

  if (job.application_method !== "internal") {
    return {
      ok: false,
      error: {
        kind: "bad_request",
        message: "Manual CV upload is only available for internal-apply jobs.",
      },
    };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { ok: false, error: { kind: "service_unavailable" } };
  }

  const files = filesFromFormData(formData);

  if (files.length === 0) {
    return {
      ok: false,
      error: { kind: "bad_request", message: "No files provided" },
    };
  }

  if (files.length > MAX_FILES) {
    return {
      ok: false,
      error: { kind: "bad_request", message: `At most ${MAX_FILES} files per upload` },
    };
  }

  const validationErrors: ManualCvBatchValidationDetail[] = [];
  for (const file of files) {
    const msg = validateCvFile(file);
    if (msg) {
      validationErrors.push({ filename: file.name, message: msg });
    }
  }
  if (validationErrors.length) {
    return {
      ok: false,
      error: { kind: "bad_request", message: "Validation failed" },
      details: validationErrors,
    };
  }

  const applicationIds: string[] = [];
  const errors: ManualCvBatchValidationDetail[] = [];

  for (const file of files) {
    try {
      const { applicationId } = await createApplicationWithUploadedCv(admin, {
        jobId: job.id,
        file,
        candidateName: displayNameFromCvFilename(file.name),
        candidateEmail: `manual-${crypto.randomUUID()}@candidates.local`,
        phone: null,
        consentTextVersion: "recruiter-manual-v1",
        status: "submitted",
        source: "recruiter_manual",
      });
      applicationIds.push(applicationId);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Upload failed";
      errors.push({ filename: file.name, message });
    }
  }

  if (!job.screening_enabled && applicationIds.length) {
    await moveManualUploadsToReview(admin, {
      jobId: job.id,
      applicationIds,
      message: "Screening is disabled for this job; manual review required.",
    });
  }

  if (job.screening_enabled && applicationIds.length) {
    const ids = [...applicationIds];
    const { APP_BASE_URL } = getServerEnv();
    after(async () => {
      for (const id of ids) {
        try {
          await fetch(`${APP_BASE_URL}/api/applications/${id}/screen`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          console.error("Manual CV screening dispatch failed:", id, err);
          await moveManualUploadsToReview(admin, {
            jobId: job.id,
            applicationIds: [id],
            message: err instanceof Error ? err.message : "Screening dispatch failed.",
          });
        }
      }
    });
  }

  return { ok: true, applicationIds, errors };
}
