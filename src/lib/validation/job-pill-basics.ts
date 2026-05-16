import { z } from "zod";
import {
  employmentTypeSchema,
  remoteTypeSchema,
  seniorityLevelSchema,
} from "@/lib/validation/job";

/** Step 1 of create job — mirrors server `generationInputSchema` except `pills`. */
export const jobPillBasicsFormSchema = z
  .object({
    title: z.string().min(3, "Title is required"),
    role_category: z.string().refine((s) => s.trim() === "" || s.trim().length >= 2, {
      message: "If provided, role category must be at least 2 characters",
    }),
    location_country: z.string().min(2, "Country is required"),
    location_city: z.string().min(2, "City is required"),
    remote_type: remoteTypeSchema,
    hybrid_office_days_per_week: z.number().int().min(0).max(5),
    employment_type: employmentTypeSchema,
    seniority: seniorityLevelSchema,
    salary_min: z.number().int().min(0, "Minimum salary must be 0 or greater"),
    salary_max: z.number().int().min(0, "Maximum salary must be 0 or greater"),
    salary_currency: z.string().length(3, "Currency must be a 3-letter code"),
    screening_threshold: z
      .number()
      .int()
      .min(0, "Screening threshold must be between 0 and 100")
      .max(100, "Screening threshold must be between 0 and 100"),
  })
  .refine((data) => data.salary_max >= data.salary_min, {
    message: "Maximum salary must be greater than or equal to minimum salary",
    path: ["salary_max"],
  });

export type JobPillBasicsFormInput = z.input<typeof jobPillBasicsFormSchema>;
export type JobPillBasicsFormValues = z.infer<typeof jobPillBasicsFormSchema>;
