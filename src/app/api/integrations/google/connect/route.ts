import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { buildGoogleOAuthUrl } from "@/lib/google/calendar";
import { getServerEnv } from "@/lib/env";

export async function GET() {
  const env = getServerEnv();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.redirect(new URL("/auth/login?next=%2Fdashboard%2Favailability", env.APP_BASE_URL));
  }

  const state = `${user.id}:${crypto.randomUUID()}`;
  const cookieStore = await cookies();
  cookieStore.set("google_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  const url = buildGoogleOAuthUrl(state);
  return Response.redirect(url);
}
