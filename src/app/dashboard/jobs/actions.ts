"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { jobDraftSchema } from "@/lib/validation/job";
import { fromMultiline, toJobPayload } from "@/lib/jobs";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getNumber(formData: FormData, key: string, fallback = 0) {
  const value = Number(getString(formData, key));
  return Number.isFinite(value) ? value : fallback;
}

function buildJobFormData(formData: FormData) {
  return {
    company_id: getString(formData, "company_id"),
    title: getString(formData, "title"),
    role_category: getString(formData, "role_category"),
    location_country: getString(formData, "location_country"),
    location_city: getString(formData, "location_city"),
    remote_type: getString(formData, "remote_type"),
    employment_type: getString(formData, "employment_type"),
    seniority: getString(formData, "seniority"),
    salary_min: getNumber(formData, "salary_min"),
    salary_max: getNumber(formData, "salary_max"),
    salary_currency: getString(formData, "salary_currency").toUpperCase(),
    summary: getString(formData, "summary"),
    responsibilities: fromMultiline(getString(formData, "responsibilities")),
    requirements: fromMultiline(getString(formData, "requirements")),
    nice_to_haves: fromMultiline(getString(formData, "nice_to_haves")),
    benefits: fromMultiline(getString(formData, "benefits")),
    skills: fromMultiline(getString(formData, "skills")),
    screening_threshold: getNumber(formData, "screening_threshold", 70),
  };
}

function formatValidationError(error: {
  issues: Array<{ path: PropertyKey[]; message: string }>;
}) {
  const messages = error.issues
    .map((issue) => {
      const field = String(issue.path[0] ?? "field")
        .replaceAll("_", " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
      return `${field}: ${issue.message}`;
    })
    .slice(0, 4);

  if (messages.length === 0) {
    return "Please check the form fields and try again.";
  }

  return messages.join(" | ");
}

export async function createCompanyAction(formData: FormData) {
  const name = getString(formData, "name");
  if (!name) {
    redirect("/dashboard/jobs/new?error=Company%20name%20is%20required");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Backfill profile for users created before profile bootstrap was added.
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!existingProfile) {
    const { error: profileError } = await supabase.from("profiles").insert({
      id: user.id,
      full_name: typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null,
      email: user.email ?? null,
      role: "recruiter",
    });

    if (profileError) {
      redirect(`/dashboard/jobs/new?error=${encodeURIComponent(profileError.message)}`);
    }
  }

  const { error } = await supabase.from("companies").insert({
    owner_id: user.id,
    name,
    slug: name.toLowerCase().replace(/\s+/g, "-"),
  });

  if (error) {
    redirect(`/dashboard/jobs/new?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/jobs");
  revalidatePath("/dashboard/jobs/new");
  redirect("/dashboard/jobs/new");
}

export async function createJobAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const parsed = jobDraftSchema.safeParse(buildJobFormData(formData));
  if (!parsed.success) {
    const message = formatValidationError(parsed.error);
    redirect(`/dashboard/jobs/new?error=${encodeURIComponent(message)}`);
  }

  const status = getString(formData, "intent") === "publish" ? "published" : "draft";
  const payload = toJobPayload(parsed.data, user.id);
  const { data, error } = await supabase
    .from("jobs")
    .insert({
      ...payload,
      status,
      published_at: status === "published" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(`/dashboard/jobs/new?error=${encodeURIComponent(error?.message ?? "Failed to create job")}`);
  }

  revalidatePath("/dashboard/jobs");
  redirect(`/dashboard/jobs/${data.id}`);
}

export async function updateJobAction(formData: FormData) {
  const jobId = getString(formData, "job_id");
  const supabase = await createClient();
  const parsed = jobDraftSchema.safeParse(buildJobFormData(formData));
  if (!parsed.success) {
    const message = formatValidationError(parsed.error);
    redirect(`/dashboard/jobs/${jobId}/edit?error=${encodeURIComponent(message)}`);
  }

  const { error } = await supabase.from("jobs").update(parsed.data).eq("id", jobId);
  if (error) {
    redirect(`/dashboard/jobs/${jobId}/edit?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/jobs");
  revalidatePath(`/dashboard/jobs/${jobId}`);
  redirect(`/dashboard/jobs/${jobId}`);
}

export async function setJobStatusAction(formData: FormData) {
  const jobId = getString(formData, "job_id");
  const status = getString(formData, "status");
  const supabase = await createClient();

  const updates: Record<string, string | null> = { status };
  if (status === "published") {
    updates.published_at = new Date().toISOString();
    updates.closed_at = null;
  }
  if (status === "closed") {
    updates.closed_at = new Date().toISOString();
  }

  const { error } = await supabase.from("jobs").update(updates).eq("id", jobId);
  if (error) {
    redirect(`/dashboard/jobs/${jobId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/jobs");
  revalidatePath(`/dashboard/jobs/${jobId}`);
  redirect(`/dashboard/jobs/${jobId}`);
}
