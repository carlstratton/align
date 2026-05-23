import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { createAdminClient } from "@/lib/supabase/admin";

/** Prefer service role on the server so the public board works without anon RLS; fall back to anon client. */
function publicBoardClient() {
  try {
    return createAdminClient();
  } catch {
    return createPublicSupabaseClient();
  }
}

const LIST_SELECT =
  "id, slug, title, location_city, location_country, remote_type, hybrid_office_days_per_week, employment_type, salary_min, salary_max, salary_currency, logo_storage_path, created_at, published_at, hide_company_identity, companies(name, logo_storage_path)";

const DETAIL_SELECT =
  "id, title, summary, role_category, location_country, location_city, remote_type, hybrid_office_days_per_week, employment_type, seniority, salary_min, salary_max, salary_currency, logo_storage_path, responsibilities, requirements, nice_to_haves, benefits, skills, status, application_method, external_apply_url, hide_company_identity, companies(name, logo_storage_path)";

const APPLY_GATE_SELECT = "id, title, status, application_method";

export async function getPublishedJobsForBoard() {
  const supabase = publicBoardClient();
  const { data, error } = await supabase
    .from("jobs")
    .select(LIST_SELECT)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getPublishedJobsForBoard]", error.message, error.code, error.details);
    return { jobs: [] as unknown[], error };
  }
  return { jobs: data ?? [], error: null };
}

export async function getPublishedJobDetailBySlug(slug: string) {
  const supabase = publicBoardClient();
  const { data, error } = await supabase
    .from("jobs")
    .select(DETAIL_SELECT)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    console.error("[getPublishedJobDetailBySlug]", error.message, error.code, error.details);
    return { job: null, error };
  }
  return { job: data, error: null };
}

export async function getPublishedJobApplyGateBySlug(slug: string) {
  const supabase = publicBoardClient();
  const { data, error } = await supabase
    .from("jobs")
    .select(APPLY_GATE_SELECT)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    console.error("[getPublishedJobApplyGateBySlug]", error.message, error.code, error.details);
    return { job: null, error };
  }
  return { job: data, error: null };
}
