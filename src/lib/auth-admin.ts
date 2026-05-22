export const ADMIN_EMAIL = "cgstratton+align@gmail.com";

export function isAdminEmail(email: string | null | undefined): boolean {
  return email === ADMIN_EMAIL;
}
