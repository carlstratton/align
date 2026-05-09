import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const dimensionWeightsSchema = z.object({
  role_relevance: z.number().min(0).max(1),
  tenure_stability: z.number().min(0).max(1),
  education_quality: z.number().min(0).max(1),
  achievements_impact: z.number().min(0).max(1),
  consistency_risk: z.number().min(0).max(1),
});

const scoringProfileConfigSchema = z.object({
  dimensions: z.array(
    z.object({
      key: z.enum([
        "role_relevance",
        "tenure_stability",
        "education_quality",
        "achievements_impact",
        "consistency_risk",
      ]),
      label: z.string().min(1),
      description: z.string().min(1),
    }),
  ),
  weights: dimensionWeightsSchema,
  review_buffer_below_threshold: z.number().int().min(0).max(30),
  low_confidence_cutoff: z.number().int().min(0).max(100),
  high_risk_flags_for_review: z.number().int().min(1).max(10),
  prompt_template: z.string().min(20),
  model: z.string().min(1),
});

export type ScoringProfileConfig = z.infer<typeof scoringProfileConfigSchema>;

export const DEFAULT_SCORING_PROFILE = {
  key: "contextual-v1",
  name: "Contextual Baseline v1",
  version: "contextual-v1",
  is_active: true,
  config: {
    dimensions: [
      {
        key: "role_relevance",
        label: "Role relevance",
        description: "How closely the candidate's background matches this role scope and level.",
      },
      {
        key: "tenure_stability",
        label: "Tenure stability",
        description: "Signals of consistent ownership over time vs frequent short stints without impact.",
      },
      {
        key: "education_quality",
        label: "Education quality",
        description: "Relevance and rigor of education or equivalent demonstrated learning path.",
      },
      {
        key: "achievements_impact",
        label: "Achievements and impact",
        description: "Concrete outcomes, ownership, and measurable contributions in prior roles.",
      },
      {
        key: "consistency_risk",
        label: "Consistency and risk",
        description: "Potential risk factors, contradictions, or weak evidence in the CV narrative.",
      },
    ],
    weights: {
      role_relevance: 0.35,
      tenure_stability: 0.2,
      education_quality: 0.15,
      achievements_impact: 0.2,
      consistency_risk: 0.1,
    },
    review_buffer_below_threshold: 12,
    low_confidence_cutoff: 45,
    high_risk_flags_for_review: 3,
    prompt_template:
      "You are screening a candidate CV for a recruiter. Return strict JSON only. Evaluate each rubric criterion with score, rationale, and evidence.",
    model: "claude-sonnet-4-6",
  } satisfies ScoringProfileConfig,
};

export type ScoringProfile = {
  id: string;
  key: string;
  name: string;
  version: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  config: ScoringProfileConfig;
};

function normalizeWeights(weights: ScoringProfileConfig["weights"]) {
  const total = Object.values(weights).reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    return DEFAULT_SCORING_PROFILE.config.weights;
  }
  return {
    role_relevance: weights.role_relevance / total,
    tenure_stability: weights.tenure_stability / total,
    education_quality: weights.education_quality / total,
    achievements_impact: weights.achievements_impact / total,
    consistency_risk: weights.consistency_risk / total,
  };
}

function defaultProfileWithId(id = "default-contextual-v1"): ScoringProfile {
  return {
    ...DEFAULT_SCORING_PROFILE,
    id,
    config: {
      ...DEFAULT_SCORING_PROFILE.config,
      weights: normalizeWeights(DEFAULT_SCORING_PROFILE.config.weights),
    },
  };
}

function parseProfileRow(row: Record<string, unknown>): ScoringProfile {
  const rawConfig = scoringProfileConfigSchema.parse(row.config ?? DEFAULT_SCORING_PROFILE.config);
  return {
    id: String(row.id),
    key: String(row.key ?? "contextual-v1"),
    name: String(row.name ?? "Contextual Baseline"),
    version: String(row.version ?? "contextual-v1"),
    is_active: Boolean(row.is_active),
    created_at: typeof row.created_at === "string" ? row.created_at : undefined,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : undefined,
    config: {
      ...rawConfig,
      weights: normalizeWeights(rawConfig.weights),
    },
  };
}

export async function getActiveScoringProfile(): Promise<ScoringProfile> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("scoring_profiles")
      .select("id, key, name, version, is_active, config, created_at, updated_at")
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return defaultProfileWithId();
    }
    return parseProfileRow(data as unknown as Record<string, unknown>);
  } catch {
    return defaultProfileWithId();
  }
}

export async function listScoringProfiles(): Promise<ScoringProfile[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("scoring_profiles")
      .select("id, key, name, version, is_active, config, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (error || !data?.length) {
      return [defaultProfileWithId()];
    }
    return data.map((row) => parseProfileRow(row as unknown as Record<string, unknown>));
  } catch {
    return [defaultProfileWithId()];
  }
}
