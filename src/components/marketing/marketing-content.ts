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
    title: "Keep hiring moving",
    description: "Coordinate interviews with less friction.",
    iconSrc: "/marketing/icon-tune-hiring.svg",
  },
  {
    id: "clarity",
    label: "Clarity",
    badgeIconSrc: "/marketing/badges/clarity.svg",
    badgeIconSize: 13.2,
    title: "Faster scheduling flow",
    description: "Keep candidates moving without bottlenecks.",
    iconSrc: "/marketing/icon-cv-contextualisation.svg",
  },
  {
    id: "speed",
    label: "Speed",
    badgeIconSrc: "/marketing/badges/speed.svg",
    badgeIconSize: 16,
    title: "Triage applications faster",
    description:
      "Create scoring profiles that match how your team hires, from must-have skills to weighting, thresholds, and review standards.",
    iconSrc: "/marketing/icon-triage.svg",
  },
  {
    id: "control",
    label: "Control",
    badgeIconSrc: "/marketing/badges/control.svg",
    badgeIconSize: 14.06,
    title: "Review everything in one place",
    description:
      "Get score breakdowns, confidence levels, key insights, and the evaluation profile used for each candidate.",
    iconSrc: "/marketing/icon-manage-roles.svg",
  },
  {
    id: "quality",
    label: "Quality",
    badgeIconSrc: "/marketing/badges/quality.svg",
    badgeIconSize: 17,
    title: "Review everything in one place",
    description:
      "Get score breakdowns, confidence levels, key insights, and the evaluation profile used for each candidate.",
    iconSrc: "/marketing/icon-job-specs.svg",
  },
];
