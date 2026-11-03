import { Link } from "react-router-dom";
import { MapPinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { useDocumentTitle } from "@/lib/use-document-title";

export default function NotFoundPage() {
  useDocumentTitle("Halaman tidak ditemukan");
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-16 items-center px-6">
        <Link to="/" aria-label="Bilcode Waste, beranda">
          <Logo />
        </Link>
      </header>
      <main className="grid flex-1 place-items-center p-6">
        <div className="max-w-sm space-y-4 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
            <MapPinOff className="size-6" aria-hidden />
          </span>
          <h1 className="text-2xl font-bold">Halaman tidak ditemukan</h1>
          <p className="text-sm text-muted-foreground">
            Alamat ini tidak ada atau sudah dipindahkan. Periksa tautannya, atau
            kembali ke halaman awal.
          </p>
          <Button asChild>
            <Link to="/">Kembali ke beranda</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
