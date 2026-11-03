import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import {
  QueryClient,
  focusManager,
  type QueryKey,
} from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { ApiError, type Status } from "@bilcode/contracts";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Client errors (401/403/404) will not fix themselves on retry.
      retry: (count, error) =>
        count < 2 &&
        !(
          error instanceof ApiError &&
          error.status >= 400 &&
          error.status < 500
        ),
    },
  },
});

// TanStack listens to window focus by default; React Native exposes AppState instead.
focusManager.setEventListener((handleFocus) => {
  const subscription = AppState.addEventListener("change", (state) =>
    handleFocus(state === "active"),
  );
  return () => subscription.remove();
});

export const keys = {
  dashboard: ["dashboard"] as const,
  reports: ["reports"] as const,
  recent: ["reports", "recent"] as const,
  reportList: (status: Status | null) =>
    ["reports", "list", status ?? "ALL"] as const,
  report: (id: string) => ["report", id] as const,
};

export const refreshReports = () =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: keys.reports }),
    queryClient.invalidateQueries({ queryKey: keys.dashboard }),
  ]);

/** Refetch stale queries when a mounted tab regains focus, keeping data on screen. */
export function useRefreshOnFocus(queryKeys: QueryKey[]) {
  const first = useRef(true);
  // Latest keys via ref so a key change (e.g. a filter) is not mistaken for a focus.
  const latest = useRef(queryKeys);
  useEffect(() => {
    latest.current = queryKeys;
  });
  useFocusEffect(
    useCallback(() => {
      if (first.current) {
        first.current = false;
        return;
      }
      for (const queryKey of latest.current)
        void queryClient.refetchQueries(
          { queryKey, stale: true },
          { cancelRefetch: false },
        );
    }, []),
  );
}

/** Pull-to-refresh spinner that only reflects user-initiated refreshes. */
export function usePullRefresh(refresh: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void refresh()
      .catch(() => undefined)
      .finally(() => setRefreshing(false));
  }, [refresh]);
  return { refreshing, onRefresh };
}
