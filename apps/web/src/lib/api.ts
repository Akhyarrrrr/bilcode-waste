import { ApiError, createApiClient } from "@bilcode/contracts";

export const API_BASE = import.meta.env.VITE_API_URL ?? "/api/v1";
export const api = createApiClient({ baseUrl: API_BASE });
export { ApiError };

export const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

export const queryKeys = {
  me: ["me"] as const,
  dashboard: ["dashboard"] as const,
  reports: (params: string) => ["reports", params] as const,
  report: (id: string) => ["report", id] as const,
  users: (params: string) => ["users", params] as const,
};
