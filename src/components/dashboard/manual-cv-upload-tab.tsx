"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  TypographyH3,
  TypographyInlineCode,
  TypographyMuted,
  TypographyP,
} from "@/components/ui/typography";

type QueueItem = {
  id: string;
  status: string;
  cv_original_filename: string | null;
  applied_at: string;
  error_message: string | null;
};

function statusLabel(status: string) {
  if (status === "submitted") return "Queued";
  if (status === "processing") return "Processing";
  if (status === "error") return "Failed";
  return status;
}

export function ManualCvUploadTab({ jobId }: { jobId: string }) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadQueue = useCallback(
    async (opts?: { silent?: boolean }) => {
      const res = await fetch(`/api/dashboard/jobs/${jobId}/manual-cvs`, {
        credentials: "same-origin",
      });
      const rawText = await res.text();
      let payload: { items?: QueueItem[]; error?: string; detail?: string } = {};
      try {
        payload = rawText ? (JSON.parse(rawText) as typeof payload) : {};
      } catch {
        payload = {};
      }
      if (!opts?.silent) {
        setLoading(false);
      }
      if (!res.ok) {
        if (!opts?.silent) {
          if (res.status === 401) {
            setMessage("Could not load the upload queue. Try signing in again.");
          } else if (res.status === 403) {
            setMessage("Could not load the upload queue. You may not have access to this job.");
          } else if (payload.detail) {
            setMessage(`Could not load the upload queue: ${payload.detail}`);
          } else if (payload.error) {
            setMessage(`Could not load the upload queue: ${payload.error}`);
          } else {
            setMessage("Could not load the upload queue.");
          }
        }
        return;
      }
      setItems(payload.items ?? []);
    },
    [jobId],
  );

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const needsPoll = items.some((i) => i.status === "submitted" || i.status === "processing");

  useEffect(() => {
    if (!needsPoll) return;
    const t = setInterval(() => void loadQueue({ silent: true }), 2000);
    return () => clearInterval(t);
  }, [needsPoll, loadQueue]);

  async function onFilesSelected(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setUploadProgress(null);
    setMessage(null);

    const fileArray = Array.from(files);
    const fileErrors: string[] = [];

    try {
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        setUploadProgress(
          fileArray.length > 1 ? `Uploading ${i + 1} of ${fileArray.length}…` : "Uploading…",
        );

        const fd = new FormData();
        fd.append("files", file);

        let res: Response;
        try {
          res = await fetch(`/api/dashboard/jobs/${jobId}/manual-cvs`, {
            method: "POST",
            body: fd,
            credentials: "same-origin",
          });
        } catch (err) {
          console.error("ManualCvUploadTab fetch error:", file.name, err);
          fileErrors.push(`${file.name}: network error`);
          continue;
        }

        type UploadPayload = {
          ok?: boolean;
          error?: { kind: string; message?: string };
          errors?: { filename: string; message: string }[];
          details?: { filename: string; message: string }[];
        };

        let payload: UploadPayload = {};
        try {
          payload = (await res.json()) as UploadPayload;
        } catch {
          payload = {};
        }

        if (!res.ok || payload.ok === false) {
          const kind = payload.error?.kind ?? "";
          if (res.status === 401 || kind === "unauthorized") {
            setMessage("You need to sign in again to upload CVs.");
            return;
          }
          if (res.status === 403 || kind === "forbidden") {
            setMessage("You do not have access to upload CVs for this job.");
            return;
          }
          if (res.status === 503 || kind === "service_unavailable") {
            setMessage(
              "Uploads are temporarily unavailable. Check that SUPABASE_SERVICE_ROLE_KEY is set on Vercel and redeploy.",
            );
            return;
          }
          if (res.status === 400 || kind === "bad_request") {
            const detailMsg =
              Array.isArray(payload.details) && payload.details.length
                ? payload.details.map((d) => d.message).join("; ")
                : payload.error?.message ?? null;
            fileErrors.push(`${file.name}: ${detailMsg ?? "invalid file"}`);
            continue;
          }
          fileErrors.push(`${file.name}: upload failed (${res.status})`);
          continue;
        }

        if (Array.isArray(payload.errors) && payload.errors.length) {
          for (const e of payload.errors) {
            fileErrors.push(`${e.filename}: ${e.message}`);
          }
        }
      }

      if (fileErrors.length) {
        setMessage(`Some files failed: ${fileErrors.join("; ")}`);
      }
      void loadQueue({ silent: true });
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  return (
    <div className="space-y-4">
      <TypographyMuted>
        Upload up to 20 CVs (PDF or DOCX, 3MB each). Each file creates a candidate record and runs the
        same screening pipeline as public applications. Finished candidates appear under the Applicants tab.
        Synthetic emails use the form{" "}
        <TypographyInlineCode className="text-xs">manual-…@candidates.local</TypographyInlineCode>
        — update candidate details later if you add that workflow.
      </TypographyMuted>

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          multiple
          className="sr-only"
          disabled={uploading}
          onChange={(e) => void onFilesSelected(e.target.files)}
        />
        <Button
          type="button"
          size="xs"
          variant="outline"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          Choose files
        </Button>
      </div>

      {uploading ? <TypographyMuted>{uploadProgress ?? "Uploading…"}</TypographyMuted> : null}
      {message ? (
        <TypographyP className="!mt-0 text-sm text-amber-900 dark:text-amber-200">{message}</TypographyP>
      ) : null}

      <div>
        <TypographyH3 className="mb-2 text-sm">Queue</TypographyH3>
        {loading ? (
          <TypographyMuted>Loading…</TypographyMuted>
        ) : items.length === 0 ? (
          <TypographyMuted>No uploads in progress.</TypographyMuted>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="rounded-md border border-border bg-card px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{item.cv_original_filename ?? "CV"}</span>
                  <span className="text-xs text-muted-foreground">{statusLabel(item.status)}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(item.applied_at).toLocaleString()}
                </p>
                {item.status === "error" && item.error_message ? (
                  <p className="mt-1 text-xs text-destructive">{item.error_message}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
