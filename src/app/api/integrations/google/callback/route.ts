import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  exchangeCodeForTokens,
  getGoogleUserEmail,
} from "@/lib/google/calendar";
import { encryptSecret } from "@/lib/security/encryption";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerEnv } from "@/lib/env";

function redirectToAvailability(error?: string) {
  const env = getServerEnv();
  const url = new URL("/dashboard/availability", env.APP_BASE_URL);
  if (error) {
    url.searchParams.set("error", error);
  } else {
    url.searchParams.set("google", "connected");
  }
  return Response.redirect(url);
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirectToAvailability("Please login before connecting Google Calendar.");
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("google_oauth_state")?.value;
  cookieStore.delete("google_oauth_state");

  if (!code || !state || !expectedState || state !== expectedState) {
    return redirectToAvailability("Invalid Google OAuth state.");
  }

  const stateUserId = state.split(":")[0];
  if (stateUserId !== user.id) {
    return redirectToAvailability("Google OAuth state did not match current user.");
  }

  try {
    const token = await exchangeCodeForTokens(code);
    if (!token.refresh_token) {
      return redirectToAvailability(
        "Google did not return a refresh token. Disconnect app in Google and retry with consent.",
      );
    }
    const googleEmail = await getGoogleUserEmail(token.access_token);
    const expiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString();

    const admin = createAdminClient();
    const { error } = await admin.from("recruiter_google_accounts").upsert(
      {
        recruiter_id: user.id,
        google_email: googleEmail,
        encrypted_refresh_token: encryptSecret(token.refresh_token),
        scopes: token.scope ?? null,
        access_token_expires_at: expiresAt,
      },
      { onConflict: "recruiter_id" },
    );
    if (error) {
      return redirectToAvailability(error.message);
    }

    return redirectToAvailability();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to connect Google Calendar.";
    return redirectToAvailability(message);
  }
}
