import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AuthResult, User } from "@bilcode/contracts";
import { api, ApiError, queryKeys } from "@/lib/api";

interface Credentials {
  email: string;
  password: string;
  name?: string;
}
interface Auth {
  user: User | null;
  loading: boolean;
  signIn: (credentials: Credentials) => Promise<User>;
  signOut: () => Promise<void>;
}
const AuthContext = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const me = useQuery({
    queryKey: queryKeys.me,
    queryFn: async () => {
      try {
        return await api.request<User>("/auth/me");
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    retry: false,
    staleTime: 60_000,
  });
  // Drop every cached query from the previous session when it ends.
  const clearData = () =>
    client.removeQueries({ predicate: (q) => q.queryKey[0] !== "me" });
  useEffect(() => {
    if (me.data === null)
      client.removeQueries({ predicate: (q) => q.queryKey[0] !== "me" });
  }, [client, me.data]);

  const signIn = async ({ email, password, name }: Credentials) => {
    const result = await api.request<AuthResult>(
      name ? "/auth/register" : "/auth/login",
      {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          ...(name ? { name } : {}),
          client: "web",
        }),
      },
    );
    clearData();
    client.setQueryData(queryKeys.me, result.user);
    return result.user;
  };
  const signOut = async () => {
    try {
      await api.request("/auth/logout", { method: "POST" });
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 401)) throw error;
    }
    clearData();
    client.setQueryData(queryKeys.me, null);
  };
  return (
    <AuthContext.Provider
      value={{
        user: me.data ?? null,
        loading: me.isPending,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("AuthProvider is missing");
  return auth;
}
