// All browser → backend calls go through here (SRS §12). Same-origin /api/* is proxied by Next.js.

export interface ApiErrorBody {
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
  retryAfterSeconds?: number;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors?: Record<string, string>;
  readonly retryAfterSeconds?: number;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.status = status;
    this.code = body.code;
    this.fieldErrors = body.fieldErrors;
    this.retryAfterSeconds = body.retryAfterSeconds;
  }
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, { credentials: "same-origin", ...init });
  } catch {
    throw new ApiError(0, { code: "NETWORK", message: "Network problem. Check your connection and try again." });
  }
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }
  if (!res.ok) {
    const body = (data ?? {}) as Partial<ApiErrorBody>;
    throw new ApiError(res.status, {
      code: body.code ?? "INTERNAL_ERROR",
      message: body.message ?? "Something went wrong. Please try again.",
      fieldErrors: body.fieldErrors,
      retryAfterSeconds: body.retryAfterSeconds,
    });
  }
  return data as T;
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: body === undefined ? undefined : JSON.stringify(body),
});

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) => request<T>(path, json("POST", body)),
  put: <T>(path: string, body?: unknown) => request<T>(path, json("PUT", body)),
  /** multipart: `data` is sent as an application/json part, files under their field names. */
  multipart: <T>(path: string, data: unknown, files: Record<string, Blob[]> = {}, method = "POST") => {
    const form = new FormData();
    form.append("data", new Blob([JSON.stringify(data)], { type: "application/json" }));
    for (const [field, list] of Object.entries(files)) {
      list.forEach((blob, i) => form.append(field, blob, (blob as File).name ?? `${field}-${i}.jpg`));
    }
    return request<T>(path, { method, body: form });
  },
  upload: <T>(path: string, field: string, file: File) => {
    const form = new FormData();
    form.append(field, file);
    return request<T>(path, { method: "POST", body: form });
  },
};

// ---- shared types ---------------------------------------------------------------------------

export type Role = "CITIZEN" | "OFFICER" | "ADMIN" | "SUPER_ADMIN";

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: Role;
  profileComplete: boolean;
  status: string;
  phone?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  wardNumber?: number | null;
  assignedWardNumber?: number | null;
}

export interface OtpSent { message: string; resendAfterSeconds: number; expiresInSeconds: number }
export interface PublicConfig { wardCount: number; otpLength: number; otpResendSeconds: number; otpTtlSeconds: number }
export interface Page<T> { items: T[]; page: number; size: number; total: number }
export interface Category { id: number; code: string; nameEn: string; nameMr: string; nameHi: string; slaHours: number; active: boolean }
export interface CategoryRef { code: string; name: string }

export type ComplaintStatus =
  | "SUBMITTED" | "ANALYZED" | "PLANNED" | "APPROVED" | "SCHEDULED" | "IN_PROGRESS"
  | "RESOLVED" | "CLOSED" | "REOPENED" | "MERGED" | "REJECTED";

export interface ComplaintSummary {
  id: number; status: ComplaintStatus; category: CategoryRef | null; description: string;
  address: string | null; meTooCount: number; createdAt: string;
}
export interface HistoryEntry { from: ComplaintStatus | null; to: ComplaintStatus; actorType: string; note: string | null; at: string }
export interface ComplaintImage { id: number; kind: "BEFORE" | "AFTER" | "REOPEN"; url: string }
export interface ComplaintDetail extends ComplaintSummary {
  lat: number; lng: number; outOfWard: boolean; updatedAt: string;
  images: ComplaintImage[]; history: HistoryEntry[]; canConfirm: boolean; reopenUntil: string | null;
}
export interface NearbyComplaint {
  id: number; description: string; address: string | null; status: ComplaintStatus; categoryCode: string | null;
  meTooCount: number; distanceM: number; createdAt: string; alreadyMeToo: boolean;
}
export interface StaffSummary {
  id: number; status: ComplaintStatus; category: CategoryRef | null; description: string; address: string | null;
  wardNumber: number | null; priorityScore: number | null; meTooCount: number; outOfWard: boolean; createdAt: string;
}
export interface StaffDetail {
  summary: StaffSummary; citizen: { name: string; maskedPhone: string | null } | null;
  lat: number; lng: number; images: ComplaintImage[]; history: HistoryEntry[];
}
