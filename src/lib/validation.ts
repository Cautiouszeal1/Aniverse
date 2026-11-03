export type FormState = {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function str(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export function validateEmail(email: string): string | null {
  if (!email) return "Enter your email address.";
  if (email.length > 254 || !EMAIL_RE.test(email))
    return "Enter a valid email address.";
  return null;
}

export function validateNewPassword(pw: string): string | null {
  if (pw.length < 10) return "Use at least 10 characters.";
  if (pw.length > 72) return "Use 72 characters or fewer.";
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw))
    return "Include at least one letter and one number.";
  return null;
}

/** Translate Supabase auth errors into friendly, non-leaky messages. */
export function friendlyAuthError(message: string | undefined): string {
  const m = (message ?? "").toLowerCase();
  if (m.includes("invalid login credentials"))
    return "That email and password don't match. Check them and try again.";
  if (m.includes("email not confirmed"))
    return "Please confirm your email first. Check your inbox for the link.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Too many attempts. Please wait a minute and try again.";
  if (m.includes("same") && m.includes("password"))
    return "Choose a password you haven't used here before.";
  if (m.includes("weak") || m.includes("pwned"))
    return "That password is too easy to guess. Choose a stronger one.";
  return "Something went wrong. Please try again.";
}
