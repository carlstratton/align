import type { SupabaseClient } from "@supabase/supabase-js";

export const COMPANY_LOGOS_BUCKET = "company-logos";

export const ALLOWED_COMPANY_LOGO_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

/** 2MB — company logos only */
export const MAX_COMPANY_LOGO_BYTES = 2 * 1024 * 1024;

export function validateCompanyLogoFile(file: File): string | null {
  if (!ALLOWED_COMPANY_LOGO_TYPES.has(file.type)) {
    return "Company logo must be PNG, JPEG, or WebP.";
  }
  if (file.size > MAX_COMPANY_LOGO_BYTES) {
    return "Company logo must be 2MB or smaller.";
  }
  return null;
}

export function buildCompanyLogoStoragePath(companyId: string, file: File): string {
  const extRaw = file.name.split(".").pop()?.toLowerCase();
  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : extRaw === "jpg" || extRaw === "jpeg"
          ? "jpg"
          : "png";
  return `${companyId}/${crypto.randomUUID()}.${ext}`;
}

export async function uploadCompanyLogoAndUpdateRow(
  supabase: SupabaseClient,
  params: { companyId: string; file: File; previousPath: string | null },
): Promise<{ error: string | null }> {
  const validationError = validateCompanyLogoFile(params.file);
  if (validationError) {
    return { error: validationError };
  }

  const path = buildCompanyLogoStoragePath(params.companyId, params.file);
  const body = await params.file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(COMPANY_LOGOS_BUCKET)
    .upload(path, body, {
      contentType: params.file.type,
      upsert: false,
    });

  if (uploadError) {
    return {
      error: uploadError.message ? `Could not upload logo: ${uploadError.message}` : "Could not upload logo",
    };
  }

  const { error: updateError } = await supabase
    .from("companies")
    .update({ logo_storage_path: path })
    .eq("id", params.companyId);

  if (updateError) {
    await supabase.storage.from(COMPANY_LOGOS_BUCKET).remove([path]);
    return { error: updateError.message ?? "Could not save logo path" };
  }

  if (params.previousPath && params.previousPath !== path) {
    await supabase.storage.from(COMPANY_LOGOS_BUCKET).remove([params.previousPath]);
  }

  return { error: null };
}

export function getCompanyLogoPublicUrl(supabaseUrl: string, storagePath: string | null): string | null {
  if (!storagePath) return null;
  const base = supabaseUrl.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${COMPANY_LOGOS_BUCKET}/${storagePath}`;
}
