"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jobDraftSchema } from "@/lib/validation/job";
import { fromMultiline, toJobPayload } from "@/lib/jobs";
import { uploadCompanyLogoAndUpdateRow } from "@/lib/company-logo";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getFormFile(formData: FormData, key: string): File | null {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
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
    hybrid_office_days_per_week:
      getString(formData, "remote_type") === "hybrid"
        ? Math.min(5, Math.max(0, getNumber(formData, "hybrid_office_days_per_week", 0)))
        : 0,
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

  const intent = getString(formData, "intent");
  const status = intent === "publish" ? "published" : "draft";

  const { data: companyRow, error: companyFetchError } = await supabase
    .from("companies")
    .select("logo_storage_path, owner_id")
    .eq("id", parsed.data.company_id)
    .maybeSingle();

  if (companyFetchError || !companyRow || companyRow.owner_id !== user.id) {
    redirect(`/dashboard/jobs/new?error=${encodeURIComponent("Invalid company selection.")}`);
  }

  const logoFile = getFormFile(formData, "company_logo");
  let logoPath = companyRow.logo_storage_path;

  if (logoFile) {
    const { error: logoErr } = await uploadCompanyLogoAndUpdateRow(createAdminClient(), {
      companyId: parsed.data.company_id,
      file: logoFile,
      previousPath: companyRow.logo_storage_path,
    });
    if (logoErr) {
      redirect(`/dashboard/jobs/new?error=${encodeURIComponent(logoErr)}`);
    }
    const { data: refreshed } = await supabase
      .from("companies")
      .select("logo_storage_path")
      .eq("id", parsed.data.company_id)
      .single();
    logoPath = refreshed?.logo_storage_path ?? null;
  }

  if (status === "published" && !logoPath) {
    redirect(
      `/dashboard/jobs/new?error=${encodeURIComponent("Add a company logo (PNG, JPEG, or WebP) before publishing.")}`,
    );
  }

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
  revalidatePath("/jobs");
  redirect(`/dashboard/jobs/${data.id}`);
}

export async function updateJobAction(formData: FormData) {
  const jobId = getString(formData, "job_id");
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
    redirect(`/dashboard/jobs/${jobId}/edit?error=${encodeURIComponent(message)}`);
  }

  const { data: jobRow, error: jobFetchError } = await supabase
    .from("jobs")
    .select("recruiter_id")
    .eq("id", jobId)
    .maybeSingle();

  if (jobFetchError || !jobRow || jobRow.recruiter_id !== user.id) {
    redirect(`/dashboard/jobs/${jobId}/edit?error=${encodeURIComponent("You cannot edit this job.")}`);
  }

  const { data: companyRow, error: companyFetchError } = await supabase
    .from("companies")
    .select("logo_storage_path, owner_id")
    .eq("id", parsed.data.company_id)
    .maybeSingle();

  if (companyFetchError || !companyRow || companyRow.owner_id !== user.id) {
    redirect(`/dashboard/jobs/${jobId}/edit?error=${encodeURIComponent("Invalid company selection.")}`);
  }

  const logoFile = getFormFile(formData, "company_logo");
  if (logoFile) {
    const { error: logoErr } = await uploadCompanyLogoAndUpdateRow(createAdminClient(), {
      companyId: parsed.data.company_id,
      file: logoFile,
      previousPath: companyRow.logo_storage_path,
    });
    if (logoErr) {
      redirect(`/dashboard/jobs/${jobId}/edit?error=${encodeURIComponent(logoErr)}`);
    }
  }

  const { error } = await supabase
    .from("jobs")
    .update({
      ...parsed.data,
      role_category: parsed.data.role_category.trim() === "" ? null : parsed.data.role_category.trim(),
      hybrid_office_days_per_week:
        parsed.data.remote_type === "hybrid" && parsed.data.hybrid_office_days_per_week > 0
          ? parsed.data.hybrid_office_days_per_week
          : null,
    })
    .eq("id", jobId);
  if (error) {
    redirect(`/dashboard/jobs/${jobId}/edit?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/jobs");
  revalidatePath(`/dashboard/jobs/${jobId}`);
  revalidatePath("/jobs");
  redirect(`/dashboard/jobs/${jobId}`);
}

export async function setJobStatusAction(formData: FormData) {
  const jobId = getString(formData, "job_id");
  const status = getString(formData, "status");
  const supabase = await createClient();

  if (status === "published") {
    const { data: jobRow } = await supabase.from("jobs").select("company_id").eq("id", jobId).maybeSingle();
    if (jobRow?.company_id) {
      const { data: companyRow } = await supabase
        .from("companies")
        .select("logo_storage_path")
        .eq("id", jobRow.company_id)
        .maybeSingle();
      if (!companyRow?.logo_storage_path) {
        redirect(
          `/dashboard/jobs/${jobId}?error=${encodeURIComponent("Add a company logo on the edit job page before publishing.")}`,
        );
      }
    }
  }

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
  revalidatePath("/jobs");
  redirect(`/dashboard/jobs/${jobId}`);
}
