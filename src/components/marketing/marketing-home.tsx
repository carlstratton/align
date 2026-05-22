import Image from "next/image";
import { FeatureCard } from "@/components/marketing/feature-card";
import { marketingFeatures } from "@/components/marketing/marketing-content";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingHero } from "@/components/marketing/marketing-hero";
import { gtAmerica } from "@/lib/fonts/marketing";
import { cn } from "@/lib/utils";

const [consistency, clarity, control, speed, quality] = marketingFeatures;

export function MarketingHome() {
  return (
    <div className={cn("relative min-h-full bg-white", gtAmerica.className)}>
      {/* Diagonal lines background — spans hero + into features section */}
      <div className="absolute inset-x-0 top-0 h-[58%] overflow-hidden">
        <Image
          src="/marketing/hero-light-bg.png"
          alt=""
          fill
          priority
          unoptimized
          className="object-cover object-top"
        />
      </div>

      <MarketingHeader />
      <MarketingHero />

      <section className="relative overflow-hidden pb-20 pt-0 lg:pb-28">

        {/* Section header: "Built for small teams" */}
        <div className="relative mx-auto w-full max-w-7xl px-6 pb-[120px] pt-20 lg:px-10 lg:pt-24">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-3">
              <p className="pl-[6px] text-[16px] leading-[1.1] tracking-[-0.02em] text-[#174ea6]">
                Business impact
              </p>
              <h2
                className={cn(
                  gtAmerica.className,
                  "text-[72px] leading-[110%] tracking-[-0.02em] text-[#140E2F]",
                )}
              >
                Built for
                <br />
                small teams
              </h2>
            </div>
            <p
              className={cn(
                gtAmerica.className,
                "max-w-[476px] text-[clamp(1rem,1.6vw,20px)] leading-[1.4] text-[#625b71] lg:pt-10 lg:text-right",
              )}
            >
              Sprint allows small hiring teams the tools to evaluate candidates with greater depth,
              clarity, and confidence, helping them move beyond keywords to see the person behind the
              CV.
            </p>
          </div>
        </div>

        {/* Feature cards grid */}
        <div className="relative mx-auto w-full max-w-7xl px-6 lg:px-10">
          <div className="flex flex-col gap-10">
            {/* Row 1: 2 equal columns */}
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-x-10">
              <FeatureCard {...consistency} />
              <FeatureCard {...clarity} />
            </div>

            {/* Row 2: 3 equal columns */}
            <div className="grid gap-6 lg:grid-cols-3 lg:gap-x-10">
              <FeatureCard {...control} />
              <FeatureCard {...speed} />
              <FeatureCard {...quality} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
