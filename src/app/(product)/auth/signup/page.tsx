import { PageCard } from "@/components/layout/page-card";
import { signupAction } from "@/app/(product)/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SignupPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;

  return (
    <PageCard title="Recruiter signup" description="Create an account and start posting jobs." className="max-w-md">
      <form action={signupAction} className="space-y-4">
        {params.error ? (
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {params.error}
          </p>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="full_name">Full name</Label>
          <Input id="full_name" name="full_name" type="text" required className="w-full" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required className="w-full" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
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
