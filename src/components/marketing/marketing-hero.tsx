import Image from "next/image";
import Link from "next/link";
import { gtAmerica, gtPlanar } from "@/lib/fonts/marketing";
import { cn } from "@/lib/utils";

const HERO_ILLUSTRATION = {
  src: "/marketing/hero-illustration-470.png",
  width: 470,
  height: 470,
} as const;

function HeroIllustration({ className }: { className?: string }) {
  return (
    <div className={cn("flex shrink-0 justify-center lg:justify-end", className)}>
      <Image
        src={HERO_ILLUSTRATION.src}
        alt=""
        width={HERO_ILLUSTRATION.width}
        height={HERO_ILLUSTRATION.height}
        priority
        sizes="(max-width: 1023px) min(100vw, 470px), 470px"
        className="h-auto w-full max-w-[470px] rounded-[20px] object-contain motion-safe:animate-mkt-fade-sharp motion-safe:[animation-delay:150ms]"
      />
    </div>
  );
}

function HeroCopy() {
  return (
    <div className="w-full max-w-[532px]">
      <p
        className={cn(
          gtAmerica.className,
          "max-w-[528.63px] text-[25.5232px] leading-[29px] text-[#174EA6]",
          "motion-safe:animate-mkt-fade-up motion-safe:[animation-delay:450ms]",
        )}
      >
        Your copilot for candidate review
      </p>
      <h1
        className={cn(
          gtAmerica.className,
          "mt-4 text-[clamp(2.25rem,8vw,60.6177px)] leading-[110%] tracking-[-0.02em] text-black lg:mt-5",
          "motion-safe:animate-mkt-fade-up motion-safe:[animation-delay:600ms]",
        )}
      >
        See beyond the CV
      </h1>
      <p
        className={cn(
          gtAmerica.className,
          "mt-6 max-w-[532px] text-[19.94px] leading-[140%] tracking-[-0.02em] text-black",
          "motion-safe:animate-mkt-fade-up motion-safe:[animation-delay:750ms]",
        )}
      >
        Align.ai uses contextual AI reasoning to surface the strongest candidates, helping small teams
        move beyond keyword screening and hire with greater clarity and conviction.
      </p>
      <Link
        href="/auth/signup"
        className={cn(
          gtAmerica.className,
          "mt-8 inline-flex min-h-[52px] items-center justify-center rounded-[16px] bg-black px-8 text-[clamp(1.0625rem,3.5vw,1.45rem)] font-medium leading-none tracking-[-0.02em] text-white transition hover:bg-slate-800 sm:px-9 sm:min-h-[56px]",
          "motion-safe:animate-mkt-fade-up motion-safe:[animation-delay:900ms]",
        )}
      >
        <span className="whitespace-nowrap">Start free trial</span>
      </Link>
    </div>
  );
}

export function MarketingHero() {
  return (
    <section className="relative overflow-hidden bg-white">
      <div className="mx-auto hidden w-full max-w-7xl items-center justify-between gap-10 px-10 py-12 lg:flex lg:gap-12 lg:py-16">
        <HeroCopy />
        <HeroIllustration />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-14 pt-8 lg:hidden">
        <HeroCopy />
        <HeroIllustration className="mt-10" />
      </div>
    </section>
  );
}
