import type { SupabaseClient } from "@supabase/supabase-js";

export const JOB_LOGOS_BUCKET = "job-logos";

export const ALLOWED_JOB_LOGO_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export const MAX_JOB_LOGO_BYTES = 2 * 1024 * 1024;

export function validateJobLogoFile(file: File): string | null {
  if (!ALLOWED_JOB_LOGO_TYPES.has(file.type)) {
    return "Job logo must be PNG, JPEG, or WebP.";
  }
  if (file.size > MAX_JOB_LOGO_BYTES) {
    return "Job logo must be 2MB or smaller.";
  }
  return null;
}

/**
 * Uploads a logo to the job-logos bucket and returns the storage path.
 * Path format: {userId}/{uuid}.{ext} — no job ID needed at upload time.
 * Uses the admin client so auth.uid() issues in server actions do not block uploads.
 */
export async function uploadJobLogoToStorage(
  adminClient: SupabaseClient,
  params: { userId: string; file: File; previousPath: string | null },
): Promise<{ path: string | null; error: string | null }> {
  const validationError = validateJobLogoFile(params.file);
  if (validationError) {
    return { path: null, error: validationError };
  }

  const extRaw = params.file.name.split(".").pop()?.toLowerCase();
  const ext =
    params.file.type === "image/png"
      ? "png"
      : params.file.type === "image/webp"
        ? "webp"
        : extRaw === "jpg" || extRaw === "jpeg"
          ? "jpg"
          : "png";
  const storagePath = `${params.userId}/${crypto.randomUUID()}.${ext}`;

  const body = await params.file.arrayBuffer();
  const { error: uploadError } = await adminClient.storage
    .from(JOB_LOGOS_BUCKET)
    .upload(storagePath, body, { contentType: params.file.type, upsert: false });

  if (uploadError) {
    return {
      path: null,
      error: uploadError.message ? `Could not upload logo: ${uploadError.message}` : "Could not upload logo",
    };
  }

  if (params.previousPath) {
    await adminClient.storage.from(JOB_LOGOS_BUCKET).remove([params.previousPath]);
  }

  return { path: storagePath, error: null };
}

export function getJobLogoPublicUrl(supabaseUrl: string, storagePath: string | null): string | null {
  if (!storagePath) return null;
  const base = supabaseUrl.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${JOB_LOGOS_BUCKET}/${storagePath}`;
}
