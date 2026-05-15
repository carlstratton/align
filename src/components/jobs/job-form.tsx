"use client";

import { useEffect, useState } from "react";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  jobDraftSchema,
  type JobDraftFormInput,
  type JobDraftInput,
} from "@/lib/validation/job";
import { toMultiline } from "@/lib/jobs";
import { getJobLogoPublicUrl } from "@/lib/job-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export type CompanyOption = {
  id: string;
  name: string;
};

type JobFormProps = {
  companies: CompanyOption[];
  action: (formData: FormData) => void;
  defaultValues?: Partial<JobDraftInput> & { id?: string };
  existingLogoPath?: string | null;
  submitLabel: string;
  secondarySubmitLabel?: string;
  error?: string;
};

function normalizeMultilineValue(value: unknown): string[] {
  if (typeof value === "string") {
    return value
      .split("\n")
      .map((line) => line.trim().replace(/^[-*•]\s+/, ""))
      .filter(Boolean);
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim().replace(/^[-*•]\s+/, ""))
      .filter(Boolean);
  }

  return [];
}

export function JobForm({
  companies,
  action,
  defaultValues,
  existingLogoPath,
  submitLabel,
  secondarySubmitLabel,
  error,
}: JobFormProps) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const [hasStagedLogo, setHasStagedLogo] = useState(false);

  const form = useForm<JobDraftFormInput>({
    resolver: zodResolver(jobDraftSchema),
    defaultValues: {
      company_id: defaultValues?.company_id ?? companies[0]?.id ?? "",
      title: defaultValues?.title ?? "",
      role_category: defaultValues?.role_category ?? "",
      location_country: defaultValues?.location_country ?? "",
      location_city: defaultValues?.location_city ?? "",
      remote_type: defaultValues?.remote_type ?? "remote",
      hybrid_office_days_per_week: defaultValues?.hybrid_office_days_per_week ?? 0,
      employment_type: defaultValues?.employment_type ?? "full_time",
      seniority: defaultValues?.seniority ?? "mid",
      salary_min: defaultValues?.salary_min ?? 0,
      salary_max: defaultValues?.salary_max ?? 0,
      salary_currency: defaultValues?.salary_currency ?? "GBP",
      summary: defaultValues?.summary ?? "",
      responsibilities: defaultValues?.responsibilities ?? [],
      requirements: defaultValues?.requirements ?? [],
      nice_to_haves: defaultValues?.nice_to_haves ?? [],
      benefits: defaultValues?.benefits ?? [],
      skills: defaultValues?.skills ?? [],
      screening_threshold: defaultValues?.screening_threshold ?? 70,
    },
  });
  const {
    formState: { errors },
  } = form;

  const remoteType = useWatch({ control: form.control, name: "remote_type" });

  const logoPublicUrl = getJobLogoPublicUrl(supabaseUrl, existingLogoPath ?? null);
  const canPublish = Boolean(existingLogoPath) || hasStagedLogo;

  useEffect(() => {
    if (remoteType !== "hybrid") {
      form.setValue("hybrid_office_days_per_week", 0);
    }
  }, [remoteType, form]);

  function fieldError(name: keyof JobDraftFormInput) {
    const error = errors[name];
    return error && "message" in error && typeof error.message === "string"
      ? error.message
      : null;
  }

  return (
    <form action={action} encType="multipart/form-data" className="space-y-4">
      {defaultValues?.id ? <input type="hidden" name="job_id" value={defaultValues.id} /> : null}
      {error ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      <p className="text-xs text-muted-foreground">Fields marked with * are mandatory.</p>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm">
          <Label className="mb-1">Company *</Label>
          <select
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2"
            {...form.register("company_id")}
          >
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
          {fieldError("company_id") ? (
            <p className="mt-1 text-xs text-destructive">{fieldError("company_id")}</p>
          ) : null}
        </label>
        <div className="text-sm md:col-span-2">
          <Label className="mb-1" htmlFor="company_logo">
            Company logo{secondarySubmitLabel ? " (required to publish)" : ""}
          </Label>
          {logoPublicUrl ? (
            <div className="mt-2 mb-2 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoPublicUrl}
                alt=""
                className="size-16 shrink-0 rounded-md border border-border object-cover"
              />
              <span className="text-xs text-muted-foreground">Current logo on file</span>
            </div>
          ) : null}
          <Input
            id="company_logo"
            name="company_logo"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="mt-1 max-w-md cursor-pointer"
            onChange={(e) => setHasStagedLogo(Boolean(e.target.files?.length))}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            PNG, JPEG, or WebP. Max 2MB. Shown on public job listings.
          </p>
        </div>
        <label className="text-sm">
          <Label className="mb-1">Title *</Label>
          <Input required className="mt-1" {...form.register("title")} />
          {fieldError("title") ? <p className="mt-1 text-xs text-destructive">{fieldError("title")}</p> : null}
        </label>
        <label className="text-sm">
          <Label className="mb-1">Role category</Label>
          <Input className="mt-1" {...form.register("role_category")} />
          {fieldError("role_category") ? (
            <p className="mt-1 text-xs text-destructive">{fieldError("role_category")}</p>
          ) : null}
        </label>
        <label className="text-sm">
          <Label className="mb-1">Seniority *</Label>
          <select
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2"
            {...form.register("seniority")}
          >
            <option value="junior">Junior</option>
            <option value="mid">Mid</option>
            <option value="senior">Senior</option>
            <option value="lead">Lead</option>
            <option value="executive">Executive</option>
          </select>
          {fieldError("seniority") ? (
            <p className="mt-1 text-xs text-destructive">{fieldError("seniority")}</p>
          ) : null}
        </label>
      </div>

      <label className="block text-sm">
        <Label className="mb-1">Summary *</Label>
        <Textarea required minLength={20} className="mt-1" rows={4} {...form.register("summary")} />
        <p className="mt-1 text-xs text-muted-foreground">Minimum 20 characters.</p>
        {fieldError("summary") ? <p className="mt-1 text-xs text-destructive">{fieldError("summary")}</p> : null}
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm">
          <Label className="mb-1">Country *</Label>
          <Input required className="mt-1" {...form.register("location_country")} />
          {fieldError("location_country") ? (
            <p className="mt-1 text-xs text-destructive">{fieldError("location_country")}</p>
          ) : null}
        </label>
        <label className="text-sm">
          <Label className="mb-1">City *</Label>
          <Input required className="mt-1" {...form.register("location_city")} />
          {fieldError("location_city") ? (
            <p className="mt-1 text-xs text-destructive">{fieldError("location_city")}</p>
          ) : null}
        </label>
        <label className="text-sm">
          <Label className="mb-1">Remote type *</Label>
          <select
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2"
            {...form.register("remote_type")}
          >
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">Onsite</option>
          </select>
          {fieldError("remote_type") ? (
            <p className="mt-1 text-xs text-destructive">{fieldError("remote_type")}</p>
          ) : null}
        </label>
        <div className="text-sm" hidden={remoteType !== "hybrid"}>
          <Label className="mb-1" htmlFor="hybrid_office_days_per_week">
            Office days per week (hybrid)
          </Label>
          <select
            id="hybrid_office_days_per_week"
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2"
            {...form.register("hybrid_office_days_per_week", { valueAsNumber: true })}
          >
            <option value={0}>Open to discussion</option>
            <option value={1}>1 day per week</option>
            <option value={2}>2 days per week</option>
            <option value={3}>3 days per week</option>
            <option value={4}>4 days per week</option>
            <option value={5}>5 days per week</option>
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            Only shown on the public listing if you pick more than zero days.
          </p>
          {fieldError("hybrid_office_days_per_week") ? (
            <p className="mt-1 text-xs text-destructive">{fieldError("hybrid_office_days_per_week")}</p>
          ) : null}
        </div>
        <label className="text-sm">
          <Label className="mb-1">Employment *</Label>
          <select
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2"
            {...form.register("employment_type")}
          >
            <option value="full_time">Full-time</option>
            <option value="part_time">Part-time</option>
            <option value="contract">Contract</option>
            <option value="temporary">Temporary</option>
            <option value="internship">Internship</option>
          </select>
          {fieldError("employment_type") ? (
            <p className="mt-1 text-xs text-destructive">{fieldError("employment_type")}</p>
          ) : null}
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="text-sm">
          <Label className="mb-1">Salary min *</Label>
          <Input
            required
            type="number"
            className="mt-1"
            {...form.register("salary_min", { valueAsNumber: true })}
          />
          {fieldError("salary_min") ? (
            <p className="mt-1 text-xs text-destructive">{fieldError("salary_min")}</p>
          ) : null}
        </label>
        <label className="text-sm">
          <Label className="mb-1">Salary max *</Label>
          <Input
            required
            type="number"
            className="mt-1"
            {...form.register("salary_max", { valueAsNumber: true })}
          />
          {fieldError("salary_max") ? (
            <p className="mt-1 text-xs text-destructive">{fieldError("salary_max")}</p>
          ) : null}
        </label>
        <label className="text-sm">
          <Label className="mb-1">Currency *</Label>
          <Input required className="mt-1" {...form.register("salary_currency")} />
          {fieldError("salary_currency") ? (
            <p className="mt-1 text-xs text-destructive">{fieldError("salary_currency")}</p>
          ) : null}
        </label>
      </div>

      <label className="block text-sm">
        <Label className="mb-1">Responsibilities (one per line) *</Label>
        <Textarea
          required
          className="mt-1"
          rows={4}
          defaultValue={toMultiline(defaultValues?.responsibilities ?? [])}
          {...form.register("responsibilities", {
            setValueAs: normalizeMultilineValue,
          })}
        />
        {fieldError("responsibilities") ? (
          <p className="mt-1 text-xs text-destructive">{fieldError("responsibilities")}</p>
        ) : null}
      </label>
      <label className="block text-sm">
        <Label className="mb-1">Requirements (one per line) *</Label>
        <Textarea
          required
          className="mt-1"
          rows={4}
          defaultValue={toMultiline(defaultValues?.requirements ?? [])}
          {...form.register("requirements", {
            setValueAs: normalizeMultilineValue,
          })}
        />
        {fieldError("requirements") ? (
          <p className="mt-1 text-xs text-destructive">{fieldError("requirements")}</p>
        ) : null}
      </label>
      <label className="block text-sm">
        <Label className="mb-1">Skills (one per line) *</Label>
        <Textarea
          required
          className="mt-1"
          rows={4}
          defaultValue={toMultiline(defaultValues?.skills ?? [])}
          {...form.register("skills", {
            setValueAs: normalizeMultilineValue,
          })}
        />
        {fieldError("skills") ? <p className="mt-1 text-xs text-destructive">{fieldError("skills")}</p> : null}
      </label>
      <label className="block text-sm">
        <Label className="mb-1">Nice-to-haves (optional, one per line)</Label>
        <Textarea
          className="mt-1"
          rows={3}
          defaultValue={toMultiline(defaultValues?.nice_to_haves ?? [])}
          {...form.register("nice_to_haves", {
            setValueAs: normalizeMultilineValue,
          })}
        />
      </label>
      <label className="block text-sm">
        <Label className="mb-1">Benefits (optional, one per line)</Label>
        <Textarea
          className="mt-1"
          rows={3}
          defaultValue={toMultiline(defaultValues?.benefits ?? [])}
          {...form.register("benefits", {
            setValueAs: normalizeMultilineValue,
          })}
        />
      </label>

      <label className="text-sm">
        <Label className="mb-1">Screening threshold (0-100) *</Label>
        <Input
          required
          type="number"
          className="mt-1 md:w-48"
          {...form.register("screening_threshold", { valueAsNumber: true })}
        />
        {fieldError("screening_threshold") ? (
          <p className="mt-1 text-xs text-destructive">{fieldError("screening_threshold")}</p>
        ) : null}
      </label>

      <div className="flex gap-3">
        <Button type="submit" name="intent" value="save" className="gap-1" size="default">
          {submitLabel}
        </Button>
        {secondarySubmitLabel ? (
          <Button
            type="submit"
            name="intent"
            value="publish"
            variant="secondary"
            className="gap-1"
            size="default"
            disabled={!canPublish}
            title={
              canPublish
                ? undefined
                : "Upload a company logo or use a company that already has one."
            }
          >
            {secondarySubmitLabel}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
