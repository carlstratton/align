import { Resend } from "resend";
import { getServerEnv } from "@/lib/env";

type EmailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendEmail(payload: EmailPayload) {
  const env = getServerEnv();

  if (!env.RESEND_API_KEY) {
    return {
      sent: false,
      reason: "RESEND_API_KEY missing; skipped sending email.",
    };
  }

  const resend = new Resend(env.RESEND_API_KEY);
  const from = env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

  const { error } = await resend.emails.send({
    from,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  });

  if (error) {
    return {
      sent: false,
      reason: error.message,
    };
  }

  return {
    sent: true,
    reason: null,
  };
}
