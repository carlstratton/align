import { cn } from "@/lib/utils";

type FeatureBadgeProps = {
  label: string;
  iconSrc?: string;
  /** Display size in CSS pixels (default 15). */
  iconSize?: number;
  className?: string;
};

export function FeatureBadge({ label, iconSrc, iconSize = 15, className }: FeatureBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex w-fit max-w-full items-center gap-[6px] whitespace-nowrap rounded-[7.059px] bg-[#174EA6] px-[8.824px] py-[5.294px] text-[14.118px] leading-[1.4] tracking-[-0.2824px] text-white",
        className,
      )}
    >
      {iconSrc ? (
        <img
          src={iconSrc}
          alt=""
          width={iconSize}
          height={iconSize}
          className="shrink-0 object-contain"
          style={{ width: iconSize, height: iconSize }}
        />
      ) : null}
      <span>{label}</span>
    </span>
  );
}
