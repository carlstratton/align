import { PageCard } from "@/components/layout/page-card";
import { createClient } from "@/lib/supabase/server";
import {
  createAvailabilityWindowAction,
  disconnectGoogleCalendarAction,
  toggleAvailabilityWindowAction,
} from "@/app/dashboard/availability/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

type AvailabilityPageProps = {
  searchParams: Promise<{ error?: string; google?: string }>;
};

export default async function AvailabilityPage({ searchParams }: AvailabilityPageProps) {
  const query = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: windows } = await supabase
    .from("availability_windows")
    .select("id, day_of_week, start_time, end_time, timezone, interview_duration_minutes, is_active")
    .eq("recruiter_id", user?.id ?? "")
    .order("day_of_week", { ascending: true });
  const { data: googleAccount } = await supabase
    .from("recruiter_google_accounts")
    .select("google_email")
    .eq("recruiter_id", user?.id ?? "")
    .maybeSingle();

  return (
    <PageCard
      title="Availability"
      description="Define interview availability windows used for candidate booking links."
    >
      {query.error ? (
        <p className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {query.error}
        </p>
      ) : null}
      {query.google === "connected" ? (
        <p className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          Google Calendar connected successfully.
        </p>
      ) : null}
      {query.google === "disconnected" ? (
        <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Google Calendar disconnected.
        </p>
      ) : null}

      <div className="mb-6 rounded-md border border-slate-200 p-4">
        <h3 className="font-medium">Google Calendar integration</h3>
        <p className="mt-1 text-sm text-slate-600">
          Connect Google Calendar to automatically create events with Google Meet links when candidates book.
        </p>
        <p className="mt-2 text-sm text-slate-700">
          Status:{" "}
          <span className="font-medium">
            {googleAccount?.google_email ? `Connected as ${googleAccount.google_email}` : "Not connected"}
          </span>
        </p>
        <div className="mt-3 flex gap-2">
          {!googleAccount?.google_email ? (
            <Button asChild variant="outline" size="xs">
              <a href="/api/integrations/google/connect">Connect Google Calendar</a>
            </Button>
          ) : null}
          {googleAccount?.google_email ? (
            <form action={disconnectGoogleCalendarAction}>
              <Button type="submit" variant="outline" size="xs">
                Disconnect
              </Button>
            </form>
          ) : null}
        </div>
      </div>

      <form action={createAvailabilityWindowAction} className="mb-6 grid gap-3 md:grid-cols-3">
        <label className="text-sm">
          Day
          <select
            name="day_of_week"
            defaultValue="1"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          >
            {DAYS.map((day, index) => (
              <option key={day} value={index}>
                {day}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Start time
          <Input
            name="start_time"
            type="time"
            required
            className="mt-1"
          />
        </label>
        <label className="text-sm">
          End time
          <Input
            name="end_time"
            type="time"
            required
            className="mt-1"
          />
        </label>
        <label className="text-sm">
          Timezone
          <Input
            name="timezone"
            defaultValue="UTC"
            className="mt-1"
          />
        </label>
        <label className="text-sm">
          Duration (minutes)
          <Input
            name="interview_duration_minutes"
            type="number"
            defaultValue={30}
            min={15}
            max={120}
            className="mt-1"
          />
        </label>
        <div className="flex items-end">
          <Button type="submit">
            Add window
          </Button>
        </div>
      </form>

      <div className="space-y-2">
        {(windows ?? []).map((window) => (
          <div
            key={window.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 p-3"
          >
            <p className="text-sm text-slate-700">
              {DAYS[window.day_of_week]} • {window.start_time} - {window.end_time} •{" "}
              {window.interview_duration_minutes} min • {window.timezone} •{" "}
              {window.is_active ? "Active" : "Inactive"}
            </p>
            <form action={toggleAvailabilityWindowAction}>
              <input type="hidden" name="window_id" value={window.id} />
              <input type="hidden" name="active" value={window.is_active ? "false" : "true"} />
              <Button type="submit" variant="outline" size="xs" className="px-2">
                {window.is_active ? "Disable" : "Enable"}
              </Button>
            </form>
          </div>
        ))}
        {windows?.length === 0 ? (
          <p className="text-sm text-slate-600">
            No availability windows set yet. Add one to enable scheduling.
          </p>
        ) : null}
      </div>
    </PageCard>
  );
}
