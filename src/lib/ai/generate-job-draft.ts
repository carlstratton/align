import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { getServerEnv } from "@/lib/env";
import type { PillSelections } from "@/lib/job-pill-taxonomy";
import {
  employmentTypeSchema,
  remoteTypeSchema,
  seniorityLevelSchema,
} from "@/lib/validation/job";

const generatedJobDraftSchema = z.object({
  title: z.string().min(3),
  role_category: z.string().refine((s) => s.trim() === "" || s.trim().length >= 2, {
    message: "If provided, role category must be at least 2 characters",
  }),
  location_country: z.string().min(2),
  location_city: z.string().min(2),
  remote_type: remoteTypeSchema,
  hybrid_office_days_per_week: z
    .preprocess((v) => {
      if (v === undefined || v === null) return 0;
      const n = typeof v === "number" ? v : Number(v);
      return Number.isFinite(n) ? Math.min(5, Math.max(0, Math.floor(n))) : 0;
    }, z.number().int().min(0).max(5)),
  employment_type: employmentTypeSchema,
  seniority: seniorityLevelSchema,
  salary_min: z.number().int().min(0),
  salary_max: z.number().int().min(0),
  salary_currency: z.string().length(3),
  summary: z.string().min(20),
  responsibilities: z.array(z.string()).min(1),
  requirements: z.array(z.string()).min(1),
  nice_to_haves: z.array(z.string()),
  benefits: z.array(z.string()),
  skills: z.array(z.string()).min(1),
  screening_threshold: z.number().int().min(0).max(100),
});

export type GeneratedJobDraft = z.infer<typeof generatedJobDraftSchema>;
export type GenerateJobDraftResult = {
  draft: GeneratedJobDraft;
  source: "ai" | "fallback";
  reason?: string;
};

export type JobGenerationInput = {
  title: string;
  role_category: string;
  location_country: string;
  location_city: string;
  remote_type: z.infer<typeof remoteTypeSchema>;
  hybrid_office_days_per_week: number;
  employment_type: z.infer<typeof employmentTypeSchema>;
  seniority: z.infer<typeof seniorityLevelSchema>;
  salary_min: number;
  salary_max: number;
  salary_currency: string;
  screening_threshold: number;
  pills: PillSelections;
};

function extractJson(raw: string) {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI response did not contain valid JSON.");
  }
  return raw.slice(start, end + 1);
}

function toSentence(value: string, prefix: string) {
  const clean = value.trim().replace(/[.;,\s]+$/g, "");
  if (!clean) return `${prefix}.`;
  const withCapital = clean.charAt(0).toUpperCase() + clean.slice(1);
  return `${prefix} ${withCapital.toLowerCase()}.`;
}

function expandItems(items: string[], prefix: string, fallback: string[]) {
  const source = items.length ? items : fallback;
  return source.map((item) => toSentence(item, prefix));
}

function normalizeListItems(items: string[]) {
  return items
    .flatMap((item) => item.split(",").map((part) => part.trim()))
    .map((item) => item.replace(/^[-*•]\s+/, "").trim())
    .filter(Boolean);
}

function normalizeDraft(parsed: GeneratedJobDraft): GeneratedJobDraft {
  return {
    ...parsed,
    responsibilities: normalizeListItems(parsed.responsibilities),
    requirements: normalizeListItems(parsed.requirements),
    nice_to_haves: normalizeListItems(parsed.nice_to_haves),
    benefits: normalizeListItems(parsed.benefits),
    skills: normalizeListItems(parsed.skills),
  };
}

function fallbackDraft(input: JobGenerationInput): GeneratedJobDraft {
  const responsibilities = expandItems(input.pills.responsibilities, "You will", [
    "own key deliverables and drive measurable outcomes",
  ]);
  const requirements = expandItems(input.pills.requirements, "You bring", [
    "strong communication and collaboration skills",
  ]);
  const skills = expandItems(input.pills.skills, "Demonstrated strength in", ["cross-functional teamwork"]);
  const niceToHaves = expandItems(input.pills.nice_to_haves, "Bonus points for", []);
  const benefits = expandItems(input.pills.benefits, "We offer", []);

  return {
    ...input,
    salary_currency: input.salary_currency.toUpperCase(),
    summary: `We are hiring a ${input.seniority} ${input.title} to help deliver high-impact outcomes across cross-functional teams. In this ${input.employment_type.replace("_", " ")} role, you will partner with stakeholders to design and ship user-focused solutions. You will work in a ${input.remote_type} setup from ${input.location_city}, ${input.location_country}, with clear ownership, rapid iteration, and meaningful business impact.`,
    responsibilities,
    requirements,
    skills,
    nice_to_haves: niceToHaves,
    benefits,
  };
}

export async function generateJobDraft(input: JobGenerationInput): Promise<GenerateJobDraftResult> {
  const env = getServerEnv();
  if (!env.ANTHROPIC_API_KEY) {
    return {
      draft: generatedJobDraftSchema.parse(fallbackDraft(input)),
      source: "fallback",
      reason: "ANTHROPIC_API_KEY is missing.",
    };
  }

  try {
    const prompt = `Generate a unique, recruiter-ready structured job draft as strict JSON.
Return JSON only (no markdown).
Do NOT copy pill phrases verbatim. Use pills as semantic guidance and rewrite into natural, specific sentences.
Writing quality requirements:
- summary must be 4-7 sentences, cohesive and compelling, not a comma-separated keyword list
- responsibilities/requirements/nice_to_haves/benefits/skills must each contain complete sentence bullets
- each bullet should be concrete, human-readable, and at least 8 words
- avoid repeating the same sentence pattern
- no generic filler like "etc." or "and more"
- hybrid_office_days_per_week: integer 0-5; must match the input value for office days when remote_type is hybrid, otherwise use 0

Input:
${JSON.stringify(
      input,
      null,
      2,
    )}

Output shape:
${JSON.stringify(
      {
        title: "string",
        role_category: "string",
        location_country: "string",
        location_city: "string",
        remote_type: "remote|hybrid|onsite",
        hybrid_office_days_per_week: 0,
        employment_type: "full_time|part_time|contract|temporary|internship",
        seniority: "junior|mid|senior|lead|executive",
        salary_min: 0,
        salary_max: 0,
        salary_currency: "GBP",
        summary: "string 20+ chars",
        responsibilities: ["string"],
        requirements: ["string"],
        nice_to_haves: ["string"],
        benefits: ["string"],
        skills: ["string"],
        screening_threshold: 70,
      },
      null,
      2,
    )}`;

    const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    const preferredModels = [
      "claude-3-7-sonnet-latest",
      "claude-3-5-sonnet-latest",
      "claude-3-5-sonnet-20241022",
      "claude-3-haiku-20240307",
    ];
    let candidateModels = preferredModels;
    try {
      const listedModels = await anthropic.models.list({ limit: 100 });
      const available = new Set(listedModels.data.map((model) => model.id));
      const supportedPreferred = preferredModels.filter((model) => available.has(model));
      if (supportedPreferred.length > 0) {
        candidateModels = supportedPreferred;
      } else if (listedModels.data[0]?.id) {
        candidateModels = [listedModels.data[0].id];
      }
    } catch {
      // If listing fails, fall back to preferred models and try sequentially.
    }

    let response: Awaited<ReturnType<typeof anthropic.messages.create>> | null = null;
    const modelErrors: string[] = [];
    for (const model of candidateModels) {
      try {
        response = await anthropic.messages.create({
          model,
          max_tokens: 2000,
          messages: [{ role: "user", content: prompt }],
        });
        break;
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Unknown model error";
        modelErrors.push(`${model}: ${reason}`);
      }
    }
    if (!response) {
      throw new Error(modelErrors.join(" | ") || "No Anthropic model was available.");
    }
    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");
    const parsed = JSON.parse(extractJson(text));
    return {
      draft: generatedJobDraftSchema.parse(normalizeDraft(parsed)),
      source: "ai",
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown Anthropic error";
    return {
      draft: generatedJobDraftSchema.parse(fallbackDraft(input)),
      source: "fallback",
      reason,
    };
  }
}
