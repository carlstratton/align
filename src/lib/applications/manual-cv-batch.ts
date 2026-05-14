import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

  if (job.screening_enabled && applicationIds.length) {
    const ids = [...applicationIds];
    try {
      after(async () => {
        const { processApplicationScreening } = await import("@/lib/screening/process-application");
        for (const id of ids) {
          try {
            await processApplicationScreening(id);
          } catch (err) {
            console.error("Manual CV screening failed:", id, err);
          }
        }
      });
    } catch (afterErr) {
      console.error("manual-cv-batch: after() registration failed", afterErr);
    }
  }

  return { ok: true, applicationIds, errors };
}
