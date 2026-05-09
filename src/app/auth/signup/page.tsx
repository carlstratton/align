import { PageCard } from "@/components/layout/page-card";
import { signupAction } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SignupPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;

  return (
    <PageCard title="Recruiter signup" description="Create an account and start posting jobs.">
      <form action={signupAction} className="max-w-md space-y-4">
        {params.error ? (
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {params.error}
          </p>
        ) : null}
        <div>
          <label htmlFor="full_name" className="mb-1 block text-sm font-medium text-slate-700">
            Full name
          </label>
          <Input id="full_name" name="full_name" type="text" required className="w-full" />
        </div>
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
          <Input
            id="password"
            name="password"
            type="password"
            minLength={8}
            required
            className="w-full"
          />
        </div>
        <Button type="submit" className="w-full">
          Create account
        </Button>
      </form>
    </PageCard>
  );
}
