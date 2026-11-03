import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  FileText,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  Search,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { roleLabels } from "@bilcode/contracts";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuth } from "../auth";
import { CommandMenu, useCommandMenu } from "./command-menu";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  admin?: boolean;
}
const nav: NavItem[] = [
  { to: "/dashboard", label: "Ringkasan", icon: LayoutDashboard },
  { to: "/reports", label: "Laporan", icon: FileText, end: true },
  { to: "/reports/map", label: "Peta laporan", icon: Map },
  { to: "/users", label: "Pengguna", icon: Users, admin: true },
  { to: "/account", label: "Akun saya", icon: UserRound },
];

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  return (
    <nav aria-label="Navigasi utama" className="flex flex-col gap-1">
      {nav
        .filter((item) => !item.admin || user?.role === "ADMIN")
        .map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                isActive &&
                  "bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )
            }
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </NavLink>
        ))}
    </nav>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <Link
        to="/dashboard"
        onClick={onNavigate}
        className="flex h-10 items-center rounded-lg px-2"
        aria-label="Bilcode Waste, ke ringkasan"
      >
        <Logo />
      </Link>
      <SidebarNav onNavigate={onNavigate} />
      <p className="mt-auto rounded-lg bg-muted px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
        Lingkungan demo untuk technical assessment. Semua laporan berisi data
        simulasi.
      </p>
    </div>
  );
}

function UserMenu() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-10 gap-2 px-1.5 sm:pr-3"
          aria-label={`Menu akun ${user.name}`}
        >
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary-soft text-xs font-semibold text-primary">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-left leading-tight sm:block">
            <span className="block max-w-36 truncate text-sm font-semibold">
              {user.name}
            </span>
            <span className="block text-xs text-muted-foreground">
              {roleLabels[user.role]}
            </span>
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate("/account")}>
          <UserRound aria-hidden /> Akun saya
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={async () => {
            await signOut();
            navigate("/login", { replace: true });
          }}
        >
          <LogOut aria-hidden /> Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const command = useCommandMenu();
  return (
    <div className="min-h-svh bg-background">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Lewati ke konten
      </a>
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-sidebar lg:block">
        <SidebarBody />
      </aside>
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-72 bg-sidebar p-0">
          <SheetTitle className="sr-only">Navigasi</SheetTitle>
          <SheetDescription className="sr-only">
            Pindah ke halaman lain di ruang kerja.
          </SheetDescription>
          <SidebarBody onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Buka menu navigasi"
            onClick={() => setMenuOpen(true)}
          >
            <Menu aria-hidden />
          </Button>
          <Button
            variant="outline"
            className="h-9 min-w-0 flex-1 shrink justify-start gap-2 text-muted-foreground sm:max-w-72"
            onClick={() => command.setOpen(true)}
          >
            <Search aria-hidden />
            <span className="truncate">Cari laporan atau halaman</span>
            <kbd className="ml-auto hidden rounded border bg-muted px-1.5 text-[11px] font-medium sm:inline">
              Ctrl K
            </kbd>
          </Button>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto w-full max-w-7xl px-4 py-6 outline-none sm:px-6 sm:py-8"
        >
          <Outlet />
        </main>
      </div>
      <CommandMenu {...command} />
    </div>
  );
}
