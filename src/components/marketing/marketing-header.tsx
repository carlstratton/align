import Image from "next/image";
import Link from "next/link";
import { AccountNavLinks } from "@/components/layout/account-nav-links";
import { MobileNav } from "@/components/marketing/mobile-nav";
import { hasPublicEnv } from "@/lib/env";
import { getOptionalAuthUser } from "@/lib/supabase/auth";

const desktopNavLinkClass =
  "inline-flex items-center text-base leading-none text-black hover:text-slate-700";

export async function MarketingHeader() {
  const signedIn = hasPublicEnv() ? Boolean(await getOptionalAuthUser()) : false;

  return (
    <header className="relative z-10 px-6 lg:px-10 motion-safe:animate-mkt-fade-in">
      <div className="mx-auto flex h-12 w-full max-w-7xl items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex shrink-0 items-center self-center leading-none"
          aria-label="sprint.cv home"
        >
          <Image
            src="/marketing/sprint-logo.png"
            alt="sprint.cv"
            width={120}
            height={32}
            priority
            unoptimized
            className="block h-8 w-auto"
          />
        </Link>

        <div className="hidden min-h-8 items-center gap-8 lg:flex">
          <Link href="/jobs" className={desktopNavLinkClass}>
            Explore Jobs
          </Link>
          <AccountNavLinks
            signedIn={signedIn}
            className="flex items-center gap-8"
            linkClassName={desktopNavLinkClass}
          />
        </div>

        <MobileNav signedIn={signedIn} />
      </div>
    </header>
  );
}
