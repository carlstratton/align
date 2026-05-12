import { hasPublicEnv } from "@/lib/env";
import { AccountNavLinks } from "@/components/layout/account-nav-links";
import { getOptionalAuthUser } from "@/lib/supabase/auth";

export async function AuthNav() {
  if (!hasPublicEnv()) {
    return <AccountNavLinks signedIn={false} className="flex items-center gap-5" />;
  }

  const user = await getOptionalAuthUser();
  return <AccountNavLinks signedIn={Boolean(user)} className="flex items-center gap-5" />;
}
