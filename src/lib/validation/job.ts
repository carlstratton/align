import { z } from "zod";

export const remoteTypeSchema = z.enum(["remote", "hybrid", "onsite"]);
export const employmentTypeSchema = z.enum([
  "full_time",
  "part_time",
  "contract",
  "temporary",
  "internship",
]);
export const seniorityLevelSchema = z.enum(["junior", "mid", "senior", "lead", "executive"]);

export const jobDraftSchema = z.object({
  company_id: z.string().uuid("Select a company"),
  title: z.string().min(3, "Title is required"),
  role_category: z.string().min(2, "Role category is required"),
  location_country: z.string().min(2, "Country is required"),
  location_city: z.string().min(2, "City is required"),
  remote_type: remoteTypeSchema,
  employment_type: employmentTypeSchema,
  seniority: seniorityLevelSchema,
  salary_min: z.number().int().min(0, "Minimum salary must be 0 or greater"),
  salary_max: z.number().int().min(0, "Maximum salary must be 0 or greater"),
  salary_currency: z.string().length(3, "Currency must be a 3-letter code"),
  summary: z.string().min(20, "Summary must be at least 20 characters"),
  responsibilities: z.array(z.string().min(1)).min(1, "Add at least one responsibility"),
  requirements: z.array(z.string().min(1)).min(1, "Add at least one requirement"),
  nice_to_haves: z.array(z.string().min(1)).default([]),
  benefits: z.array(z.string().min(1)).default([]),
  skills: z.array(z.string().min(1)).min(1, "Add at least one skill"),
  screening_threshold: z
    .number()
    .int()
    .min(0, "Screening threshold must be between 0 and 100")
    .max(100, "Screening threshold must be between 0 and 100")
    .default(70),
}).refine((data) => data.salary_max >= data.salary_min, {
  message: "Maximum salary must be greater than or equal to minimum salary",
  path: ["salary_max"],
});

export type JobDraftFormInput = z.input<typeof jobDraftSchema>;
export type JobDraftInput = z.infer<typeof jobDraftSchema>;
