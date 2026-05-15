import { JOB_PILL_SECTIONS, type PillSection } from "@/lib/job-pill-taxonomy";

export type JobRoleTemplateId = "product_designer" | "generic";

export type JobRoleTemplate = {
  id: JobRoleTemplateId;
  /** Used as submitted job `title` when `id` is not `generic`. */
  title: string;
  sections: PillSection[];
};

const PRODUCT_DESIGNER_SECTIONS: PillSection[] = [
  {
    id: "responsibilities",
    label: "Responsibilities",
    required: true,
    options: [
      "Own product areas end-to-end",
      "Lead product discovery and problem framing",
      "Translate user and business needs into product experiences",
      "Design intuitive user flows and interaction patterns",
      "Partner closely with product managers and engineers",
      "Prototype and iterate quickly based on feedback",
      "Use research and analytics to inform decisions",
      "Drive experimentation and continuous improvement",
      "Contribute to and evolve the design system",
      "Present work and rationale to stakeholders",
      "Facilitate workshops and collaborative sessions",
      "Help shape product strategy and roadmap direction",
    ],
  },
  {
    id: "requirements",
    label: "Requirements",
    required: true,
    options: [
      "3+ years designing digital products",
      "Strong portfolio with case studies",
      "Experience shipping products in agile environments",
      "Strong product and UX thinking",
      "Ability to simplify complex workflows",
      "Experience collaborating cross-functionally",
      "Comfortable working in ambiguity",
      "Strong written and verbal communication",
      "Evidence-led decision making",
      "Experience working remotely or asynchronously",
      "Fluent English communication",
    ],
  },
  {
    id: "skills",
    label: "Skills",
    required: true,
    options: [
      "Product thinking",
      "Interaction design",
      "User research",
      "Wireframing and prototyping",
      "Information architecture",
      "Journey mapping",
      "Design systems",
      "Visual design",
      "Usability testing",
      "Analytics and experimentation",
      "A/B testing",
      "Figma",
      "Workshop facilitation",
      "Stakeholder communication",
      "Cross-functional collaboration",
      "AI-assisted workflows",
      "Prompt design",
      "Design engineering",
      "Motion design",
      "Front-end awareness",
    ],
  },
  {
    id: "nice_to_haves",
    label: "Nice-to-haves",
    required: false,
    options: [
      "B2B SaaS experience",
      "Startup or scale-up experience",
      "AI product experience",
      "Fintech or marketplace experience",
      "Growth experimentation experience",
      "API or platform product experience",
      "Experience designing complex workflows",
      "Mobile app design experience",
      "Design systems at scale",
      "Mentoring or people management exposure",
    ],
  },
  {
    id: "benefits",
    label: "Benefits",
    required: false,
    options: [
      "Competitive salary and equity",
      "Flexible remote working",
      "Learning and development budget",
      "Home office allowance",
      "Modern hardware and tools",
      "Private healthcare",
      "Pension contributions",
      "Generous holiday allowance",
      "Paid parental leave",
      "Regular team offsites",
      "Career progression opportunities",
      "Autonomy and ownership",
      "Opportunity to shape product direction",
      "Work with a small, high-impact team",
      "Early-stage ownership",
      "Build from 0→1",
      "Direct access to founders",
      "AI-native workflows and tooling",
      "Fast shipping culture",
    ],
  },
];

export const PRODUCT_DESIGNER_TEMPLATE: JobRoleTemplate = {
  id: "product_designer",
  title: "Product Designer",
  sections: PRODUCT_DESIGNER_SECTIONS,
};

/** Generic pills + free-text title (Custom role). */
export const GENERIC_JOB_ROLE_TEMPLATE: JobRoleTemplate = {
  id: "generic",
  title: "",
  sections: JOB_PILL_SECTIONS,
};

/** Ordered list: preset roles first, then custom. */
export const JOB_ROLE_TEMPLATES: JobRoleTemplate[] = [
  PRODUCT_DESIGNER_TEMPLATE,
  GENERIC_JOB_ROLE_TEMPLATE,
];

export function getJobRoleTemplateById(id: JobRoleTemplateId): JobRoleTemplate {
  return JOB_ROLE_TEMPLATES.find((t) => t.id === id) ?? GENERIC_JOB_ROLE_TEMPLATE;
}
