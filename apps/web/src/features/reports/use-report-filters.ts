import { useSearchParams } from "react-router-dom";
import {
  categories,
  statuses,
  type Category,
  type Status,
} from "@bilcode/contracts";

export interface ReportFilters {
  q: string;
  status?: Status;
  category?: Category;
  from: string;
  to: string;
  page: number;
}

const pick = <T extends string>(values: readonly T[], value: string | null) =>
  values.includes(value as T) ? (value as T) : undefined;

/** Filters live in the URL so a filtered list can be shared and survives reloads. */
export function useReportFilters() {
  const [params, setParams] = useSearchParams();
  const filters: ReportFilters = {
    q: params.get("q") ?? "",
    status: pick(statuses, params.get("status")),
    category: pick(categories, params.get("category")),
    from: params.get("from") ?? "",
    to: params.get("to") ?? "",
    page: Math.max(1, Number(params.get("page")) || 1),
  };
  const update = (patch: Partial<ReportFilters>) => {
    const next = { ...filters, page: 1, ...patch };
    const query = new URLSearchParams();
    if (next.q.trim()) query.set("q", next.q.trim());
    if (next.status) query.set("status", next.status);
    if (next.category) query.set("category", next.category);
    if (next.from) query.set("from", next.from);
    if (next.to) query.set("to", next.to);
    if (next.page > 1) query.set("page", String(next.page));
    setParams(query, { replace: true });
  };
  const active = !!(
    filters.q ||
    filters.status ||
    filters.category ||
    filters.from ||
    filters.to
  );
  return { filters, update, active };
}

/** Query string for the API; `withStatus=false` gives per-status totals for the tabs. */
export function filterQuery(
  filters: ReportFilters,
  {
    withStatus = true,
    pageSize,
  }: { withStatus?: boolean; pageSize?: number } = {},
) {
  const query = new URLSearchParams();
  if (filters.q.trim()) query.set("q", filters.q.trim());
  if (withStatus && filters.status) query.set("status", filters.status);
  if (filters.category) query.set("category", filters.category);
  if (filters.from) query.set("from", filters.from);
  if (filters.to) query.set("to", filters.to);
  if (pageSize) {
    query.set("page", String(filters.page));
    query.set("pageSize", String(pageSize));
  }
  return query.toString();
}
