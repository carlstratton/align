"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jobDraftSchema } from "@/lib/validation/job";
import { fromMultiline, toJobPayload } from "@/lib/jobs";
import { uploadJobLogoToStorage } from "@/lib/job-logo";
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
    hide_company_identity: formData.get("hide_company_identity") === "on",
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

export type CompanyUpsertState = {
  ok: boolean;
  error: string | null;
  company: {
    id: string;
    name: string;
    logo_storage_path: string | null;
    about: string | null;
  } | null;
};

export async function createCompanyAction(
  _prevState: CompanyUpsertState,
  formData: FormData,
): Promise<CompanyUpsertState> {
  const name = getString(formData, "name");
  if (!name) {
    return { ok: false, error: "Company name is required.", company: null };
  }

  const about = getString(formData, "about") || null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "You must be signed in.", company: null };
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
      return { ok: false, error: profileError.message, company: null };
    }
  }

  const { data: insertedCompany, error: insertError } = await supabase
    .from("companies")
    .insert({
      owner_id: user.id,
      name,
      slug: name.toLowerCase().replace(/\s+/g, "-"),
      about,
    })
    .select("id, name, logo_storage_path, about")
    .single();

  if (insertError || !insertedCompany) {
    return { ok: false, error: insertError?.message ?? "Failed to create company.", company: null };
  }

  const logoFile = getFormFile(formData, "logo");
  if (logoFile) {
    const adminSupabase = createAdminClient();
    const { error: logoErr } = await uploadCompanyLogoAndUpdateRow(adminSupabase, {
      companyId: insertedCompany.id,
      file: logoFile,
      previousPath: null,
    });
    if (logoErr) {
      return { ok: false, error: logoErr, company: insertedCompany };
    }
    const { data: withLogo } = await supabase
      .from("companies")
      .select("id, name, logo_storage_path, about")
      .eq("id", insertedCompany.id)
      .single();
    if (withLogo) {
      revalidatePath("/dashboard/jobs");
      revalidatePath("/dashboard/jobs/new");
      return { ok: true, error: null, company: withLogo };
    }
  }

  revalidatePath("/dashboard/jobs");
  revalidatePath("/dashboard/jobs/new");
  return { ok: true, error: null, company: insertedCompany };
}

export async function updateCompanyAction(
  _prevState: CompanyUpsertState,
  formData: FormData,
): Promise<CompanyUpsertState> {
  const companyId = getString(formData, "company_id");
  const name = getString(formData, "name");
  if (!companyId) return { ok: false, error: "Missing company ID.", company: null };
  if (!name) return { ok: false, error: "Company name is required.", company: null };

  const about = getString(formData, "about") || null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "You must be signed in.", company: null };

  const { data: existing, error: fetchErr } = await supabase
    .from("companies")
    .select("owner_id, logo_storage_path")
    .eq("id", companyId)
    .maybeSingle();

  if (fetchErr || !existing || existing.owner_id !== user.id) {
    return { ok: false, error: "Company not found or access denied.", company: null };
  }

  const { error: updateErr } = await supabase
    .from("companies")
    .update({ name, about, slug: name.toLowerCase().replace(/\s+/g, "-") })
    .eq("id", companyId);

  if (updateErr) {
    return { ok: false, error: updateErr.message, company: null };
  }

  const logoFile = getFormFile(formData, "logo");
  if (logoFile) {
    const adminSupabase = createAdminClient();
    const { error: logoErr } = await uploadCompanyLogoAndUpdateRow(adminSupabase, {
      companyId,
      file: logoFile,
      previousPath: existing.logo_storage_path,
    });
    if (logoErr) {
      return { ok: false, error: logoErr, company: null };
    }
  }

  const { data: updated } = await supabase
    .from("companies")
    .select("id, name, logo_storage_path, about")
    .eq("id", companyId)
    .single();

  revalidatePath("/dashboard/jobs");
  revalidatePath("/dashboard/jobs/new");
  return { ok: true, error: null, company: updated ?? null };
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
    .select("owner_id, logo_storage_path")
    .eq("id", parsed.data.company_id)
    .maybeSingle();

  if (companyFetchError || !companyRow || companyRow.owner_id !== user.id) {
    redirect(`/dashboard/jobs/new?error=${encodeURIComponent("Invalid company selection.")}`);
  }

  const logoFile = getFormFile(formData, "company_logo");
  let logoPath: string | null = null;

  if (logoFile) {
    const { path, error: logoErr } = await uploadJobLogoToStorage(createAdminClient(), {
      userId: user.id,
      file: logoFile,
      previousPath: null,
    });
    if (logoErr) {
      redirect(`/dashboard/jobs/new?error=${encodeURIComponent(logoErr)}`);
    }
    logoPath = path;
  }

  const hasListingImage = Boolean(logoPath || companyRow.logo_storage_path || parsed.data.hide_company_identity);
  if (status === "published" && !hasListingImage) {
    redirect(
      `/dashboard/jobs/new?error=${encodeURIComponent(
        "Add a listing logo on this form or upload a company badge in the company dialog before publishing.",
      )}`,
    );
  }

  const payload = toJobPayload(parsed.data, user.id);
  const { data, error } = await supabase
    .from("jobs")
    .insert({
      ...payload,
      logo_storage_path: logoPath,
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
  redirect(`/dashboard/jobs/${data.id}${status === "published" ? "?published=true" : ""}`);
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
    .select("owner_id")
    .eq("id", parsed.data.company_id)
    .maybeSingle();

  if (companyFetchError || !companyRow || companyRow.owner_id !== user.id) {
    redirect(`/dashboard/jobs/${jobId}/edit?error=${encodeURIComponent("Invalid company selection.")}`);
  }

  const { data: existingJob } = await supabase
    .from("jobs")
    .select("logo_storage_path")
    .eq("id", jobId)
    .single();

  const logoFile = getFormFile(formData, "company_logo");
  let newLogoPath: string | null | undefined;

  if (logoFile) {
    const { path, error: logoErr } = await uploadJobLogoToStorage(createAdminClient(), {
      userId: user.id,
      file: logoFile,
      previousPath: existingJob?.logo_storage_path ?? null,
    });
    if (logoErr) {
      redirect(`/dashboard/jobs/${jobId}/edit?error=${encodeURIComponent(logoErr)}`);
    }
    newLogoPath = path;
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
      ...(newLogoPath !== undefined ? { logo_storage_path: newLogoPath } : {}),
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login");
  }

  const { data: jobRow, error: jobFetchError } = await supabase
    .from("jobs")
    .select("logo_storage_path, company_id, recruiter_id, hide_company_identity")
    .eq("id", jobId)
    .maybeSingle();

  if (jobFetchError || !jobRow || jobRow.recruiter_id !== user.id) {
    redirect(`/dashboard/jobs/${jobId}?error=${encodeURIComponent("You cannot update this job.")}`);
  }

  if (status === "published") {
    const { data: companyRow } = await supabase
      .from("companies")
      .select("logo_storage_path")
      .eq("id", jobRow.company_id)
      .maybeSingle();
    const hasListingImage = Boolean(jobRow.logo_storage_path || companyRow?.logo_storage_path || jobRow.hide_company_identity);
    if (!hasListingImage) {
      redirect(
        `/dashboard/jobs/${jobId}?error=${encodeURIComponent(
          "Add a listing logo on the edit job page, or upload a company badge when creating or editing the company.",
        )}`,
      );
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
  redirect(`/dashboard/jobs/${jobId}${status === "published" ? "?published=true" : ""}`);
}
