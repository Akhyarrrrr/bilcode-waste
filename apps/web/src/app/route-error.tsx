import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Shown when a page throws or its code chunk fails to load (e.g. after a redeploy). */
export function RouteError() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : "Terjadi kesalahan yang tidak terduga.";
  return (
    <div role="alert" className="grid min-h-[60svh] place-items-center p-6">
      <div className="max-w-md space-y-4 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-status-rejected-bg text-status-rejected">
          <TriangleAlert className="size-6" aria-hidden />
        </span>
        <h1 className="text-xl font-bold">Halaman gagal ditampilkan</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        <div className="flex justify-center gap-2">
          <Button onClick={() => window.location.reload()}>Muat ulang</Button>
          <Button asChild variant="outline">
            <Link to="/dashboard">Ke ringkasan</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
