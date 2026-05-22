import Link from "next/link";
import { gtAmerica } from "@/lib/fonts/marketing";
import { cn } from "@/lib/utils";

export function MarketingHero() {
  return (
    <section className="relative bg-transparent">
      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-24 pt-[118px] lg:px-10 lg:pb-32 lg:pt-[118px]">
        <div className="flex max-w-[1024px] flex-col gap-9">
          <div className="flex flex-col gap-6">
            <p
              className={cn(
                gtAmerica.className,
                "text-[clamp(1rem,2.5vw,25.5px)] leading-[1.14] tracking-[-0.02em] text-[#8e8e93]",
                "motion-safe:animate-mkt-fade-up motion-safe:[animation-delay:450ms]",
              )}
            >
              Your copilot for candidate review
            </p>
            <h1
              className={cn(
                gtAmerica.className,
                "text-[clamp(2.5rem,7vw,84px)] font-light leading-none tracking-[-0.02em] text-black",
                "motion-safe:animate-mkt-fade-up motion-safe:[animation-delay:600ms]",
              )}
            >
              Find stronger candidates,{" "}
              <br className="hidden lg:block" />
              not stronger keywords
            </h1>
            <p
              className={cn(
                gtAmerica.className,
                "max-w-[1024px] text-[clamp(1.1rem,2.5vw,28px)] leading-[1.4] tracking-[-0.02em] text-[#8e8e93]",
                "motion-safe:animate-mkt-fade-up motion-safe:[animation-delay:750ms]",
              )}
            >
              Contextual AI reasoning that surfaces the strongest candidates
            </p>
          </div>

          <a
            href="mailto:cgstratton+align@gmail.com?subject=Request%20Demo"
            className={cn(
              gtAmerica.className,
              "inline-flex w-fit min-h-[52px] items-center justify-center rounded-full bg-[#174EA6] px-8 text-[clamp(1rem,2vw,1.375rem)] font-medium leading-none tracking-[-0.02em] text-white transition hover:bg-[#1a5bc4] sm:min-h-[56px] sm:px-9",
              "motion-safe:animate-mkt-fade-up motion-safe:[animation-delay:900ms]",
            )}
          >
            <span className="whitespace-nowrap">Request Demo</span>
          </a>
        </div>
      </div>
    </section>
  );
}
