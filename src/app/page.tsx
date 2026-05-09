import Link from "next/link";

export default function Home() {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        AI-assisted recruitment platform
      </p>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
        Privacy-first, AI-assisted recruitment screening.
      </h1>
      <p className="mt-4 max-w-2xl text-slate-600">
        Recruiters create structured jobs, candidates upload CVs, and AI returns
        transparent fit recommendations while keeping human oversight in control.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          href="/dashboard"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Open dashboard
        </Link>
        <Link
          href="/jobs/demo-role"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          View public job page
        </Link>
      </div>
    </section>
  );
}
