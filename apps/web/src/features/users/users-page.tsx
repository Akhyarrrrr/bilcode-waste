import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Lock, Pencil, Search, UserPlus, Users } from "lucide-react";
import {
  roleLabels,
  type Page,
  type Role,
  type User,
} from "@bilcode/contracts";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { EmptyState, ErrorState } from "@/components/states";
import { useAuth } from "@/app/auth";
import { api, queryKeys } from "@/lib/api";
import { initials, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useDocumentTitle } from "@/lib/use-document-title";
import { UserDialog } from "./user-dialog";

const ALL = "all";

function AccountState({ user }: { user: User }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span
        className={cn(
          "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold",
          user.isActive
            ? "bg-status-done-bg text-status-done"
            : "bg-muted text-muted-foreground",
        )}
      >
        <span
          className={cn(
            "size-1.5 rounded-full",
            user.isActive ? "bg-status-done" : "bg-muted-foreground",
          )}
          aria-hidden
        />
        {user.isActive ? "Aktif" : "Nonaktif"}
      </span>
      {user.isLocked && (
        <span
          className="inline-flex h-6 items-center gap-1 rounded-full border px-2 text-xs font-medium text-muted-foreground"
          title="Akun demo bersama: kata sandi, peran, dan status dikunci."
        >
          <Lock className="size-3" aria-hidden /> Akun demo
        </span>
      )}
    </span>
  );
}

export default function UsersPage() {
  useDocumentTitle("Pengguna");
  const { user: me } = useAuth();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const role = params.get("role") as Role | null;
  const active = params.get("active");
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [search, setSearch] = useState(q);
  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries({ page: null, ...patch }))
      if (value) next.set(key, value);
      else next.delete(key);
    setParams(next, { replace: true });
  };
  useEffect(() => {
    if (search.trim() === q) return;
    const timer = setTimeout(() => set({ q: search.trim() || null }), 350);
    return () => clearTimeout(timer);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps
  const query = new URLSearchParams({ page: String(page), pageSize: "15" });
  if (q) query.set("q", q);
  if (role) query.set("role", role);
  if (active) query.set("active", active);
  const users = useQuery({
    queryKey: queryKeys.users(query.toString()),
    queryFn: () => api.request<Page<User>>(`/users?${query}`),
    placeholderData: keepPreviousData,
  });
  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengguna"
        description="Kelola akun admin dan pelapor. Akun nonaktif tidak bisa masuk."
        actions={
          <UserDialog
            trigger={
              <Button>
                <UserPlus aria-hidden /> Tambah pengguna
              </Button>
            }
          />
        }
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1 sm:max-w-sm">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau email"
            aria-label="Cari pengguna"
            className="pl-9"
          />
        </div>
        <Select
          value={role ?? ALL}
          onValueChange={(v) => set({ role: v === ALL ? null : v })}
        >
          <SelectTrigger className="w-full sm:w-40" aria-label="Filter peran">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Semua peran</SelectItem>
            <SelectItem value="ADMIN">{roleLabels.ADMIN}</SelectItem>
            <SelectItem value="USER">{roleLabels.USER}</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={active ?? ALL}
          onValueChange={(v) => set({ active: v === ALL ? null : v })}
        >
          <SelectTrigger
            className="w-full sm:w-40"
            aria-label="Filter status akun"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Semua status</SelectItem>
            <SelectItem value="true">Aktif</SelectItem>
            <SelectItem value="false">Nonaktif</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <section className="overflow-hidden rounded-xl border bg-card">
        {users.isPending ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : users.error ? (
          <ErrorState error={users.error} onRetry={() => users.refetch()} />
        ) : users.data.items.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Tidak ada pengguna yang cocok"
            description="Ubah kata kunci atau filter pencarian."
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5">Pengguna</TableHead>
                  <TableHead className="hidden sm:table-cell">Peran</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Terdaftar
                  </TableHead>
                  <TableHead className="w-12 pr-5">
                    <span className="sr-only">Aksi</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.data.items.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="pl-5">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9">
                          <AvatarFallback className="bg-muted text-xs font-semibold">
                            {initials(u.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-semibold">
                            {u.name}
                            {u.id === me?.id && (
                              <span className="font-normal text-muted-foreground">
                                {" "}
                                (kamu)
                              </span>
                            )}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {u.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {roleLabels[u.role]}
                    </TableCell>
                    <TableCell>
                      <AccountState user={u} />
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {shortDate(u.createdAt)}
                    </TableCell>
                    <TableCell className="pr-5">
                      {u.isLocked ? (
                        <span className="sr-only">Akun demo terkunci</span>
                      ) : (
                        <UserDialog
                          key={u.id}
                          user={u}
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Ubah pengguna ${u.name}`}
                            >
                              <Pencil aria-hidden />
                            </Button>
                          }
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination
              page={users.data.page}
              pages={users.data.pages}
              total={users.data.total}
              noun="pengguna"
              onPage={(next) => set({ page: next > 1 ? String(next) : null })}
            />
          </>
        )}
      </section>
    </div>
  );
}
