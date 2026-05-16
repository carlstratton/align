"use client";

import { useCallback, useEffect, useState, useActionState } from "react";
import { getCompanyLogoPublicUrl } from "@/lib/company-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import type { CompanyOption } from "@/components/jobs/job-form";
import {
  createCompanyAction,
  updateCompanyAction,
  type CompanyUpsertState,
} from "@/app/(product)/dashboard/jobs/actions";

const ABOUT_WORD_LIMIT = 100;

function wordCount(text: string) {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
}

const initialState: CompanyUpsertState = { ok: false, error: null, company: null };

type FormProps = {
  mode: "add" | "edit";
  company?: CompanyOption;
  onSaved: (company: CompanyOption) => void;
  onClose: () => void;
};

/** Inner form — only mounted while dialog is open so useActionState resets between opens. */
function CompanyUpsertForm({ mode, company, onSaved, onClose }: FormProps) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const action = mode === "add" ? createCompanyAction : updateCompanyAction;
  const [state, formAction, isPending] = useActionState(action, initialState);

  const [about, setAbout] = useState(company?.about ?? "");
  const [hasStagedLogo, setHasStagedLogo] = useState(false);

  useEffect(() => {
    if (!state.ok || !state.company) return;
    onSaved(state.company);
    onClose();
    // useActionState may return a new `state.company` object each render; `id` is the stable success signal.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when success flips or company id changes
  }, [state.ok, state.company?.id, onSaved, onClose]);

  const words = wordCount(about);
  const overLimit = words > ABOUT_WORD_LIMIT;
  const logoUrl = getCompanyLogoPublicUrl(supabaseUrl, company?.logo_storage_path ?? null);

  return (
    <form action={formAction} className="space-y-4">
      {mode === "edit" && company ? (
        <input type="hidden" name="company_id" value={company.id} />
      ) : null}

      <div className="grid gap-1.5">
        <Label htmlFor="company-name">Company name *</Label>
        <Input
          id="company-name"
          name="name"
          required
          defaultValue={company?.name ?? ""}
          placeholder="Acme Corp"
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="company-logo">
          Badge (logo){" "}
          {mode === "edit" ? <span className="text-muted-foreground text-xs">(replace existing)</span> : null}
        </Label>
        {logoUrl && !hasStagedLogo ? (
          <div className="mb-1 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt=""
              className="size-14 shrink-0 rounded-md border border-border object-cover"
            />
            <span className="text-xs text-muted-foreground">Current badge on file</span>
          </div>
        ) : null}
        <Input
          id="company-logo"
          name="logo"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="cursor-pointer"
          onChange={(e) => setHasStagedLogo(Boolean(e.target.files?.length))}
        />
        <p className="text-xs text-muted-foreground">PNG, JPEG, or WebP. Max 2 MB.</p>
      </div>

      <div className="grid gap-1.5">
        <div className="flex items-baseline justify-between">
          <Label htmlFor="company-about">About the company</Label>
          <span className={`text-xs ${overLimit ? "text-destructive font-medium" : "text-muted-foreground"}`}>
            {words}/{ABOUT_WORD_LIMIT} words
          </span>
        </div>
        <Textarea
          id="company-about"
          name="about"
          rows={4}
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          placeholder="A short description of what the company does and what makes it a great place to work."
        />
        {overLimit ? (
          <p className="text-xs text-destructive">
            Please keep the description to {ABOUT_WORD_LIMIT} words or fewer.
          </p>
        ) : null}
      </div>

      {state.error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" size="sm">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" size="sm" disabled={isPending || overLimit}>
          {isPending ? "Saving…" : "Save company"}
        </Button>
      </DialogFooter>
    </form>
  );
}

type Props = {
  mode: "add" | "edit";
  company?: CompanyOption;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (company: CompanyOption) => void;
};

export function CompanyUpsertDialog({ mode, company, open, onOpenChange, onSaved }: Props) {
  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Add company" : "Edit company"}</DialogTitle>
        </DialogHeader>
        {/* Unmount when closed so useActionState and form state do not leak across opens. */}
        {open ? (
          <CompanyUpsertForm
            key={`${mode}-${company?.id ?? "new"}`}
            mode={mode}
            company={company}
            onSaved={onSaved}
            onClose={handleClose}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
