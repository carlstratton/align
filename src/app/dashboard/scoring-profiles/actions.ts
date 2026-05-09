"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_SCORING_PROFILE } from "@/lib/screening/scoring-profiles";

const profileInputSchema = z.object({
  key: z.string().min(2),
  name: z.string().min(2),
  version: z.string().min(2),
  model: z.string().min(2),
  prompt_template: z.string().min(20),
  role_relevance: z.number().min(0),
  tenure_stability: z.number().min(0),
  education_quality: z.number().min(0),
  achievements_impact: z.number().min(0),
  consistency_risk: z.number().min(0),
  review_buffer_below_threshold: z.number().int().min(0).max(30),
  low_confidence_cutoff: z.number().int().min(0).max(100),
  high_risk_flags_for_review: z.number().int().min(1).max(10),
});

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login");
  }
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getNumber(formData: FormData, key: string, fallback = 0) {
  const parsed = Number(getString(formData, key));
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function createScoringProfileAction(formData: FormData) {
  await requireAuth();
  const parsed = profileInputSchema.safeParse({
    key: getString(formData, "key"),
    name: getString(formData, "name"),
    version: getString(formData, "version"),
    model: getString(formData, "model"),
    prompt_template: getString(formData, "prompt_template"),
    role_relevance: getNumber(formData, "role_relevance"),
    tenure_stability: getNumber(formData, "tenure_stability"),
    education_quality: getNumber(formData, "education_quality"),
    achievements_impact: getNumber(formData, "achievements_impact"),
    consistency_risk: getNumber(formData, "consistency_risk"),
    review_buffer_below_threshold: getNumber(formData, "review_buffer_below_threshold", 12),
    low_confidence_cutoff: getNumber(formData, "low_confidence_cutoff", 45),
    high_risk_flags_for_review: getNumber(formData, "high_risk_flags_for_review", 3),
  });
  if (!parsed.success) {
    redirect("/dashboard/scoring-profiles?error=Invalid%20profile%20input");
  }

  const sum =
    parsed.data.role_relevance +
    parsed.data.tenure_stability +
    parsed.data.education_quality +
    parsed.data.achievements_impact +
    parsed.data.consistency_risk;
  if (sum <= 0) {
    redirect("/dashboard/scoring-profiles?error=Weights%20must%20sum%20to%20more%20than%200");
  }
  const weights = {
    role_relevance: parsed.data.role_relevance / sum,
    tenure_stability: parsed.data.tenure_stability / sum,
    education_quality: parsed.data.education_quality / sum,
    achievements_impact: parsed.data.achievements_impact / sum,
    consistency_risk: parsed.data.consistency_risk / sum,
  };

  const supabase = createAdminClient();
  const { error } = await supabase.from("scoring_profiles").insert({
    key: parsed.data.key,
    name: parsed.data.name,
    version: parsed.data.version,
    is_active: false,
    config: {
      ...DEFAULT_SCORING_PROFILE.config,
      model: parsed.data.model,
      prompt_template: parsed.data.prompt_template,
      weights,
      review_buffer_below_threshold: parsed.data.review_buffer_below_threshold,
      low_confidence_cutoff: parsed.data.low_confidence_cutoff,
      high_risk_flags_for_review: parsed.data.high_risk_flags_for_review,
    },
  });
  if (error) {
    redirect(`/dashboard/scoring-profiles?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/scoring-profiles");
  redirect("/dashboard/scoring-profiles?success=created");
}

export async function activateScoringProfileAction(formData: FormData) {
  await requireAuth();
  const profileId = getString(formData, "profile_id");
  if (!profileId) {
    redirect("/dashboard/scoring-profiles?error=Missing%20profile%20id");
  }
  const supabase = createAdminClient();
  const { error: resetError } = await supabase.from("scoring_profiles").update({ is_active: false }).neq("id", "");
  if (resetError) {
    redirect(`/dashboard/scoring-profiles?error=${encodeURIComponent(resetError.message)}`);
  }
  const { error } = await supabase.from("scoring_profiles").update({ is_active: true }).eq("id", profileId);
  if (error) {
    redirect(`/dashboard/scoring-profiles?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/dashboard/scoring-profiles");
  redirect("/dashboard/scoring-profiles?success=activated");
}

export async function cloneScoringProfileAction(formData: FormData) {
  await requireAuth();
  const profileId = getString(formData, "profile_id");
  if (!profileId) {
    redirect("/dashboard/scoring-profiles?error=Missing%20profile%20id");
  }
  const supabase = createAdminClient();
  const { data, error: fetchError } = await supabase
    .from("scoring_profiles")
    .select("key, name, version, config")
    .eq("id", profileId)
    .single();
  if (fetchError || !data) {
    redirect("/dashboard/scoring-profiles?error=Could%20not%20load%20profile");
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const { error } = await supabase.from("scoring_profiles").insert({
    key: `${data.key}-clone`,
    name: `${data.name} (Clone)`,
    version: `${data.version}-clone-${stamp.slice(0, 16)}`,
    is_active: false,
    config: data.config,
  });
  if (error) {
    redirect(`/dashboard/scoring-profiles?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/dashboard/scoring-profiles");
  redirect("/dashboard/scoring-profiles?success=cloned");
}
