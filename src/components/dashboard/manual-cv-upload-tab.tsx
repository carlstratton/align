"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { uploadManualCvsAction } from "@/app/(product)/dashboard/jobs/manual-cv-upload-actions";
import { Button } from "@/components/ui/button";

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
    setMessage(null);
    const fd = new FormData();
    for (const f of Array.from(files)) {
      fd.append("files", f);
    }
    try {
      const result = await uploadManualCvsAction(jobId, fd);
      if (!result.ok) {
        const err = result.error;
        if (err.kind === "unauthorized") {
          setMessage("You need to sign in again to upload CVs.");
        } else if (err.kind === "forbidden") {
          setMessage("You do not have access to upload CVs for this job.");
        } else if (err.kind === "service_unavailable") {
          setMessage("Uploads are temporarily unavailable. Please try again later.");
        } else if (err.kind === "bad_request") {
          const detailMsg =
            Array.isArray(result.details) && result.details.length
              ? result.details.map((d) => `${d.filename}: ${d.message}`).join("; ")
              : null;
          setMessage(detailMsg ?? err.message);
        }
        return;
      }
      if (result.errors.length) {
        setMessage(
          `Some files failed: ${result.errors.map((e) => `${e.filename}: ${e.message}`).join("; ")}`,
        );
      }
      void loadQueue({ silent: true });
    } catch {
      setMessage("Upload failed. Check your connection and try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Upload up to 20 CVs (PDF or DOCX, 3MB each). Each file creates a candidate record and runs the
        same screening pipeline as public applications. Finished candidates appear under the Applicants tab.
        Synthetic emails use the form{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">manual-…@candidates.local</code>
        — update candidate details later if you add that workflow.
      </p>

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

      {uploading ? <p className="text-sm text-muted-foreground">Uploading…</p> : null}
      {message ? <p className="text-sm text-amber-900 dark:text-amber-200">{message}</p> : null}

      <div>
        <h3 className="mb-2 text-sm font-semibold">Queue</h3>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No uploads in progress.</p>
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
