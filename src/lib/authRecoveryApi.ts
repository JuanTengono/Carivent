import { apiFetch } from "./api";

export async function requestPasswordReset(email: string) {
  return apiFetch<null>("/auth/request-password-reset", {
    method: "POST",
    body: { email: email.trim() },
  });
}

export async function resetPassword(token: string, newPassword: string) {
  return apiFetch<null>("/auth/reset-password", {
    method: "POST",
    body: { token, newPassword },
  });
}

export async function verifyEmailToken(token: string) {
  return apiFetch<{ userId: number; emailVerified: boolean }>("/auth/verify-email", {
    method: "POST",
    body: { token },
  });
}

/** Same as POST verify; email links often use GET ?token= */
export async function verifyEmailTokenQuery(token: string) {
  return apiFetch<{ userId: number; emailVerified: boolean }>("/auth/verify-email", {
    query: { token },
  });
}

export async function requestEmailVerification(email: string) {
  return apiFetch<null>("/auth/request-email-verification", {
    method: "POST",
    body: { email: email.trim() },
  });
}
