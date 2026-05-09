export type ScreeningResult = {
  overallScore: number;
  recommendation: "strong_match" | "possible_match" | "weak_match" | "not_recommended";
  decisionBand: "pass" | "review" | "reject";
  summary: string;
};

export async function screenCandidateAgainstJob() {
  throw new Error("Not implemented yet. Agent 5 will implement Claude screening.");
}
