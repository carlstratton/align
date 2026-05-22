import { cn } from "@/lib/utils";

type FeatureCardProps = {
  title: string;
  description: string;
  iconSrc: string;
  className?: string;
  // Legacy props — no longer rendered but kept so callers don't break
  id?: string;
  label?: string;
  badgeIconSrc?: string;
  badgeIconSize?: number;
  variant?: "horizontal" | "featured";
};

export function FeatureCard({ title, description, iconSrc, className }: FeatureCardProps) {
  return (
    <article
      className={cn(
        "flex flex-col items-start justify-center gap-9 rounded-[20px] border border-[#e5e5e5] bg-white p-6",
        className,
      )}
    >
      <img src={iconSrc} alt="" className="size-20 shrink-0 rounded-[16px] bg-[#F9F9F9]" />

      <div className="flex flex-col gap-6">
        <h3 className="text-[28px] leading-[1.1] tracking-[-0.02em] text-black">{title}</h3>
        <p className="text-[20px] leading-[1.3] tracking-[-0.02em] text-black">{description}</p>
      </div>
    </article>
  );
}
