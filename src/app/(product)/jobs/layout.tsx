/** Public job listings query Supabase at request time; skip static prerender without env. */
export const dynamic = "force-dynamic";

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
