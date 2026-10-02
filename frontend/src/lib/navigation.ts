import type { Role } from "./api";

/**
 * Only same-origin relative paths are honoured for post-login redirects (AT-13). Anything that could
 * leave the site – absolute URLs, protocol-relative "//host", backslash tricks, control chars – is dropped.
 */
export function safeNext(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (/[\\\u0000-\u001f]/.test(next)) return fallback;
  try {
    const u = new URL(next, "http://placeholder.invalid");
    if (u.origin !== "http://placeholder.invalid") return fallback;
  } catch {
    return fallback;
  }
  return next;
}

export const isStaff = (role: Role) => role !== "CITIZEN";

export function homeFor(role: Role, profileComplete: boolean): string {
  if (role === "CITIZEN") return profileComplete ? "/dashboard" : "/complete-profile";
  return "/admin/dashboard";
}
