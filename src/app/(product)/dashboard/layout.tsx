/** Dashboard routes need Supabase at request time; avoid prerender without env (e.g. Vercel before vars are set). */
export const dynamic = "force-dynamic";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
