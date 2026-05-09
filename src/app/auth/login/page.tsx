import { PageCard } from "@/components/layout/page-card";
import { loginAction } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <PageCard title="Recruiter login" description="Sign in to access your dashboard.">
      <form action={loginAction} className="max-w-md space-y-4">
        <input type="hidden" name="next" value={params.next ?? ""} />
        {params.error ? (
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {params.error}
          </p>
        ) : null}
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
            Email
          </label>
          <Input id="email" name="email" type="email" required className="w-full" />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
            Password
          </label>
          <Input id="password" name="password" type="password" required className="w-full" />
        </div>
        <Button type="submit" className="w-full">
          Log in
        </Button>
      </form>
    </PageCard>
  );
}
