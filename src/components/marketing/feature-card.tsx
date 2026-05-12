import Image from "next/image";
import { FeatureBadge } from "@/components/marketing/feature-badge";
import { cn } from "@/lib/utils";

type FeatureCardProps = {
  label: string;
  badgeIconSrc?: string;
  badgeIconSize?: number;
  title: string;
  description: string;
  iconSrc: string;
  variant?: "horizontal" | "featured";
  className?: string;
};

function FeatureIcon({ iconSrc }: { iconSrc: string }) {
  if (iconSrc.endsWith(".svg")) {
    return <img src={iconSrc} alt="" className="h-full w-full object-contain" />;
  }

  return (
    <Image src={iconSrc} alt="" width={250} height={250} className="h-full w-full object-contain" />
  );
}

export function FeatureCard({
  label,
  badgeIconSrc,
  badgeIconSize,
  title,
  description,
  iconSrc,
  variant = "horizontal",
  className,
}: FeatureCardProps) {
  const isFeatured = variant === "featured";

  if (!isFeatured) {
    return (
      <article
        className={cn(
          "group flex flex-col gap-10 rounded-[20px] bg-[#f2f2f7] p-10 lg:flex-row lg:items-center lg:gap-12",
          "transition-transform duration-300 ease-out hover:-translate-y-1",
          className,
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-[25.346px]">
          <div className="flex flex-col items-start gap-4">
            <FeatureBadge label={label} iconSrc={badgeIconSrc} iconSize={badgeIconSize} />
            <h3 className="w-full max-w-[371px] text-3xl leading-[1.1] tracking-[-0.02em] text-black lg:text-[44px]">
              {title}
            </h3>
          </div>
          <p className="w-full max-w-[371px] text-lg leading-[1.3] tracking-[-0.02em] text-black lg:text-[24px]">
            {description}
          </p>
        </div>

        <div className="h-[250px] w-[250px] shrink-0 transition-transform duration-500 ease-out group-hover:rotate-6">
          <FeatureIcon iconSrc={iconSrc} />
        </div>
      </article>
    );
  }

  return (
    <article
      className={cn(
        "group flex h-full flex-col items-center rounded-[20px] bg-[#f2f2f7] p-10 text-center",
          "transition-transform duration-300 ease-out hover:-translate-y-1",
          className,
        )}
      >
      <div className="flex w-full shrink-0 flex-col items-center gap-10">
        <div className="h-[250px] w-[250px] shrink-0 transition-transform duration-500 ease-out group-hover:rotate-6">
          <FeatureIcon iconSrc={iconSrc} />
        </div>
        <div className="flex w-full flex-col items-center gap-[25.346px]">
          <div className="flex flex-col items-center gap-4">
            <FeatureBadge label={label} iconSrc={badgeIconSrc} iconSize={badgeIconSize} />
            <h3 className="w-full max-w-[436px] text-3xl leading-[1.1] tracking-[-0.02em] text-black lg:text-[44px]">
              {title}
            </h3>
          </div>
          <p className="w-full max-w-[436px] text-lg leading-[1.3] tracking-[-0.02em] text-black lg:text-[24px]">
            {description}
          </p>
        </div>
      </div>
    </article>
  );
}
