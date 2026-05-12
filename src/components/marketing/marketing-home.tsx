import { FeatureCard } from "@/components/marketing/feature-card";
import { marketingFeatures } from "@/components/marketing/marketing-content";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingHero } from "@/components/marketing/marketing-hero";
import { gtAmerica } from "@/lib/fonts/marketing";
import { cn } from "@/lib/utils";

const [consistency, clarity, control, speed, quality] = marketingFeatures;

export function MarketingHome() {
  return (
    <div className={cn("min-h-full bg-white", gtAmerica.className)}>
      <MarketingHeader />
      <MarketingHero />

      <section className="mx-auto w-full max-w-7xl px-6 pb-20 pt-4 lg:px-10 lg:pb-28">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-5">
          <div className="grid gap-4 lg:gap-5">
            <FeatureCard {...consistency} variant="horizontal" />
            <FeatureCard {...clarity} variant="horizontal" />
            <FeatureCard {...control} variant="horizontal" />
          </div>

          <div className="grid gap-4 lg:grid-rows-2 lg:gap-5">
            <FeatureCard {...speed} variant="featured" />
            <FeatureCard {...quality} variant="featured" />
          </div>
        </div>
      </section>
    </div>
  );
}
