"use client";

import { useActionState, useCallback, useEffect, useMemo, startTransition, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PencilIcon, PlusIcon } from "lucide-react";

import { JobForm, type CompanyOption } from "@/components/jobs/job-form";
import { JobPillSelector } from "@/components/jobs/job-pill-selector";
import { CompanyUpsertDialog } from "@/components/jobs/company-upsert-dialog";
import { emptyPillSelections, type PillSelections } from "@/lib/job-pill-taxonomy";
import {
  getJobRoleTemplateById,
  JOB_ROLE_TEMPLATES,
  type JobRoleTemplateId,
} from "@/lib/job-role-templates";
import {
  generateJobDraftAction,
  type GenerateDraftState,
} from "@/app/(product)/dashboard/jobs/generate/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  jobPillBasicsFormSchema,
  type JobPillBasicsFormValues,
} from "@/lib/validation/job-pill-basics";

type JobPillBuilderProps = {
  companies: CompanyOption[];
  createAction: (formData: FormData) => void;
  error?: string;
};

const defaultState: GenerateDraftState = {
  ok: false,
  error: null,
  warning: null,
  draft: null,
};

const formDefaultValues: JobPillBasicsFormValues = {
  title: "Product Designer",
  role_category: "",
  location_country: "",
  location_city: "",
  remote_type: "remote",
  hybrid_office_days_per_week: 0,
  employment_type: "full_time",
  seniority: "mid",
  salary_min: 60000,
  salary_max: 90000,
  salary_currency: "GBP",
  screening_threshold: 70,
};

export function JobPillBuilder({ companies: initialCompanies, createAction, error }: JobPillBuilderProps) {
  // Company list is managed client-side so new/edited companies appear immediately
  const [companies, setCompanies] = useState<CompanyOption[]>(initialCompanies);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(initialCompanies[0]?.id ?? "");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);

  function openAddDialog() {
    setDialogMode("add");
    setDialogOpen(true);
  }
  function openEditDialog() {
    setDialogMode("edit");
    setDialogOpen(true);
  }
  const handleCompanySaved = useCallback((company: CompanyOption) => {
    setCompanies((prev) => {
      const idx = prev.findIndex((c) => c.id === company.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = company;
        return next;
      }
      return [...prev, company];
    });
    setSelectedCompanyId(company.id);
  }, []);

  const [selectedTemplateId, setSelectedTemplateId] = useState<JobRoleTemplateId>("product_designer");
  const activeTemplate = useMemo(
    () => getJobRoleTemplateById(selectedTemplateId),
    [selectedTemplateId],
  );
  const sections = activeTemplate.sections;

  const [pills, setPills] = useState<PillSelections>(emptyPillSelections());
  const [state, formAction, isPending] = useActionState(generateJobDraftAction, defaultState);
  const [requiredError, setRequiredError] = useState<string | null>(null);

  const form = useForm<JobPillBasicsFormValues>({
    resolver: zodResolver(jobPillBasicsFormSchema),
    defaultValues: formDefaultValues,
  });

  const remoteType = form.watch("remote_type");

  useEffect(() => {
    setPills(emptyPillSelections());
    if (selectedTemplateId === "generic") {
      form.setValue("title", "");
    } else {
      form.setValue("title", activeTemplate.title);
    }
  }, [selectedTemplateId, activeTemplate.title, form]);

  const missingRequiredSections = useMemo(
    () =>
      sections
        .filter((section) => section.required && pills[section.id].length === 0)
        .map((section) => section.label),
    [pills, sections],
  );

  const generatedDraft = state.ok ? state.draft : null;

  function onSubmit(values: JobPillBasicsFormValues) {
    if (missingRequiredSections.length > 0) {
      setRequiredError(`Please select at least one pill for: ${missingRequiredSections.join(", ")}.`);
      return;
    }
    setRequiredError(null);

    const fd = new FormData();
    fd.set("title", values.title.trim());
    fd.set("role_category", values.role_category.trim());
    fd.set("location_country", values.location_country.trim());
    fd.set("location_city", values.location_city.trim());
    fd.set("remote_type", values.remote_type);
    const hybridDays = values.remote_type === "hybrid" ? values.hybrid_office_days_per_week : 0;
    fd.set("hybrid_office_days_per_week", String(hybridDays));
    fd.set("employment_type", values.employment_type);
    fd.set("seniority", values.seniority);
    fd.set("salary_min", String(values.salary_min));
    fd.set("salary_max", String(values.salary_max));
    fd.set("salary_currency", values.salary_currency.trim().toUpperCase());
    fd.set("screening_threshold", String(values.screening_threshold));
    fd.set("pills_json", JSON.stringify(pills));
    startTransition(() => {
      formAction(fd);
    });
  }

  return (
    <div className="space-y-6">
      <CompanyUpsertDialog
        mode={dialogMode}
        company={dialogMode === "edit" ? selectedCompany : undefined}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={handleCompanySaved}
      />

      <Card>
        <CardHeader>
          <CardTitle>1) Define role basics and select keyword pills</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              {/* Company selector */}
              <div className="grid gap-2">
                <Label>Company *</Label>
                <div className="flex items-center gap-2">
                  {companies.length > 0 ? (
                    <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                      <SelectTrigger className="flex-1 w-full">
                        <SelectValue placeholder="Select a company" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="flex-1 text-sm text-muted-foreground">No companies yet — add one to continue.</p>
                  )}
                  {selectedCompany ? (
                    <Button type="button" variant="outline" size="sm" onClick={openEditDialog} className="shrink-0 gap-1.5">
                      <PencilIcon className="size-3.5" />
                      Edit
                    </Button>
                  ) : null}
                  <Button type="button" variant="outline" size="sm" onClick={openAddDialog} className="shrink-0 gap-1.5">
                    <PlusIcon className="size-3.5" />
                    Add new
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Job title *</Label>
                  <Select
                    value={selectedTemplateId}
                    onValueChange={(v) => setSelectedTemplateId(v as JobRoleTemplateId)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {JOB_ROLE_TEMPLATES.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.id === "generic" ? "Custom role…" : t.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Chip options below update based on the role you pick. Custom role uses the generic pill
                    library.
                  </p>
                </div>

                {selectedTemplateId === "generic" ? (
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Custom title *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Senior Product Manager" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : null}

                <FormField
                  control={form.control}
                  name="role_category"
                  render={({ field }) => (
                    <FormItem className="self-start">
                      <FormLabel>Role category</FormLabel>
                      <FormControl>
                        <Input placeholder="Product (optional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location_country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country *</FormLabel>
                      <FormControl>
                        <Input placeholder="United Kingdom" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location_city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City *</FormLabel>
                      <FormControl>
                        <Input placeholder="London" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="remote_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Remote type *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="remote">Remote</SelectItem>
                          <SelectItem value="hybrid">Hybrid</SelectItem>
                          <SelectItem value="onsite">On-site</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {remoteType === "hybrid" ? (
                  <FormField
                    control={form.control}
                    name="hybrid_office_days_per_week"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Office days per week (hybrid)</FormLabel>
                        <Select
                          value={String(field.value)}
                          onValueChange={(v) => field.onChange(Number(v))}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="0">Open to discussion</SelectItem>
                            <SelectItem value="1">1 day per week</SelectItem>
                            <SelectItem value="2">2 days per week</SelectItem>
                            <SelectItem value="3">3 days per week</SelectItem>
                            <SelectItem value="4">4 days per week</SelectItem>
                            <SelectItem value="5">5 days per week</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Only shown on the public listing if you pick more than zero days.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : null}

                <FormField
                  control={form.control}
                  name="employment_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employment type *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="full_time">Full time</SelectItem>
                          <SelectItem value="part_time">Part time</SelectItem>
                          <SelectItem value="contract">Contract</SelectItem>
                          <SelectItem value="temporary">Temporary</SelectItem>
                          <SelectItem value="internship">Internship</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="seniority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seniority *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="junior">Junior</SelectItem>
                          <SelectItem value="mid">Mid</SelectItem>
                          <SelectItem value="senior">Senior</SelectItem>
                          <SelectItem value="lead">Lead</SelectItem>
                          <SelectItem value="executive">Executive</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="salary_min"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Salary min *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="salary_max"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Salary max *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="salary_currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency *</FormLabel>
                      <FormControl>
                        <Input placeholder="GBP" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="screening_threshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Screening threshold (0–100) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <JobPillSelector
                key={selectedTemplateId}
                sections={sections}
                value={pills}
                onChange={setPills}
              />

              {requiredError ? <p className="text-sm text-destructive">{requiredError}</p> : null}
              {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
              {state.warning ? <p className="text-sm text-amber-700">{state.warning}</p> : null}
              <p className="text-xs text-muted-foreground">
                AI-generated drafts are assistive only. You can edit all fields before saving or publishing.
              </p>

              <Button type="submit" disabled={isPending}>
                {isPending ? "Generating..." : "Generate AI draft"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {generatedDraft ? (
        <Card>
          <CardHeader>
            <CardTitle>2) Edit generated draft and publish</CardTitle>
          </CardHeader>
          <CardContent>
            <JobForm
              key={JSON.stringify(generatedDraft)}
              companies={companies}
              action={createAction}
              defaultValues={{ ...generatedDraft, company_id: selectedCompanyId }}
              submitLabel="Save draft"
              secondarySubmitLabel="Publish now"
              error={error}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
