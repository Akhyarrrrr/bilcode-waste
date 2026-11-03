import { createApiClient, ApiError } from "@bilcode/contracts";

export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:3001/api/v1"
).replace(/\/$/, "");
let token: string | null = null;
let expire: (() => void) | undefined;
export function setApiSession(value: string | null, onExpired?: () => void) {
  token = value;
  expire = onExpired;
}
const client = createApiClient({ baseUrl: API_URL, getToken: () => token });
export const api = {
  async request<T>(path: string, init?: RequestInit): Promise<T> {
    try {
      return await client.request<T>(path, init);
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.status === 401 &&
        !path.startsWith("/auth/login") &&
        !path.startsWith("/auth/register")
      )
        expire?.();
      throw error;
    }
  },
};
export const message = (error: unknown) =>
  error instanceof Error ? error.message : "Terjadi kesalahan. Coba kembali.";
export const json = (method: string, value: unknown): RequestInit => ({
  method,
  body: JSON.stringify(value),
});
