import { PageCard } from "@/components/layout/page-card";
import { loginAction } from "@/app/(product)/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <PageCard title="Recruiter login" description="Sign in to access your dashboard." className="max-w-md">
      <form action={loginAction} className="space-y-4">
        <input type="hidden" name="next" value={params.next ?? ""} />
        {params.error ? (
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {params.error}
          </p>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required className="w-full" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" required className="w-full" />
        </div>
        <Button type="submit" className="w-full">
          Log in
        </Button>
      </form>
    </PageCard>
  );
}
