"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2Icon, ExternalLinkIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type JobPublishedDialogProps = {
  jobTitle: string;
  jobSlug: string;
};

export function JobPublishedDialog({ jobTitle, jobSlug }: JobPublishedDialogProps) {
  const [open, setOpen] = useState(true);
  const router = useRouter();

  // Remove the ?published=true query param from the URL when the dialog closes
  // so refreshing the page doesn't re-open it.
  useEffect(() => {
    if (!open) {
      router.replace(window.location.pathname, { scroll: false });
    }
  }, [open, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2Icon className="size-5 shrink-0 text-emerald-500" />
            <DialogTitle>Job published</DialogTitle>
          </div>
          <DialogDescription>
            <span className="font-medium text-foreground">{jobTitle}</span> is now live and accepting applications.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button asChild variant="default">
            <a href={`/jobs/${jobSlug}`} target="_blank" rel="noreferrer" className="flex items-center gap-2">
              View live listing
              <ExternalLinkIcon className="size-3.5" />
            </a>
          </Button>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
