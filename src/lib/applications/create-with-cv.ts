import type { SupabaseClient } from "@supabase/supabase-js";

/** Stored filename; keep within a safe length for varchar columns. */
const MAX_ORIGINAL_FILENAME_LENGTH = 255;

type PgLikeError = {
  message: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
};

function formatPgError(prefix: string, error: PgLikeError | null | undefined): string {
  if (!error?.message) {
    return prefix;
  }
  const bits = [error.message, error.details, error.hint].filter(
    (s): s is string => typeof s === "string" && s.length > 0,
  );
  const core = bits.join(" — ");
  let out = `${prefix}: ${core}`;
  if (
    /source/i.test(core) &&
    (/column|schema cache|Could not find|'source'/i.test(core) || /PGRST/i.test(error.code ?? ""))
  ) {
    out +=
      " Run the migration `supabase/migrations/20260512180000_applications_source.sql` on your database (SQL Editor → run, or `supabase db push`), then reload the Supabase schema if needed.";
  }
  return out;
}

export const MAX_CV_SIZE_BYTES = 3 * 1024 * 1024;

export const ALLOWED_CV_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export type ApplicationSource = "candidate_apply" | "recruiter_manual";

export type ApplicationCreateStatus = "submitted" | "processing";

export type CreateApplicationWithCvParams = {
  jobId: string;
  file: File;
  candidateName: string;
  candidateEmail: string;
  phone?: string | null;
  consentTextVersion: string;
  status: ApplicationCreateStatus;
  source: ApplicationSource;
};

export function validateCvFile(file: File): string | null {
  if (!ALLOWED_CV_TYPES.has(file.type)) {
    return "Unsupported file type. Use PDF or DOCX.";
  }
  if (file.size > MAX_CV_SIZE_BYTES) {
    return "CV must be 3MB or smaller.";
  }
  return null;
}

export function displayNameFromCvFilename(filename: string): string {
  const base = filename.replace(/.*[/\\]/, "");
  const dot = base.lastIndexOf(".");
  const stem = (dot === -1 ? base : base.slice(0, dot)).replace(/[_]+/g, " ").trim();
  const cleaned = stem.slice(0, 200);
  return cleaned.length ? cleaned : "Manual upload";
}

export async function createApplicationWithUploadedCv(
  supabase: SupabaseClient,
  params: CreateApplicationWithCvParams,
): Promise<{ applicationId: string }> {
  const validationError = validateCvFile(params.file);
  if (validationError) {
    throw new Error(validationError);
  }

  const { data: candidate, error: candidateError } = await supabase
    .from("candidates")
    .insert({
      name: params.candidateName,
      email: params.candidateEmail,
      phone: params.phone ?? null,
    })
    .select("id")
    .single();

  if (candidateError || !candidate) {
    console.error("createApplicationWithUploadedCv candidate insert:", candidateError);
    throw new Error(formatPgError("Could not save candidate details", candidateError));
  }

  const ext = params.file.name.split(".").pop()?.toLowerCase() || "pdf";
  const cvStoragePath = `${params.jobId}/${candidate.id}/${crypto.randomUUID()}.${ext}`;
  const cvArrayBuffer = await params.file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("candidate-cvs")
    .upload(cvStoragePath, cvArrayBuffer, {
      contentType: params.file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("createApplicationWithUploadedCv storage upload:", uploadError);
    throw new Error(
      uploadError.message ? `Could not upload CV: ${uploadError.message}` : "Could not upload CV",
    );
  }

  const storedFilename = params.file.name.slice(0, MAX_ORIGINAL_FILENAME_LENGTH);

  const { data: application, error: applicationError } = await supabase
    .from("applications")
    .insert({
      job_id: params.jobId,
      candidate_id: candidate.id,
      cv_storage_path: cvStoragePath,
      cv_original_filename: storedFilename,
      cv_mime_type: params.file.type,
      cv_file_size: params.file.size,
      consent_accepted: true,
      consent_text_version: params.consentTextVersion,
      consent_accepted_at: new Date().toISOString(),
      status: params.status,
      source: params.source,
    })
    .select("id")
    .single();

  if (applicationError || !application) {
    console.error("createApplicationWithUploadedCv application insert:", applicationError);
    const { error: removeStorageErr } = await supabase.storage.from("candidate-cvs").remove([cvStoragePath]);
    if (removeStorageErr) {
      console.error("createApplicationWithUploadedCv cleanup storage:", removeStorageErr);
    }
    const { error: removeCandidateErr } = await supabase.from("candidates").delete().eq("id", candidate.id);
    if (removeCandidateErr) {
      console.error("createApplicationWithUploadedCv cleanup candidate:", removeCandidateErr);
    }
    throw new Error(formatPgError("Could not create application", applicationError));
  }

  return { applicationId: application.id };
}
