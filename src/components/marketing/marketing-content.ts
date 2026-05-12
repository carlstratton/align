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
    title: "Tune your hiring criteria",
    description:
      "Create scoring profiles that match how your team hires, from must-have skills to weighting, thresholds, and review standards.",
    iconSrc: "/marketing/tune-your-hiring-criteria.svg",
  },
  {
    id: "clarity",
    label: "Clarity",
    badgeIconSrc: "/marketing/badges/clarity.svg",
    badgeIconSize: 13.2,
    title: "Review everything in one place",
    description:
      "Get score breakdowns, confidence levels, key insights, and the evaluation profile used for each candidate.",
    iconSrc: "/marketing/review-everything-in-one-place.svg",
  },
  {
    id: "control",
    label: "Control",
    badgeIconSrc: "/marketing/badges/control.svg",
    badgeIconSize: 14.06,
    title: "Manage roles from start to finish",
    description:
      "Create, edit, publish, close, and reopen jobs without losing track of your hiring pipeline.",
    iconSrc: "/marketing/manage-roles-from-start-to-finish.svg",
  },
  {
    id: "speed",
    label: "Speed",
    badgeIconSrc: "/marketing/badges/speed.svg",
    badgeIconSize: 16,
    title: "Triage applications faster",
    description:
      "See every candidate by role, status, and score, with quick actions to pass, review, or reject.",
    iconSrc: "/marketing/triage-applications-faster.svg",
  },
  {
    id: "quality",
    label: "Quality",
    badgeIconSrc: "/marketing/badges/quality.svg",
    badgeIconSize: 17,
    title: "Write better job specs, faster",
    description:
      "Use a structured role builder and AI drafting support to create clearer, more consistent job descriptions.",
    iconSrc: "/marketing/quality.svg",
  },
];
