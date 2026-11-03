import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  type InfiniteData,
} from "@tanstack/react-query";
import type { Page, Report, Statistics, Status } from "@bilcode/contracts";
import { activityFeed } from "./activity";
import { api, json } from "./api";
import { keys, queryClient, refreshReports } from "./query";

export const PAGE_SIZE = 10;

export const useDashboard = () =>
  useQuery({
    queryKey: keys.dashboard,
    queryFn: ({ signal }) => api.request<Statistics>("/dashboard", { signal }),
  });

export const useRecentReports = () =>
  useQuery({
    queryKey: keys.recent,
    queryFn: ({ signal }) =>
      api.request<Page<Report>>("/reports?page=1&pageSize=3", { signal }),
  });

// Module-level so TanStack memoises the derived feed across renders.
const toActivity = (page: Page<Report>) => activityFeed(page.items);

// shortcut: the feed reads the 100 newest reports (the API page maximum); page it if reporters outgrow that.
export const useActivity = () =>
  useQuery({
    queryKey: keys.activity,
    queryFn: ({ signal }) =>
      api.request<Page<Report>>("/reports?page=1&pageSize=100", { signal }),
    select: toActivity,
  });

export const useReportList = (status: Status | null) =>
  useInfiniteQuery({
    queryKey: keys.reportList(status),
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      api.request<Page<Report>>(
        `/reports?page=${pageParam}&pageSize=${PAGE_SIZE}${status ? `&status=${status}` : ""}`,
        { signal },
      ),
    getNextPageParam: (last) =>
      last.page < last.pages ? last.page + 1 : undefined,
  });

/** Lists already hold the full report DTO, so the detail can paint instantly. */
function cachedReport(id: string): Report | undefined {
  const entries = queryClient.getQueriesData<
    Page<Report> | InfiniteData<Page<Report>>
  >({ queryKey: keys.reports });
  for (const [, data] of entries) {
    const pages = !data ? [] : "pageParams" in data ? data.pages : [data];
    for (const page of pages) {
      const found = page.items.find((report) => report.id === id);
      if (found) return found;
    }
  }
  return undefined;
}

export const useReport = (id: string) =>
  useQuery<Report>({
    queryKey: keys.report(id),
    queryFn: ({ signal }) =>
      api.request<Report>(`/reports/${encodeURIComponent(id)}`, { signal }),
    placeholderData: () => cachedReport(id),
  });

export const useDeleteReport = () =>
  useMutation({
    mutationFn: (report: Report) =>
      api.request<void>(
        `/reports/${report.id}`,
        json("DELETE", { version: report.version }),
      ),
    onSuccess: (_, report) => {
      queryClient.removeQueries({ queryKey: keys.report(report.id) });
      return refreshReports();
    },
  });
