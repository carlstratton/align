import { cookies } from "next/headers";
import { hasPublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

function isInvalidSessionMessage(message: string) {
  return message.includes("Refresh Token Not Found") || message.includes("Invalid Refresh Token");
}

async function clearSupabaseAuthCookies() {
  try {
    const cookieStore = await cookies();
    for (const cookie of cookieStore.getAll()) {
      if (cookie.name.startsWith("sb-")) {
        cookieStore.delete(cookie.name);
      }
    }
  } catch {
    // Cookie mutations are not allowed during some Server Component renders.
  }
}

export async function getOptionalAuthUser() {
  if (!hasPublicEnv()) {
    return null;
  }

  try {
    const supabase = await createClient();
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      if (isInvalidSessionMessage(error.message)) {
        await clearSupabaseAuthCookies();
      }
      return null;
    }

    return session?.user ?? null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isInvalidSessionMessage(message)) {
      await clearSupabaseAuthCookies();
    }
    return null;
  }
}
