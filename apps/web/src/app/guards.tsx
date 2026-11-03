import { Navigate, Outlet, useLocation } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/states";
import { useAuth } from "./auth";
import { Link } from "react-router-dom";

function Splash() {
  return (
    <div
      role="status"
      aria-label="Memuat sesi"
      className="grid min-h-svh place-items-center"
    >
      <span className="size-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
    </div>
  );
}

export function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Splash />;
  if (!user)
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  return <Outlet />;
}

export function RequireGuest() {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  return user ? <Navigate to="/dashboard" replace /> : <Outlet />;
}

export function RequireAdmin() {
  const { user } = useAuth();
  if (user?.role !== "ADMIN")
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Halaman khusus admin"
        description="Akunmu tidak memiliki akses ke halaman ini."
        action={
          <Button asChild variant="outline">
            <Link to="/dashboard">Kembali ke ringkasan</Link>
          </Button>
        }
      />
    );
  return <Outlet />;
}
