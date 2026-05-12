"use server";

import { createClient } from "@/lib/supabase/server";
import { runManualCvBatchUpload } from "@/lib/applications/manual-cv-batch";
import type { ManualCvBatchResult } from "@/lib/applications/manual-cv-batch";

export type UploadManualCvsActionResult = ManualCvBatchResult;

export async function uploadManualCvsAction(
  jobId: string,
  formData: FormData,
): Promise<UploadManualCvsActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: { kind: "unauthorized" } };
  }

  return runManualCvBatchUpload({
    supabase,
    jobId,
    userId: user.id,
    formData,
  });
}
