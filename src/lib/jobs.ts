import type { JobDraftInput } from "@/lib/validation/job";

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function toMultiline(items: string[]) {
  return items.map((item) => `• ${item}`).join("\n");
}

export function fromMultiline(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim().replace(/^[-*•]\s+/, ""))
    .filter(Boolean);
}

export function toJobPayload(data: JobDraftInput, recruiterId: string, slug?: string) {
  const role = data.role_category.trim();
  return {
    ...data,
    role_category: role === "" ? null : role,
    hybrid_office_days_per_week:
      data.remote_type === "hybrid" && data.hybrid_office_days_per_week > 0
        ? data.hybrid_office_days_per_week
        : null,
    recruiter_id: recruiterId,
    slug:
      slug ??
      `${slugify(data.title)}-${Math.random().toString(36).slice(2, 7)}`.slice(0, 120),
  };
}
