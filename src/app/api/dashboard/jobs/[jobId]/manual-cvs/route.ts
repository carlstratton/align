import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runManualCvBatchUpload } from "@/lib/applications/manual-cv-batch";

export const maxDuration = 300;
// Prevent Next.js from statically caching the queue GET response.
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { jobId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id, recruiter_id")
    .eq("id", jobId)
    .maybeSingle();

  if (jobError || !job || job.recruiter_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: rows, error: listError } = await supabase
    .from("applications")
    .select(
      "id, status, cv_original_filename, applied_at, screening_results(error_message)",
    )
    .eq("job_id", jobId)
    .eq("source", "recruiter_manual")
    .in("status", ["submitted", "processing", "error"])
    .order("applied_at", { ascending: false });

  if (listError) {
    console.error("manual-cvs GET applications query:", listError);
    return NextResponse.json(
      {
        error: "Could not load upload queue",
        detail: listError.message,
      },
      { status: 500 },
    );
  }

  const items = (rows ?? []).map((row) => {
    const sr = row.screening_results;
    const screening = Array.isArray(sr) ? sr[0] : sr;
    return {
      id: row.id,
      status: row.status,
      cv_original_filename: row.cv_original_filename,
      applied_at: row.applied_at,
      error_message: screening?.error_message ?? null,
    };
  });

  return NextResponse.json({ items });
}

export async function POST(request: Request, context: RouteContext) {
  const { jobId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart form data" }, { status: 400 });
  }

  const result = await runManualCvBatchUpload({
    supabase,
    jobId,
    userId: user.id,
    formData,
  });

  if (!result.ok) {
    const statusMap: Record<string, number> = {
      unauthorized: 401,
      forbidden: 403,
      bad_request: 400,
      service_unavailable: 503,
    };
    const status = statusMap[result.error.kind] ?? 500;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result);
}
