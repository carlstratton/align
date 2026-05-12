"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getNumber(formData: FormData, key: string, fallback: number) {
  const value = Number(getString(formData, key));
  return Number.isFinite(value) ? value : fallback;
}

export async function createAvailabilityWindowAction(formData: FormData) {
  const dayOfWeek = getNumber(formData, "day_of_week", 1);
  const startTime = getString(formData, "start_time");
  const endTime = getString(formData, "end_time");
  const timezone = getString(formData, "timezone") || "UTC";
  const interviewDuration = getNumber(formData, "interview_duration_minutes", 30);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { error } = await supabase.from("availability_windows").insert({
    recruiter_id: user.id,
    day_of_week: dayOfWeek,
    start_time: startTime,
    end_time: endTime,
    timezone,
    interview_duration_minutes: interviewDuration,
    is_active: true,
  });

  if (error) {
    redirect(`/dashboard/availability?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/availability");
  redirect("/dashboard/availability");
}

export async function toggleAvailabilityWindowAction(formData: FormData) {
  const windowId = getString(formData, "window_id");
  const active = getString(formData, "active") === "true";
  const supabase = await createClient();

  const { error } = await supabase
    .from("availability_windows")
    .update({ is_active: active })
    .eq("id", windowId);

  if (error) {
    redirect(`/dashboard/availability?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/availability");
  redirect("/dashboard/availability");
}

export async function disconnectGoogleCalendarAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { error } = await supabase
    .from("recruiter_google_accounts")
    .delete()
    .eq("recruiter_id", user.id);

  if (error) {
    redirect(`/dashboard/availability?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/availability");
  redirect("/dashboard/availability?google=disconnected");
}
