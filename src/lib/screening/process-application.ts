import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerEnv } from "@/lib/env";
import { getActiveScoringProfile, type ScoringProfile } from "@/lib/screening/scoring-profiles";

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

async function extractCvText(fileBuffer: ArrayBuffer, mimeType: string) {
  const buffer = Buffer.from(fileBuffer);
  if (mimeType === "application/pdf") {
    // Dynamic import prevents pdf-parse from running DOMMatrix at module evaluation time
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    await parser.destroy();
    return parsed.text ?? "";
  }

  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const mammoth = await import("mammoth");
    const parsed = await mammoth.extractRawText({ buffer });
    return parsed.value ?? "";
  }

  if (mimeType === "application/msword") {
    throw new Error("Legacy .doc parsing is not supported yet. Please upload PDF or DOCX.");
  }

  throw new Error("Unsupported CV file type.");
}

const contextualDimensionSchema = z.object({
  score: z.number().int().min(0).max(100),
  evidence: z.array(z.string().min(1)).min(1),
  rationale: z.string().min(10),
});

const contextualScreeningSchema = z.object({
  summary: z.string().min(30),
  confidence_score: z.number().int().min(0).max(100),
  dimensions: z.object({
    role_relevance: contextualDimensionSchema,
    tenure_stability: contextualDimensionSchema,
    education_quality: contextualDimensionSchema,
    achievements_impact: contextualDimensionSchema,
    consistency_risk: contextualDimensionSchema,
  }),
  strengths: z.array(
    z.object({
      title: z.string().min(1),
      evidence: z.string().min(1),
      relevance: z.string().min(1),
    }),
  ),
  gaps: z.array(
    z.object({
      title: z.string().min(1),
      detail: z.string().min(1),
      severity: z.enum(["low", "medium", "high"]),
    }),
  ),
  missing_requirements: z.array(z.string().min(1)),
  relevant_experience: z.array(
    z.object({
      company_or_project: z.string().min(1),
      role_or_scope: z.string().min(1),
      duration_hint: z.string().min(1),
      impact: z.string().min(1),
    }),
  ),
  risk_flags: z.array(z.string().min(1)),
  suggested_follow_up_questions: z.array(z.string().min(1)).min(2).max(8),
});

type ContextualScreening = z.infer<typeof contextualScreeningSchema>;

function toRecommendation(score: number) {
  if (score >= 85) return "strong_match";
  if (score >= 70) return "possible_match";
  if (score >= 50) return "weak_match";
  return "not_recommended";
}

function toDecisionBand(score: number, threshold: number, reviewBufferBelowThreshold: number) {
  if (score >= threshold) return "pass";
  if (score >= threshold - reviewBufferBelowThreshold) return "review";
  return "reject";
}

function calculateWeightedScore(
  screening: ContextualScreening,
  weights: ScoringProfile["config"]["weights"],
) {
  const dimensions = screening.dimensions;
  const weighted =
    dimensions.role_relevance.score * weights.role_relevance +
    dimensions.tenure_stability.score * weights.tenure_stability +
    dimensions.education_quality.score * weights.education_quality +
    dimensions.achievements_impact.score * weights.achievements_impact +
    dimensions.consistency_risk.score * weights.consistency_risk;
  return Math.round(Math.max(0, Math.min(100, weighted)));
}

function buildContextualPrompt({
  cvText,
  jobTitle,
  threshold,
  skills,
  requirements,
  profile,
}: {
  cvText: string;
  jobTitle: string;
  threshold: number;
  skills: string[];
  requirements: string[];
  profile: ScoringProfile;
}) {
  const rubric = profile.config.dimensions.map((dimension) => ({
    key: dimension.key,
    label: dimension.label,
    description: dimension.description,
    weight: profile.config.weights[dimension.key],
  }));
  return `You are screening a candidate CV for a recruiter.
Return strict JSON only (no markdown, no prose outside JSON).
The recruiter wants contextual evaluation, not keyword matching.
Use this scoring profile: ${profile.version} (${profile.name})
Assess according to this rubric and weights:
${JSON.stringify(rubric, null, 2)}

Profile prompt guidance:
${profile.config.prompt_template}

Do not infer protected attributes.
If evidence is missing, state uncertainty clearly.
Do not leave any required field empty.
Use this exact output schema:
${JSON.stringify(
  {
    summary: "string",
    confidence_score: 0,
    dimensions: {
      role_relevance: { score: 0, evidence: ["string"], rationale: "string" },
      tenure_stability: { score: 0, evidence: ["string"], rationale: "string" },
      education_quality: { score: 0, evidence: ["string"], rationale: "string" },
      achievements_impact: { score: 0, evidence: ["string"], rationale: "string" },
      consistency_risk: { score: 0, evidence: ["string"], rationale: "string" },
    },
    strengths: [{ title: "string", evidence: "string", relevance: "string" }],
    gaps: [{ title: "string", detail: "string", severity: "low|medium|high" }],
    missing_requirements: ["string"],
    relevant_experience: [
      {
        company_or_project: "string",
        role_or_scope: "string",
        duration_hint: "string",
        impact: "string",
      },
    ],
    risk_flags: ["string"],
    suggested_follow_up_questions: ["string"],
  },
  null,
  2,
)}

Job context:
${JSON.stringify(
    {
      title: jobTitle,
      screening_threshold: threshold,
      must_have_requirements: requirements,
      key_skills: skills,
      scoring_profile_version: profile.version,
    },
    null,
    2,
  )}

CV text:
${cvText.slice(0, 14000)}`;
}

function extractJson(raw: string) {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model output did not include valid JSON.");
  }
  return raw.slice(start, end + 1);
}

function getSelectedModel(profile: ScoringProfile) {
  return profile.config.model || "claude-sonnet-4-6";
}

function getCandidateModels(profile: ScoringProfile) {
  const preferred = [getSelectedModel(profile), "claude-sonnet-4-6"];
  return [...new Set(preferred)];
}

function normalizeDimension(input: unknown) {
  if (!input || typeof input !== "object") {
    return {
      score: 0,
      evidence: ["No explicit evidence provided."],
      rationale: "Model returned incomplete dimension data.",
    };
  }
  const value = input as Record<string, unknown>;
  const rawScore = Number(value.score);
  return {
    score: Number.isFinite(rawScore) ? Math.max(0, Math.min(100, Math.round(rawScore))) : 0,
    evidence:
      Array.isArray(value.evidence) && value.evidence.length
        ? value.evidence.map((item) => String(item))
        : ["No explicit evidence provided."],
    rationale:
      typeof value.rationale === "string" && value.rationale.trim().length >= 10
        ? value.rationale.trim()
        : "Model returned incomplete dimension data.",
  };
}

function normalizeScreeningShape(input: unknown) {
  const value = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const dimensionsInput =
    value.dimensions && typeof value.dimensions === "object"
      ? (value.dimensions as Record<string, unknown>)
      : {};

  const normalizeArray = (field: unknown) => (Array.isArray(field) ? field : []);
  const followUps = normalizeArray(value.suggested_follow_up_questions).map((item) => String(item));

  return {
    summary: typeof value.summary === "string" ? value.summary : "Automated screening summary unavailable.",
    confidence_score: Number.isFinite(Number(value.confidence_score)) ? Number(value.confidence_score) : 0,
    dimensions: {
      role_relevance: normalizeDimension(dimensionsInput.role_relevance),
      tenure_stability: normalizeDimension(dimensionsInput.tenure_stability),
      education_quality: normalizeDimension(dimensionsInput.education_quality),
      achievements_impact: normalizeDimension(dimensionsInput.achievements_impact),
      consistency_risk: normalizeDimension(dimensionsInput.consistency_risk),
    },
    strengths: normalizeArray(value.strengths),
    gaps: normalizeArray(value.gaps),
    missing_requirements: normalizeArray(value.missing_requirements).map((item) => String(item)),
    relevant_experience: normalizeArray(value.relevant_experience),
    risk_flags: normalizeArray(value.risk_flags).map((item) => String(item)),
    suggested_follow_up_questions:
      followUps.length >= 2
        ? followUps
        : [
            "Can you walk through your most relevant experience for this role?",
            "Which outcomes in your recent roles are you most proud of?",
          ],
  };
}

async function extractCandidateContacts(
  anthropic: Anthropic,
  model: string,
  cvText: string,
): Promise<{ email?: string; name?: string; phone?: string }> {
  try {
    // Use only the first ~1000 words — contact details are always near the top
    const preview = cvText.split(/\s+/).slice(0, 1000).join(" ");
    const response = await anthropic.messages.create({
      model,
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: `Extract the candidate's personal contact details from the top of this CV.
Return only what is explicitly present — do not infer or fabricate values.
If a field is not present, omit it.

CV text:
${preview}`,
        },
      ],
      tools: [
        {
          name: "submit_contact_details",
          description: "Submit the candidate's contact details found in the CV.",
          input_schema: {
            type: "object" as const,
            properties: {
              email: {
                type: "string",
                description: "Candidate's personal email address.",
              },
              name: {
                type: "string",
                description: "Candidate's full name.",
              },
              phone: {
                type: "string",
                description: "Candidate's phone number.",
              },
            },
          },
        },
      ],
      tool_choice: { type: "tool", name: "submit_contact_details" },
    });

    const toolUse = response.content.find((block) => block.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return {};
    }
    const input = toolUse.input as Record<string, unknown>;
    return {
      email: typeof input.email === "string" && input.email.includes("@") ? input.email.trim() : undefined,
      name: typeof input.name === "string" && input.name.trim().length > 1 ? input.name.trim() : undefined,
      phone: typeof input.phone === "string" && input.phone.trim().length > 3 ? input.phone.trim() : undefined,
    };
  } catch {
    return {};
  }
}

async function attemptRepairScreening({
  anthropic,
  model,
  candidate,
  validationError,
}: {
  anthropic: Anthropic;
  model: string;
  candidate: unknown;
  validationError: string;
}) {
  const response = await anthropic.messages.create({
    model,
    max_tokens: 1400,
    messages: [
      {
        role: "user",
        content: `Repair this JSON so it matches the required schema exactly.
Return only corrected JSON through the tool call.
Validation errors:
${validationError}

Candidate JSON:
${JSON.stringify(candidate, null, 2)}`,
      },
    ],
    tools: [
      {
        name: "submit_screening_result",
        description: "Return corrected schema-valid screening object.",
        input_schema: { type: "object", additionalProperties: true },
      },
    ],
    tool_choice: { type: "tool", name: "submit_screening_result" },
  });
  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Repair attempt did not return tool output.");
  }
  return contextualScreeningSchema.parse(normalizeScreeningShape(toolUse.input));
}

async function requestStructuredScreening({
  anthropic,
  model,
  prompt,
}: {
  anthropic: Anthropic;
  model: string;
  prompt: string;
}) {
  const response = await anthropic.messages.create({
    model,
    max_tokens: 2400,
    messages: [{ role: "user", content: prompt }],
    tools: [
      {
        name: "submit_screening_result",
        description:
          "Submit the full contextual CV screening result as strictly schema-valid structured data.",
        input_schema: {
          type: "object",
          properties: {
            summary: { type: "string", minLength: 30 },
            confidence_score: { type: "integer", minimum: 0, maximum: 100 },
            dimensions: {
              type: "object",
              properties: {
                role_relevance: {
                  type: "object",
                  properties: {
                    score: { type: "integer", minimum: 0, maximum: 100 },
                    evidence: { type: "array", items: { type: "string", minLength: 1 }, minItems: 1 },
                    rationale: { type: "string", minLength: 10 },
                  },
                  required: ["score", "evidence", "rationale"],
                },
                tenure_stability: {
                  type: "object",
                  properties: {
                    score: { type: "integer", minimum: 0, maximum: 100 },
                    evidence: { type: "array", items: { type: "string", minLength: 1 }, minItems: 1 },
                    rationale: { type: "string", minLength: 10 },
                  },
                  required: ["score", "evidence", "rationale"],
                },
                education_quality: {
                  type: "object",
                  properties: {
                    score: { type: "integer", minimum: 0, maximum: 100 },
                    evidence: { type: "array", items: { type: "string", minLength: 1 }, minItems: 1 },
                    rationale: { type: "string", minLength: 10 },
                  },
                  required: ["score", "evidence", "rationale"],
                },
                achievements_impact: {
                  type: "object",
                  properties: {
                    score: { type: "integer", minimum: 0, maximum: 100 },
                    evidence: { type: "array", items: { type: "string", minLength: 1 }, minItems: 1 },
                    rationale: { type: "string", minLength: 10 },
                  },
                  required: ["score", "evidence", "rationale"],
                },
                consistency_risk: {
                  type: "object",
                  properties: {
                    score: { type: "integer", minimum: 0, maximum: 100 },
                    evidence: { type: "array", items: { type: "string", minLength: 1 }, minItems: 1 },
                    rationale: { type: "string", minLength: 10 },
                  },
                  required: ["score", "evidence", "rationale"],
                },
              },
              required: [
                "role_relevance",
                "tenure_stability",
                "education_quality",
                "achievements_impact",
                "consistency_risk",
              ],
            },
            strengths: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string", minLength: 1 },
                  evidence: { type: "string", minLength: 1 },
                  relevance: { type: "string", minLength: 1 },
                },
                required: ["title", "evidence", "relevance"],
              },
              minItems: 1,
            },
            gaps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string", minLength: 1 },
                  detail: { type: "string", minLength: 1 },
                  severity: { type: "string", enum: ["low", "medium", "high"] },
                },
                required: ["title", "detail", "severity"],
              },
              minItems: 1,
            },
            missing_requirements: { type: "array", items: { type: "string", minLength: 1 } },
            relevant_experience: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  company_or_project: { type: "string", minLength: 1 },
                  role_or_scope: { type: "string", minLength: 1 },
                  duration_hint: { type: "string", minLength: 1 },
                  impact: { type: "string", minLength: 1 },
                },
                required: ["company_or_project", "role_or_scope", "duration_hint", "impact"],
              },
            },
            risk_flags: { type: "array", items: { type: "string", minLength: 1 } },
            suggested_follow_up_questions: {
              type: "array",
              items: { type: "string", minLength: 1 },
              minItems: 2,
              maxItems: 8,
            },
          },
          required: [
            "summary",
            "confidence_score",
            "dimensions",
            "strengths",
            "gaps",
            "missing_requirements",
            "relevant_experience",
            "risk_flags",
            "suggested_follow_up_questions",
          ],
        },
      },
    ],
    tool_choice: { type: "tool", name: "submit_screening_result" },
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (toolUse && toolUse.type === "tool_use") {
    const normalized = normalizeScreeningShape(toolUse.input);
    const parsed = contextualScreeningSchema.safeParse(normalized);
    if (parsed.success) {
      return parsed.data;
    }
    return attemptRepairScreening({
      anthropic,
      model,
      candidate: normalized,
      validationError: JSON.stringify(parsed.error.issues, null, 2),
    });
  }

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");
  const normalized = normalizeScreeningShape(JSON.parse(extractJson(text)));
  const parsed = contextualScreeningSchema.safeParse(normalized);
  if (parsed.success) {
    return parsed.data;
  }
  return attemptRepairScreening({
    anthropic,
    model,
    candidate: normalized,
    validationError: JSON.stringify(parsed.error.issues, null, 2),
  });
}

export async function processApplicationScreening(applicationId: string) {
  const supabase = createAdminClient();

  const { data: existingResult } = await supabase
    .from("screening_results")
    .select("id")
    .eq("application_id", applicationId)
    .maybeSingle();

  if (existingResult?.id) {
    return { ok: true, message: "Screening already exists." };
  }

  const { data: application, error: applicationError } = await supabase
    .from("applications")
    .select(
      "id, job_id, candidate_id, cv_storage_path, cv_mime_type, source, status, jobs(screening_threshold, skills, requirements, title)",
    )
    .eq("id", applicationId)
    .single();

  if (applicationError || !application) {
    throw new Error("Application not found.");
  }

  if (!application.cv_storage_path || !application.cv_mime_type) {
    await supabase
      .from("applications")
      .update({ status: "error" })
      .eq("id", applicationId);
    throw new Error("CV file metadata missing.");
  }

  if (application.status === "submitted") {
    await supabase.from("applications").update({ status: "processing" }).eq("id", applicationId);
  }

  const { data: fileData, error: downloadError } = await supabase.storage
    .from("candidate-cvs")
    .download(application.cv_storage_path);

  if (downloadError || !fileData) {
    await supabase
      .from("applications")
      .update({ status: "error" })
      .eq("id", applicationId);
    throw new Error("Could not download CV file.");
  }

  const startedAt = Date.now();
  const activeProfile = await getActiveScoringProfile();

  try {
    const cvText = await extractCvText(await fileData.arrayBuffer(), application.cv_mime_type);
    const jobData = Array.isArray(application.jobs) ? application.jobs[0] : application.jobs;
    const threshold = jobData?.screening_threshold ?? 70;
    const skills = toStringArray(jobData?.skills);
    const requirements = toStringArray(jobData?.requirements);
    const env = getServerEnv();
    if (!env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is missing.");
    }
    const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

    // For manually uploaded CVs, attempt to extract real contact details from the text
    // and patch the placeholder candidate row. Failures here must never block screening.
    if (application.source === "recruiter_manual" && application.candidate_id) {
      try {
        const contacts = await extractCandidateContacts(
          anthropic,
          getSelectedModel(activeProfile),
          cvText,
        );
        if (contacts.email || contacts.name || contacts.phone) {
          const { data: currentCandidate } = await supabase
            .from("candidates")
            .select("email, name")
            .eq("id", application.candidate_id)
            .single();

          const patch: Record<string, string> = {};
          if (contacts.email && currentCandidate?.email?.endsWith("@candidates.local")) {
            patch.email = contacts.email;
          }
          if (contacts.name && currentCandidate?.name?.endsWith("@candidates.local") === false) {
            // Only overwrite if the stored name still looks like the filename-derived placeholder
            // (i.e. it does NOT contain an @ sign — real names never do)
            if (!currentCandidate?.name?.includes("@")) {
              patch.name = contacts.name;
            }
          }
          if (contacts.phone) {
            patch.phone = contacts.phone;
          }
          if (Object.keys(patch).length) {
            await supabase
              .from("candidates")
              .update(patch)
              .eq("id", application.candidate_id);
          }
        }
      } catch (contactErr) {
        console.warn("extractCandidateContacts failed (non-fatal):", contactErr);
      }
    }

    const prompt = buildContextualPrompt({
      cvText,
      jobTitle: jobData?.title ?? "Unknown role",
      threshold,
      skills,
      requirements,
      profile: activeProfile,
    });
    let parsed: ContextualScreening | null = null;
    let selectedModel = "unknown";
    const modelErrors: string[] = [];
    for (const model of getCandidateModels(activeProfile)) {
      try {
        parsed = await requestStructuredScreening({ anthropic, model, prompt });
        selectedModel = model;
        break;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown model error";
        modelErrors.push(`${model}: ${message}`);
      }
    }
    if (!parsed) {
      throw new Error(modelErrors.join(" | ") || "No available model returned structured scoring.");
    }
    const score = calculateWeightedScore(parsed, activeProfile.config.weights);
    const recommendation = toRecommendation(score);
    const decisionBand =
      parsed.confidence_score < activeProfile.config.low_confidence_cutoff ||
      parsed.risk_flags.length >= activeProfile.config.high_risk_flags_for_review
        ? "review"
        : toDecisionBand(score, threshold, activeProfile.config.review_buffer_below_threshold);

    await supabase.from("screening_results").insert({
      application_id: application.id,
      job_id: application.job_id,
      overall_score: score,
      recommendation,
      decision_band: decisionBand,
      confidence_score: parsed.confidence_score,
      summary: parsed.summary,
      score_breakdown: {
        method: "contextual-v1",
        profile_id: activeProfile.id,
        profile_key: activeProfile.key,
        profile_name: activeProfile.name,
        profile_version: activeProfile.version,
        prompt_template: activeProfile.config.prompt_template,
        weights: activeProfile.config.weights,
        dimensions: parsed.dimensions,
        threshold,
      },
      strengths: parsed.strengths,
      gaps: parsed.gaps,
      missing_requirements: parsed.missing_requirements,
      relevant_experience: parsed.relevant_experience,
      risk_flags: parsed.risk_flags,
      suggested_follow_up_questions: parsed.suggested_follow_up_questions,
      human_review_note:
        "This is an AI-assisted recommendation. Recruiter review is required before decisions.",
      model_provider: "anthropic",
      model_name: selectedModel,
      prompt_version: activeProfile.version,
      processing_time_ms: Date.now() - startedAt,
      error_message: null,
    });

    await supabase
      .from("applications")
      .update({ status: decisionBand })
      .eq("id", application.id);

    return { ok: true, message: "Screening completed." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Screening failed";
    await supabase
      .from("applications")
      .update({ status: "review" })
      .eq("id", application.id);
    await supabase.from("screening_results").upsert(
      {
        application_id: application.id,
        job_id: application.job_id,
        overall_score: 0,
        recommendation: "not_recommended",
        decision_band: "review",
        summary: "Screening could not complete automatically and requires recruiter review.",
        score_breakdown: { method: "contextual-v1", failure: true, profile_version: activeProfile.version },
        strengths: [],
        gaps: [],
        risk_flags: ["Automated contextual screening failed; manual review required."],
        relevant_experience: [],
        missing_requirements: [],
        suggested_follow_up_questions: [
          "Can you walk through your most relevant experience for this role?",
          "Which outcomes in your recent roles are you most proud of?",
        ],
        model_provider: "anthropic",
        model_name: "unknown",
        prompt_version: activeProfile.version,
        error_message: message,
      },
      { onConflict: "application_id" },
    );
    return { ok: false, message };
  }
}
