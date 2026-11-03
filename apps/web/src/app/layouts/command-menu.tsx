import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  LayoutDashboard,
  Map,
  Monitor,
  Moon,
  Plus,
  Sun,
  UserRound,
  Users,
} from "lucide-react";
import { useTheme } from "@/app/theme";
import { reportCode, type Page, type Report } from "@bilcode/contracts";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { StatusBadge } from "@/components/report-badges";
import { api, queryKeys } from "@/lib/api";
import { useAuth } from "../auth";

export function useCommandMenu() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return { open, setOpen };
}

function useDebounced(value: string, ms = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

export function CommandMenu({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setTheme } = useTheme();
  const [search, setSearch] = useState("");
  const q = useDebounced(search.trim());
  const params = new URLSearchParams({ q, pageSize: "6" }).toString();
  const results = useQuery({
    queryKey: queryKeys.reports(params),
    queryFn: () => api.request<Page<Report>>(`/reports?${params}`),
    enabled: open && q.length >= 2,
    placeholderData: (previous) => previous,
  });
  const go = (to: string) => {
    setOpen(false);
    setSearch("");
    navigate(to);
  };
  const pages = [
    { to: "/dashboard", label: "Ringkasan", icon: LayoutDashboard },
    { to: "/reports", label: "Semua laporan", icon: FileText },
    { to: "/reports/map", label: "Peta laporan", icon: Map },
    { to: "/reports/new", label: "Buat laporan baru", icon: Plus },
    ...(user?.role === "ADMIN"
      ? [{ to: "/users", label: "Kelola pengguna", icon: Users }]
      : []),
    { to: "/account", label: "Akun saya", icon: UserRound },
  ];
  const reports = q.length >= 2 ? (results.data?.items ?? []) : [];
  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Cari"
      description="Cari laporan berdasarkan judul atau nomor, atau buka halaman."
    >
      <CommandInput
        placeholder="Cari judul, nomor laporan, atau halaman…"
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>
          {results.isFetching ? "Mencari…" : "Tidak ada yang cocok."}
        </CommandEmpty>
        {reports.length > 0 && (
          <CommandGroup heading="Laporan">
            {reports.map((r) => (
              <CommandItem
                key={r.id}
                value={`${reportCode(r.number)} ${r.number} ${r.title} ${r.locationLabel}`}
                onSelect={() => go(`/reports/${r.id}`)}
              >
                <FileText aria-hidden />
                <span className="min-w-0 flex-1 truncate">{r.title}</span>
                <StatusBadge status={r.status} />
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        <CommandGroup heading="Halaman">
          {pages.map(({ to, label, icon: Icon }) => (
            <CommandItem key={to} value={label} onSelect={() => go(to)}>
              <Icon aria-hidden /> {label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Tema">
          {[
            { value: "light", label: "Tema terang", icon: Sun },
            { value: "dark", label: "Tema gelap", icon: Moon },
            { value: "system", label: "Tema ikuti sistem", icon: Monitor },
          ].map(({ value, label, icon: Icon }) => (
            <CommandItem
              key={value}
              value={label}
              onSelect={() => {
                setTheme(value);
                setOpen(false);
              }}
            >
              <Icon aria-hidden /> {label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
