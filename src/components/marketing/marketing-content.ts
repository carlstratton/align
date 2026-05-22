export type FeatureCardContent = {
  id: string;
  label: string;
  badgeIconSrc?: string;
  badgeIconSize?: number;
  title: string;
  description: string;
  iconSrc: string;
};

export const marketingFeatures: FeatureCardContent[] = [
  {
    id: "consistency",
    label: "Consistency",
    badgeIconSrc: "/marketing/badges/consistency.svg",
    title: "Review candidates at scale",
    description: "Handle growing application volume without slowing down hiring.",
    iconSrc: "/marketing/icon-tune-hiring.svg",
  },
  {
    id: "clarity",
    label: "Clarity",
    badgeIconSrc: "/marketing/badges/clarity.svg",
    badgeIconSize: 13.2,
    title: "Faster scheduling flow",
    description: "Effortlessly move candidates from shortlist to interview.",
    iconSrc: "/marketing/icon-cv-contextualisation.svg",
  },
  {
    id: "speed",
    label: "Speed",
    badgeIconSrc: "/marketing/badges/speed.svg",
    badgeIconSize: 16,
    title: "Built for small hiring teams",
    description: "Spend less time reviewing applications and more time meeting people.",
    iconSrc: "/marketing/icon-triage.svg",
  },
  {
    id: "control",
    label: "Control",
    badgeIconSrc: "/marketing/badges/control.svg",
    badgeIconSize: 14.06,
    title: "Hiring workflows that adapt",
    description: "Fit into how your team hires, not the other way around.",
    iconSrc: "/marketing/icon-manage-roles.svg",
  },
  {
    id: "quality",
    label: "Quality",
    badgeIconSrc: "/marketing/badges/quality.svg",
    badgeIconSize: 17,
    title: "Better candidate decisions",
    description: "Reduce guesswork across candidate review.",
    iconSrc: "/marketing/icon-job-specs.svg",
  },
];
