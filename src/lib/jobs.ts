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

/**
 * Split a prose chunk into one bullet per sentence when the model stores multiple
 * sentences in a single string (no newlines).
 */
function splitChunkIntoBulletStrings(chunk: string): string[] {
  const t = chunk.trim().replace(/^[-*•]\s+/, "").trim();
  if (!t) return [];

  let parts: string[] = [];

  if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
    try {
      const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
      parts = [...segmenter.segment(t)]
        .map((s) => s.segment.trim())
        .filter(Boolean);
    } catch {
      parts = [];
    }
  }

  if (parts.length === 0) {
    parts = t
      .split(/(?<=[.!?])\s+(?=[A-Z"'(])/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (parts.length === 0) {
    return [t];
  }

  // Single block with semicolon-separated clauses (no sentence-final periods)
  if (parts.length === 1 && parts[0].includes(";")) {
    const semi = parts[0]
      .split(/;\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (semi.length >= 2 && semi.every((p) => p.length >= 12)) {
      return semi;
    }
  }

  return parts;
}

/** Turns stored job list fields into one string per bullet (newlines + sentence boundaries). */
export function flattenJobListingItems(items: string[] | null | undefined): string[] {
  if (!items?.length) return [];
  return items
    .flatMap((item) => {
      const raw = String(item);
      // Common storage artefact: sentences joined by ".,\" (period-comma) rather than newlines.
      // Split that first so each piece is a proper sentence before further processing.
      const dotsCommaChunks = raw.split(/\.,\s*/);
      const chunks =
        dotsCommaChunks.length > 1
          ? dotsCommaChunks.map((c) => c.trim()).filter(Boolean)
          : raw.split(/\n+/).map((c) => c.trim()).filter(Boolean);

      return chunks.flatMap((line) => splitChunkIntoBulletStrings(line));
    })
    .map((line) => line.replace(/^[-*•]\s+/, "").trim())
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
