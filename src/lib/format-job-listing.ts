/**
 * Relative label for job posting date (published_at or created_at ISO string).
 */
export function formatJobPostedLabel(isoDate: string): string {
  const posted = new Date(isoDate);
  if (Number.isNaN(posted.getTime())) {
    return "";
  }
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfPosted = new Date(posted.getFullYear(), posted.getMonth(), posted.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfPosted.getTime()) / (24 * 60 * 60 * 1000));

  if (diffDays < 0) return posted.toLocaleDateString();
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;
  if (diffDays >= 7 && diffDays < 14) return "1 week ago";
  if (diffDays >= 14) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} weeks ago`;
  }
  return posted.toLocaleDateString();
}

const CURRENCY_SYMBOL: Record<string, string> = {
  GBP: "£",
  USD: "$",
  EUR: "€",
};

export function formatSalaryRangeLabel(
  currency: string | null,
  min: number | null,
  max: number | null,
): string {
  const code = (currency ?? "GBP").toUpperCase();
  const sym = CURRENCY_SYMBOL[code] ?? `${code} `;
  if (min != null && max != null) {
    return `${sym}${min.toLocaleString()} — ${sym}${max.toLocaleString()}`;
  }
  if (min != null) {
    return `${sym}${min.toLocaleString()}+`;
  }
  if (max != null) {
    return `Up to ${sym}${max.toLocaleString()}`;
  }
  return "Salary not listed";
}
