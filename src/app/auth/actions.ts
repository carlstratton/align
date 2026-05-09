"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function loginAction(formData: FormData) {
  const email = getString(formData, "email");
  const password = getString(formData, "password");
  const nextPath = getString(formData, "next");
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/auth/login?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  if (nextPath.startsWith("/")) {
    redirect(nextPath);
  }

  redirect("/dashboard");
}

export async function signupAction(formData: FormData) {
  const fullName = getString(formData, "full_name");
  const email = getString(formData, "email");
  const password = getString(formData, "password");
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    redirect(`/auth/signup?error=${encodeURIComponent(error.message)}`);
  }

  const user = data.user;

  if (user) {
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: fullName || user.user_metadata?.full_name || null,
      email: user.email ?? email,
      role: "recruiter",
    });

    if (profileError) {
      redirect(
        `/auth/signup?error=${encodeURIComponent("Account created but profile setup failed. Please log in and retry.")}`,
      );
    }
  }

  revalidatePath("/", "layout");
  if (!data.session) {
    redirect(
      "/auth/login?error=Check%20your%20email%20to%20confirm%20your%20account%2C%20then%20log%20in.",
    );
  }

  redirect("/dashboard");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/auth/login");
}
