"use client";

import { useEffect, useState } from "react";

import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  jobDraftSchema,
  type JobDraftFormInput,
  type JobDraftInput,
} from "@/lib/validation/job";
import { toMultiline } from "@/lib/jobs";
import { getCompanyLogoPublicUrl } from "@/lib/company-logo";
import { getJobLogoPublicUrl } from "@/lib/job-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type CompanyOption = {
  id: string;
  name: string;
  logo_storage_path: string | null;
  about: string | null;
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
      hide_company_identity: defaultValues?.hide_company_identity ?? false,
    },
  });
  const {
    formState: { errors },
  } = form;

  const remoteType = useWatch({ control: form.control, name: "remote_type" });
  const companyId = useWatch({ control: form.control, name: "company_id" });
  const hideCompanyIdentity = useWatch({ control: form.control, name: "hide_company_identity" });

  const selectedCompany = companies.find((c) => c.id === companyId);
  const companyBadgePath = selectedCompany?.logo_storage_path ?? null;

  const logoPublicUrl = getJobLogoPublicUrl(supabaseUrl, existingLogoPath ?? null);
  const companyBadgePublicUrl = getCompanyLogoPublicUrl(supabaseUrl, companyBadgePath);
  const canPublish = hideCompanyIdentity || Boolean(existingLogoPath || hasStagedLogo || companyBadgePath);

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
    <form action={action} className="space-y-4">
      {defaultValues?.id ? <input type="hidden" name="job_id" value={defaultValues.id} /> : null}
      {error ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      <p className="text-xs text-muted-foreground">Fields marked with * are mandatory.</p>

      <label className="flex items-center gap-3 rounded-md border border-border p-3 text-sm">
        <input
          type="checkbox"
          {...form.register("hide_company_identity")}
          className="size-4 rounded"
        />
        <span>
          <span className="font-medium">Keep company identity confidential</span>
          <span className="ml-1 text-muted-foreground">— company name and logo will not be shown on the public listing.</span>
        </span>
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>Company *</Label>
          <Controller
            control={form.control}
            name="company_id"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {fieldError("company_id") ? (
            <p className="text-xs text-destructive">{fieldError("company_id")}</p>
          ) : null}
        </div>
        <div className="text-sm md:col-span-2">
          <Label className="mb-1" htmlFor="company_logo">
            Listing logo{secondarySubmitLabel ? " (optional if company has a badge)" : ""}
          </Label>
          {!hideCompanyIdentity ? (
            <>
              {logoPublicUrl ? (
                <div className="mt-2 mb-2 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoPublicUrl}
                    alt=""
                    className="size-16 shrink-0 rounded-md border border-border object-cover"
                  />
                  <span className="text-xs text-muted-foreground">Listing-specific logo on file</span>
                </div>
              ) : companyBadgePublicUrl ? (
                <div className="mt-2 mb-2 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={companyBadgePublicUrl}
                    alt=""
                    className="size-16 shrink-0 rounded-md border border-border object-cover"
                  />
                  <span className="text-xs text-muted-foreground">
                    Using company badge for listings (add a file above to override for this job only).
                  </span>
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
            </>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              Logo upload is hidden — a confidential placeholder will be shown on the listing.
            </p>
          )}
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
        <div className="grid gap-1.5">
          <Label>Seniority *</Label>
          <Controller
            control={form.control}
            name="seniority"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="junior">Junior</SelectItem>
                  <SelectItem value="mid">Mid</SelectItem>
                  <SelectItem value="senior">Senior</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="executive">Executive</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {fieldError("seniority") ? (
            <p className="text-xs text-destructive">{fieldError("seniority")}</p>
          ) : null}
        </div>
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
        <div className="grid gap-1.5">
          <Label>Remote type *</Label>
          <Controller
            control={form.control}
            name="remote_type"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="onsite">On-site</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {fieldError("remote_type") ? (
            <p className="text-xs text-destructive">{fieldError("remote_type")}</p>
          ) : null}
        </div>
        {remoteType === "hybrid" ? (
          <div className="grid gap-1.5">
            <Label>Office days per week (hybrid)</Label>
            <Controller
              control={form.control}
              name="hybrid_office_days_per_week"
              render={({ field }) => (
                <Select
                  value={String(field.value ?? 0)}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Open to discussion</SelectItem>
                    <SelectItem value="1">1 day per week</SelectItem>
                    <SelectItem value="2">2 days per week</SelectItem>
                    <SelectItem value="3">3 days per week</SelectItem>
                    <SelectItem value="4">4 days per week</SelectItem>
                    <SelectItem value="5">5 days per week</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-xs text-muted-foreground">
              Only shown on the public listing if you pick more than zero days.
            </p>
            {fieldError("hybrid_office_days_per_week") ? (
              <p className="text-xs text-destructive">{fieldError("hybrid_office_days_per_week")}</p>
            ) : null}
          </div>
        ) : null}
        <div className="grid gap-1.5">
          <Label>Employment *</Label>
          <Controller
            control={form.control}
            name="employment_type"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">Full time</SelectItem>
                  <SelectItem value="part_time">Part time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="temporary">Temporary</SelectItem>
                  <SelectItem value="internship">Internship</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {fieldError("employment_type") ? (
            <p className="text-xs text-destructive">{fieldError("employment_type")}</p>
          ) : null}
        </div>
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
                : "Upload a listing logo here or choose a company that already has a badge."
            }
          >
            {secondarySubmitLabel}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
