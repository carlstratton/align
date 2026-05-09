"use server";

import { z } from "zod";
import { generateJobDraft, type GeneratedJobDraft } from "@/lib/ai/generate-job-draft";
import {
  employmentTypeSchema,
  remoteTypeSchema,
  seniorityLevelSchema,
} from "@/lib/validation/job";
import type { PillSelections } from "@/lib/job-pill-taxonomy";

const generationInputSchema = z.object({
  title: z.string().min(3, "Title is required"),
  role_category: z.string().min(2, "Role category is required"),
  location_country: z.string().min(2, "Country is required"),
  location_city: z.string().min(2, "City is required"),
  remote_type: remoteTypeSchema,
  employment_type: employmentTypeSchema,
  seniority: seniorityLevelSchema,
  salary_min: z.number().int().min(0),
  salary_max: z.number().int().min(0),
  salary_currency: z.string().length(3),
  screening_threshold: z.number().int().min(0).max(100),
  pills: z.object({
    responsibilities: z.array(z.string()),
    requirements: z.array(z.string()),
    skills: z.array(z.string()),
    nice_to_haves: z.array(z.string()),
    benefits: z.array(z.string()),
  }),
});

export type GenerateDraftState = {
  ok: boolean;
  error: string | null;
  warning: string | null;
  draft: GeneratedJobDraft | null;
};

const initialState: GenerateDraftState = {
  ok: false,
  error: null,
  warning: null,
  draft: null,
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getNumber(formData: FormData, key: string, fallback = 0) {
  const value = Number(getString(formData, key));
  return Number.isFinite(value) ? value : fallback;
}

export async function generateJobDraftAction(
  _prevState: GenerateDraftState = initialState,
  formData: FormData,
): Promise<GenerateDraftState> {
  void _prevState;
  try {
    const pillsJson = getString(formData, "pills_json");
    const pills = JSON.parse(pillsJson || "{}") as PillSelections;

    const parsed = generationInputSchema.safeParse({
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
      screening_threshold: getNumber(formData, "screening_threshold", 70),
      pills,
    });

    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return {
        ok: false,
        error: first?.message ?? "Please complete required fields before generating.",
        warning: null,
        draft: null,
      };
    }

    const generated = await generateJobDraft(parsed.data);
    return {
      ok: true,
      error: null,
      warning:
        generated.source === "fallback"
          ? `AI was unavailable (${generated.reason ?? "unknown error"}). We generated a high-quality fallback draft for you to edit.`
          : null,
      draft: generated.draft,
    };
  } catch {
    return {
      ok: false,
      error: "Could not generate draft right now. Please retry.",
      warning: null,
      draft: null,
    };
  }
}
