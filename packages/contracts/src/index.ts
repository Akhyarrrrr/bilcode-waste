export const categories = ["ORGANIC", "PLASTIC", "PAPER"] as const;
export type Category = (typeof categories)[number];
export const statuses = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "REJECTED",
] as const;
export type Status = (typeof statuses)[number];
export type Role = "ADMIN" | "USER";
export const categoryLabels: Record<Category, string> = {
  ORGANIC: "Organik",
  PLASTIC: "Plastik",
  PAPER: "Kertas",
};
export const reportLabels: Record<Status, string> = {
  PENDING: "Menunggu",
  IN_PROGRESS: "Diproses",
  COMPLETED: "Selesai",
  REJECTED: "Ditolak",
};
export const transitions: Record<Status, readonly Status[]> = {
  PENDING: ["IN_PROGRESS", "REJECTED"],
  IN_PROGRESS: ["COMPLETED", "REJECTED"],
  COMPLETED: [],
  REJECTED: [],
};
export const canTransition = (from: Status, to: Status) =>
  transitions[from].includes(to);
export const roleLabels: Record<Role, string> = {
  ADMIN: "Administrator",
  USER: "Pelapor",
};
export const reportCode = (number: number) =>
  `BW-${String(number).padStart(5, "0")}`;
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  /** Shared demo accounts cannot change credentials, role or status. */
  isLocked: boolean;
  createdAt: string;
}
export interface Upload {
  id: string;
  url: string;
}
export interface Prediction {
  id: string;
  uploadId: string;
  category: Category;
  confidence: number;
  scores: Record<Category, number>;
  modelVersion: string;
  durationMs: number;
}
export interface StatusEvent {
  id: string;
  fromStatus: Status | null;
  toStatus: Status;
  note: string | null;
  createdAt: string;
  actor: { id: string; name: string };
}
export interface Report {
  id: string;
  number: number;
  title: string;
  description: string;
  category: Category;
  status: Status;
  latitude: number;
  longitude: number;
  locationLabel: string;
  locationAccuracy: number | null;
  version: number;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  reporter: { id: string; name: string };
  photo: Upload;
  prediction: Prediction | null;
  history: StatusEvent[];
}
export interface ReportInput {
  title: string;
  description: string;
  category: Category;
  latitude: number;
  longitude: number;
  locationLabel: string;
  locationAccuracy?: number | null;
  uploadId: string;
  predictionId?: string | null;
  clientRequestId: string;
}
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}
export interface Statistics {
  total: number;
  counts: Record<Status, number>;
  categories: Record<Category, number>;
  /** Last 30 WIB days, oldest first. */
  trend: { date: string; count: number }[];
  /** Reports whose final category equals the model's suggestion. */
  aiAgreement: { matched: number; total: number };
  /** Mean hours from submission to COMPLETED; null when none completed. */
  avgResolutionHours: number | null;
}
export interface AuthResult {
  user: User;
  token?: string;
}
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
export function createApiClient(options: {
  baseUrl: string;
  getToken?: () => string | null;
  fetch?: typeof globalThis.fetch;
}) {
  const transport = options.fetch ?? globalThis.fetch;
  return {
    async request<T>(path: string, init: RequestInit = {}): Promise<T> {
      const headers = new Headers(init.headers);
      const token = options.getToken?.();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      if (typeof init.body === "string")
        headers.set("Content-Type", "application/json");
      let response: Response;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 90000);
      const cancel = () => controller.abort(init.signal?.reason);
      if (init.signal?.aborted) cancel();
      else init.signal?.addEventListener("abort", cancel, { once: true });
      try {
        response = await transport(`${options.baseUrl}${path}`, {
          ...init,
          headers,
          credentials: "include",
          signal: controller.signal,
        });
      } catch {
        throw new ApiError(
          0,
          "NETWORK",
          controller.signal.aborted && !init.signal?.aborted
            ? "Permintaan terlalu lama. Coba kembali."
            : "Tidak dapat menghubungi server. Periksa koneksi lalu coba kembali.",
        );
      } finally {
        clearTimeout(timeout);
        init.signal?.removeEventListener("abort", cancel);
      }
      if (response.status === 204) return undefined as T;
      const body = await response.json().catch(() => null);
      if (!response.ok)
        throw new ApiError(
          response.status,
          body?.error?.code ?? "REQUEST_FAILED",
          body?.error?.message ?? `Permintaan gagal (${response.status}).`,
        );
      return body as T;
    },
  };
}
