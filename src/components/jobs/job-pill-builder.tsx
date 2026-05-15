"use client";

import { useEffect, useMemo, useState } from "react";
import { useActionState } from "react";
import { JobForm, type CompanyOption } from "@/components/jobs/job-form";
import { JobPillSelector } from "@/components/jobs/job-pill-selector";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

export function JobPillBuilder({ companies, createAction, error }: JobPillBuilderProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<JobRoleTemplateId>("product_designer");
  const activeTemplate = useMemo(
    () => getJobRoleTemplateById(selectedTemplateId),
    [selectedTemplateId],
  );
  const sections = activeTemplate.sections;

  const [pills, setPills] = useState<PillSelections>(emptyPillSelections());
  const [remoteType, setRemoteType] = useState("remote");
  const [state, formAction, isPending] = useActionState(generateJobDraftAction, defaultState);
  const [requiredError, setRequiredError] = useState<string | null>(null);

  useEffect(() => {
    setPills(emptyPillSelections());
  }, [selectedTemplateId]);

  const missingRequiredSections = useMemo(
    () =>
      sections
        .filter((section) => section.required && pills[section.id].length === 0)
        .map((section) => section.label),
    [pills, sections],
  );

  const generatedDraft = state.ok ? state.draft : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>1) Define role basics and select keyword pills</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={(formData) => {
              if (missingRequiredSections.length > 0) {
                setRequiredError(
                  `Please select at least one pill for: ${missingRequiredSections.join(", ")}.`,
                );
                return;
              }
              setRequiredError(null);
              formData.set("pills_json", JSON.stringify(pills));
              formAction(formData);
            }}
            className="space-y-4"
          >
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm">
                <Label className="mb-1">Job title *</Label>
                <select
                  className="mt-1 w-full rounded-md border border-input bg-background px-2 py-2 text-sm"
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value as JobRoleTemplateId)}
                >
                  {JOB_ROLE_TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.id === "generic" ? "Custom role…" : t.title}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-muted-foreground">
                  Chip options below update based on the role you pick. Custom role uses the generic pill library.
                </p>
              </label>
              {selectedTemplateId === "generic" ? (
                <label className="text-sm">
                  <Label className="mb-1">Custom title *</Label>
                  <Input required name="title" placeholder="e.g. Senior Product Manager" />
                </label>
              ) : (
                <input type="hidden" name="title" value={activeTemplate.title} />
              )}
              <label className="text-sm">
                <Label className="mb-1">Role category</Label>
                <Input name="role_category" placeholder="Product (optional)" />
              </label>
              <label className="text-sm">
                <Label className="mb-1">Country *</Label>
                <Input required name="location_country" placeholder="United Kingdom" />
              </label>
              <label className="text-sm">
                <Label className="mb-1">City *</Label>
                <Input required name="location_city" placeholder="London" />
              </label>
              <label className="text-sm">
                <Label className="mb-1">Remote type *</Label>
                <select
                  required
                  name="remote_type"
                  value={remoteType}
                  onChange={(e) => setRemoteType(e.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-2 py-2 text-sm"
                >
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="onsite">Onsite</option>
                </select>
              </label>
              <div className="text-sm" hidden={remoteType !== "hybrid"}>
                <Label className="mb-1" htmlFor="pill_hybrid_office_days">
                  Office days per week (hybrid)
                </Label>
                <select
                  id="pill_hybrid_office_days"
                  name="hybrid_office_days_per_week"
                  defaultValue={0}
                  className="mt-1 w-full rounded-md border border-input bg-background px-2 py-2 text-sm"
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
              </div>
              <label className="text-sm">
                <Label className="mb-1">Employment type *</Label>
                <select
                  required
                  name="employment_type"
                  className="mt-1 w-full rounded-md border border-input bg-background px-2 py-2 text-sm"
                >
                  <option value="full_time">Full-time</option>
                  <option value="part_time">Part-time</option>
                  <option value="contract">Contract</option>
                  <option value="temporary">Temporary</option>
                  <option value="internship">Internship</option>
                </select>
              </label>
              <label className="text-sm">
                <Label className="mb-1">Seniority *</Label>
                <select
                  required
                  name="seniority"
                  className="mt-1 w-full rounded-md border border-input bg-background px-2 py-2 text-sm"
                >
                  <option value="junior">Junior</option>
                  <option value="mid">Mid</option>
                  <option value="senior">Senior</option>
                  <option value="lead">Lead</option>
                  <option value="executive">Executive</option>
                </select>
              </label>
              <label className="text-sm">
                <Label className="mb-1">Salary min *</Label>
                <Input required name="salary_min" type="number" defaultValue={60000} />
              </label>
              <label className="text-sm">
                <Label className="mb-1">Salary max *</Label>
                <Input required name="salary_max" type="number" defaultValue={90000} />
              </label>
              <label className="text-sm">
                <Label className="mb-1">Currency *</Label>
                <Input required name="salary_currency" defaultValue="GBP" />
              </label>
              <label className="text-sm">
                <Label className="mb-1">Screening threshold *</Label>
                <Input required name="screening_threshold" type="number" defaultValue={70} />
              </label>
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
              defaultValues={generatedDraft}
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
