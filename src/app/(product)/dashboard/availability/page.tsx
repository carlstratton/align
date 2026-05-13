import { PageCard } from "@/components/layout/page-card";
import { createClient } from "@/lib/supabase/server";
import {
  createAvailabilityWindowAction,
  disconnectGoogleCalendarAction,
  toggleAvailabilityWindowAction,
} from "@/app/(product)/dashboard/availability/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TypographyH3, TypographyMuted, TypographyP } from "@/components/ui/typography";

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

      <div className="mb-6 rounded-md border border-border p-4">
        <TypographyH3 className="text-sm sm:text-base">Google Calendar integration</TypographyH3>
        <TypographyMuted className="mt-1">
          Connect Google Calendar to automatically create events with Google Meet links when candidates book.
        </TypographyMuted>
        <TypographyP className="mt-2 text-sm">
          Status:{" "}
          <span className="font-medium">
            {googleAccount?.google_email ? `Connected as ${googleAccount.google_email}` : "Not connected"}
          </span>
        </TypographyP>
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
        <div className="space-y-2">
          <Label htmlFor="availability-day">Day</Label>
          <select
            id="availability-day"
            name="day_of_week"
            defaultValue="1"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          >
            {DAYS.map((day, index) => (
              <option key={day} value={index}>
                {day}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="availability-start">Start time</Label>
          <Input
            id="availability-start"
            name="start_time"
            type="time"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="availability-end">End time</Label>
          <Input id="availability-end" name="end_time" type="time" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="availability-tz">Timezone</Label>
          <Input id="availability-tz" name="timezone" defaultValue="UTC" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="availability-duration">Duration (minutes)</Label>
          <Input
            id="availability-duration"
            name="interview_duration_minutes"
            type="number"
            defaultValue={30}
            min={15}
            max={120}
          />
        </div>
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
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3"
          >
            <TypographyP className="!mt-0 text-sm">
              {DAYS[window.day_of_week]} • {window.start_time} - {window.end_time} •{" "}
              {window.interview_duration_minutes} min • {window.timezone} •{" "}
              {window.is_active ? "Active" : "Inactive"}
            </TypographyP>
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
          <TypographyMuted>No availability windows set yet. Add one to enable scheduling.</TypographyMuted>
        ) : null}
      </div>
    </PageCard>
  );
}
