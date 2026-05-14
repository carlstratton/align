"use server";

import { createClient } from "@/lib/supabase/server";
import { runManualCvBatchUpload } from "@/lib/applications/manual-cv-batch";
import type { ManualCvBatchResult } from "@/lib/applications/manual-cv-batch";

export type UploadManualCvsActionResult = ManualCvBatchResult;

export async function uploadManualCvsAction(
  jobId: string,
  formData: FormData,
): Promise<UploadManualCvsActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { ok: false, error: { kind: "unauthorized" } };
    }

    return await runManualCvBatchUpload({
      supabase,
      jobId,
      userId: user.id,
      formData,
    });
  } catch (err) {
    console.error("uploadManualCvsAction failed:", err);
    return { ok: false, error: { kind: "service_unavailable" } };
  }
}
