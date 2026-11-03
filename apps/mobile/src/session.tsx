import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import * as SecureStore from "expo-secure-store";
import { type AuthResult, type User } from "@bilcode/contracts";
import { api, json, message, setApiSession } from "./lib/api";
import { queryClient } from "./lib/query";
import { authToken, restoreSession } from "./state";

const key = "bilcode.session";
interface Session {
  user: User | null;
  loading: boolean;
  error: string | null;
  restore: () => Promise<void>;
  authenticate: (
    register: boolean,
    data: { name?: string; email: string; password: string },
  ) => Promise<void>;
  logout: () => Promise<void>;
  clear: () => Promise<void>;
  updateUser: (user: User) => void;
}
const Context = createContext<Session | null>(null);
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const clear = useCallback(async () => {
    setApiSession(null);
    queryClient.clear();
    setUser(null);
    setError(null);
    await SecureStore.deleteItemAsync(key);
  }, []);
  const install = useCallback(
    (token: string | null) =>
      setApiSession(token, () => {
        void clear().catch(() =>
          setError(
            "Sesi berakhir. Penyimpanan perangkat tidak dapat dibersihkan.",
          ),
        );
      }),
    [clear],
  );
  const restore = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await restoreSession(
        () => SecureStore.getItemAsync(key),
        async (token) => {
          install(token);
          return api.request<User>("/auth/me");
        },
      );
      install(result.token);
      setUser(result.user);
      setError(result.error);
      if (!result.token) await SecureStore.deleteItemAsync(key);
    } catch (error) {
      setError(message(error));
    } finally {
      setLoading(false);
    }
  }, [install]);
  useEffect(() => {
    void restore();
    return () => setApiSession(null);
  }, [restore]);
  async function authenticate(
    register: boolean,
    data: { name?: string; email: string; password: string },
  ) {
    const result = await api.request<AuthResult>(
      register ? "/auth/register" : "/auth/login",
      json("POST", {
        ...data,
        email: data.email.trim().toLowerCase(),
        client: "mobile",
      }),
    );
    const token = authToken(result);
    await SecureStore.setItemAsync(key, token);
    install(token);
    // Never show the previous account's cached reports.
    queryClient.clear();
    setUser(result.user);
    setError(null);
  }
  async function logout() {
    await api.request("/auth/logout", { method: "POST" });
    await clear();
  }
  return (
    <Context.Provider
      value={{
        user,
        loading,
        error,
        restore,
        authenticate,
        logout,
        clear,
        updateUser: setUser,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useSession() {
  const session = useContext(Context);
  if (!session) throw new Error("SessionProvider diperlukan.");
  return session;
}
