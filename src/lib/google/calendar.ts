import { getServerEnv } from "@/lib/env";

const GOOGLE_AUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_BASE = "https://www.googleapis.com/calendar/v3";

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
];

export type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
};

export function buildGoogleOAuthUrl(state: string) {
  const env = getServerEnv();
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_REDIRECT_URI) {
    throw new Error("Google OAuth env vars are missing.");
  }
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    scope: GOOGLE_SCOPES.join(" "),
    state,
  });
  return `${GOOGLE_AUTH_BASE}?${params.toString()}`;
}

async function postTokenRequest(params: URLSearchParams): Promise<GoogleTokenResponse> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const json = (await response.json()) as GoogleTokenResponse & { error?: string; error_description?: string };
  if (!response.ok || !json.access_token) {
    throw new Error(json.error_description ?? json.error ?? "Google token request failed.");
  }
  return json;
}

export async function exchangeCodeForTokens(code: string) {
  const env = getServerEnv();
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI) {
    throw new Error("Google OAuth env vars are missing.");
  }
  const params = new URLSearchParams({
    code,
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    grant_type: "authorization_code",
  });
  return postTokenRequest(params);
}

export async function refreshGoogleAccessToken(refreshToken: string) {
  const env = getServerEnv();
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new Error("Google OAuth env vars are missing.");
  }
  const params = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    grant_type: "refresh_token",
  });
  return postTokenRequest(params);
}

export async function getGoogleUserEmail(accessToken: string) {
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = (await response.json()) as { email?: string; error?: { message?: string } };
  if (!response.ok || !json.email) {
    throw new Error(json.error?.message ?? "Unable to fetch Google user email.");
  }
  return json.email;
}

export type CreateGoogleCalendarEventInput = {
  accessToken: string;
  summary: string;
  description: string;
  startsAtIso: string;
  endsAtIso: string;
  timezone: string;
  attendees: string[];
  requestId: string;
};

export async function createGoogleCalendarEventWithMeet(input: CreateGoogleCalendarEventInput) {
  const response = await fetch(
    `${GOOGLE_CALENDAR_BASE}/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        summary: input.summary,
        description: input.description,
        start: { dateTime: input.startsAtIso, timeZone: input.timezone },
        end: { dateTime: input.endsAtIso, timeZone: input.timezone },
        attendees: input.attendees.filter(Boolean).map((email) => ({ email })),
        conferenceData: {
          createRequest: {
            requestId: input.requestId,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      }),
    },
  );
  const json = (await response.json()) as {
    id?: string;
    htmlLink?: string;
    hangoutLink?: string;
    conferenceData?: { entryPoints?: Array<{ entryPointType?: string; uri?: string }> };
    error?: { message?: string };
  };
  if (!response.ok || !json.id) {
    throw new Error(json.error?.message ?? "Google Calendar event creation failed.");
  }
  const meetEntry = json.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === "video");
  return {
    eventId: json.id,
    htmlLink: json.htmlLink ?? null,
    meetLink: json.hangoutLink ?? meetEntry?.uri ?? null,
  };
}
