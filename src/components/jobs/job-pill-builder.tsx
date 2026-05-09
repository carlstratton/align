"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { JobForm } from "@/components/jobs/job-form";
import { JobPillSelector } from "@/components/jobs/job-pill-selector";
import {
  emptyPillSelections,
  JOB_PILL_SECTIONS,
  type PillSelections,
} from "@/lib/job-pill-taxonomy";
import {
  generateJobDraftAction,
  type GenerateDraftState,
} from "@/app/dashboard/jobs/generate/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CompanyOption = {
  id: string;
  name: string;
};

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
  const [pills, setPills] = useState<PillSelections>(emptyPillSelections());
  const [state, formAction, isPending] = useActionState(generateJobDraftAction, defaultState);
  const [requiredError, setRequiredError] = useState<string | null>(null);

  const missingRequiredSections = useMemo(
    () =>
      JOB_PILL_SECTIONS.filter((section) => section.required && pills[section.id].length === 0).map(
        (section) => section.label,
      ),
    [pills],
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
                <Input required name="title" placeholder="Senior Product Manager" />
              </label>
              <label className="text-sm">
                <Label className="mb-1">Role category *</Label>
                <Input required name="role_category" placeholder="Product" />
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
                  className="mt-1 w-full rounded-md border border-input bg-background px-2 py-2 text-sm"
                >
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="onsite">Onsite</option>
                </select>
              </label>
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

            <JobPillSelector value={pills} onChange={setPills} />

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
