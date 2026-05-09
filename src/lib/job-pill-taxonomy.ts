export type PillSectionId =
  | "responsibilities"
  | "requirements"
  | "skills"
  | "nice_to_haves"
  | "benefits";

export type PillSection = {
  id: PillSectionId;
  label: string;
  required: boolean;
  options: string[];
};

export const JOB_PILL_SECTIONS: PillSection[] = [
  {
    id: "responsibilities",
    label: "Responsibilities",
    required: true,
    options: [
      "Own roadmap execution",
      "Partner with engineering",
      "Run stakeholder workshops",
      "Lead sprint planning",
      "Define product requirements",
      "Measure product outcomes",
      "Improve customer onboarding",
      "Drive experimentation and A/B testing",
      "Present updates to leadership",
      "Coordinate cross-functional delivery",
    ],
  },
  {
    id: "requirements",
    label: "Requirements",
    required: true,
    options: [
      "3+ years relevant experience",
      "Strong communication skills",
      "Experience in agile teams",
      "Data-driven decision making",
      "Comfort with ambiguity",
      "Portfolio or case studies",
      "Experience collaborating remotely",
      "Stakeholder management",
      "Problem-solving mindset",
      "Fluent written and spoken English",
    ],
  },
  {
    id: "skills",
    label: "Skills",
    required: true,
    options: [
      "Product strategy",
      "User research",
      "UX writing",
      "SQL",
      "Figma",
      "Jira",
      "Roadmapping",
      "Backlog prioritization",
      "Analytics",
      "A/B testing",
      "Wireframing",
      "Presentation skills",
    ],
  },
  {
    id: "nice_to_haves",
    label: "Nice-to-haves",
    required: false,
    options: [
      "B2B SaaS background",
      "Startup experience",
      "People management exposure",
      "Marketplace domain experience",
      "Fintech domain experience",
      "AI product exposure",
      "Growth experimentation background",
      "API product experience",
    ],
  },
  {
    id: "benefits",
    label: "Benefits",
    required: false,
    options: [
      "Remote-first culture",
      "Flexible working hours",
      "Learning and development budget",
      "Health insurance",
      "Enhanced parental leave",
      "Home office budget",
      "Annual company retreat",
      "Performance bonus",
      "Pension contribution",
    ],
  },
];

export type PillSelections = Record<PillSectionId, string[]>;

export function emptyPillSelections(): PillSelections {
  return {
    responsibilities: [],
    requirements: [],
    skills: [],
    nice_to_haves: [],
    benefits: [],
  };
}
