import { getCompanyLogoPublicUrl } from "@/lib/company-logo";
import { getJobLogoPublicUrl } from "@/lib/job-logo";

/** Public listing image: job-specific logo in `job-logos`, else company badge in `company-logos`. */
export function getListingLogoPublicUrl(
  supabaseUrl: string,
  jobLogoPath: string | null | undefined,
  companyLogoPath: string | null | undefined,
): string | null {
  const jobUrl = getJobLogoPublicUrl(supabaseUrl, jobLogoPath ?? null);
  if (jobUrl) return jobUrl;
  return getCompanyLogoPublicUrl(supabaseUrl, companyLogoPath ?? null);
}
