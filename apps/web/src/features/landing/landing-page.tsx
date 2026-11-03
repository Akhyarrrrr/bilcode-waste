import { Link } from "react-router-dom";
import {
  ArrowRightLeft,
  Camera,
  Download,
  FileSpreadsheet,
  LayoutDashboard,
  MapPinned,
  Smartphone,
  Users,
} from "lucide-react";
import { categories, categoryLabels } from "@bilcode/contracts";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { categoryStyle } from "@/components/report-badges";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/app/auth";
import { useDocumentTitle } from "@/lib/use-document-title";
import { cn } from "@/lib/utils";
import { ModelSection } from "./model-section";
import { ReportPreview } from "./report-preview";

const REPO = "https://github.com/Akhyarrrrr/bilcode-waste";
const API_DOCS = "https://bilcode-waste-api.vercel.app/docs";

const flow = [
  {
    icon: Camera,
    title: "Foto sampahnya",
    body: "Ambil foto dari ponsel atau unggah dari galeri. Model menyarankan kategorinya dalam hitungan detik.",
  },
  {
    icon: MapPinned,
    title: "Tandai lokasinya",
    body: "GPS mengisi titik secara otomatis. Tambahkan nama tempat atau patokan agar petugas mudah menemukannya.",
  },
  {
    icon: ArrowRightLeft,
    title: "Ikuti penanganannya",
    body: "Setiap perubahan status tercatat dengan waktu dan catatan admin, dari diterima sampai selesai.",
  },
];

const examples = {
  ORGANIC: "Sisa makanan, daun, ranting, dan sisa sayur pasar.",
  PLASTIC: "Botol, kemasan makanan ringan, kantong, dan styrofoam.",
  PAPER: "Koran, brosur, kertas bekas, dan pembungkus kertas.",
} as const;

const adminTools = [
  {
    icon: LayoutDashboard,
    text: "Ringkasan status, tren 30 hari, dan sebaran lokasi",
  },
  {
    icon: ArrowRightLeft,
    text: "Alur status yang dijaga: tidak bisa melompati tahap",
  },
  {
    icon: FileSpreadsheet,
    text: "Export CSV sesuai filter untuk laporan rutin",
  },
  {
    icon: Users,
    text: "Kelola akun admin dan pelapor, termasuk menonaktifkan akses",
  },
];

export default function LandingPage() {
  useDocumentTitle();
  const { user } = useAuth();
  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-6">
          <Link to="/" aria-label="Bilcode Waste, beranda">
            <Logo />
          </Link>
          <nav
            aria-label="Bagian halaman"
            className="hidden gap-6 text-sm font-medium text-muted-foreground md:flex"
          >
            <a href="#cara-kerja" className="hover:text-foreground">
              Cara kerja
            </a>
            <a href="#kategori" className="hover:text-foreground">
              Kategori
            </a>
            <a href="#model" className="hover:text-foreground">
              Model AI
            </a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <Button asChild size="sm">
                <Link to="/dashboard">Buka ruang kerja</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/login">Masuk</Link>
                </Button>
                <Button asChild size="sm" className="hidden sm:inline-flex">
                  <Link to="/register">Daftar</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pt-16 pb-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:pt-24">
          <div className="space-y-7">
            <h1 className="max-w-xl text-5xl leading-[1.04] font-bold tracking-[-0.035em] sm:text-6xl">
              Foto sampahnya, pantau sampai bersih.
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
              Bilcode Waste mengubah satu foto dan titik lokasi menjadi laporan
              yang bisa ditindaklanjuti. Model AI menyarankan kategorinya, admin
              mencatat setiap tahap penanganan, dan pelapor bisa melihat
              semuanya.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to={user ? "/reports/new" : "/register"}>
                  <Camera aria-hidden /> Buat laporan
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/login">Coba akun demo</Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <a href={`${REPO}/releases/latest`}>
                  <Smartphone aria-hidden /> Aplikasi Android
                </a>
              </Button>
            </div>
          </div>
          <ReportPreview />
        </section>

        <section
          id="cara-kerja"
          aria-labelledby="flow-title"
          className="mx-auto max-w-6xl px-6 pb-20"
        >
          <h2 id="flow-title" className="mb-10 text-3xl font-bold sm:text-4xl">
            Dari foto sampai area bersih
          </h2>
          <ol className="grid gap-10 md:grid-cols-3">
            {flow.map(({ icon: Icon, title, body }, index) => (
              <li key={title} className="space-y-3 border-t pt-6">
                <span className="flex items-center gap-3">
                  <span className="tabular text-sm font-semibold text-muted-foreground">
                    {index + 1}
                  </span>
                  <Icon className="size-5 text-primary" aria-hidden />
                </span>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="text-muted-foreground">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section
          id="kategori"
          aria-labelledby="category-title"
          className="mx-auto max-w-6xl px-6 pb-20"
        >
          <div className="mb-10 max-w-2xl space-y-3">
            <h2 id="category-title" className="text-3xl font-bold sm:text-4xl">
              Warnanya sama dengan tempat sampah terpilah
            </h2>
            <p className="text-muted-foreground">
              Hijau untuk organik, kuning untuk plastik, biru untuk kertas.
              Warna yang sama dipakai di seluruh aplikasi, selalu bersama
              labelnya.
            </p>
          </div>
          <ul className="grid gap-4 md:grid-cols-3">
            {categories.map((c) => {
              const { icon: Icon, swatch, text } = categoryStyle[c];
              return (
                <li
                  key={c}
                  className="overflow-hidden rounded-xl border bg-card"
                >
                  <span className={cn("block h-1.5", swatch)} aria-hidden />
                  <div className="space-y-2 p-5">
                    <p className="flex items-center gap-2 text-lg font-semibold">
                      <Icon className={cn("size-5", text)} aria-hidden />
                      {categoryLabels[c]}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {examples[c]}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <ModelSection />

        <section
          aria-labelledby="admin-title"
          className="mx-auto grid max-w-6xl gap-10 px-6 py-20 lg:grid-cols-2"
        >
          <div className="space-y-3">
            <h2 id="admin-title" className="text-3xl font-bold sm:text-4xl">
              Untuk tim yang menangani laporan
            </h2>
            <p className="max-w-prose text-muted-foreground">
              Admin melihat semua laporan, menindaklanjuti sesuai urutan status,
              dan menyimpan catatan yang terlihat oleh pelapor.
            </p>
          </div>
          <ul className="space-y-4">
            {adminTools.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="pt-1.5">{text}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="flex flex-col items-start gap-6 rounded-2xl bg-primary px-8 py-10 text-primary-foreground md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Coba alurnya sekarang</h2>
              <p className="max-w-xl opacity-90">
                Masuk dengan akun demo admin atau pelapor. Semua data di sini
                adalah simulasi untuk penilaian.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" variant="secondary">
                <Link to="/login">Masuk ke demo</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                <a href={`${REPO}/releases/latest`}>
                  <Download aria-hidden /> Unduh APK
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            Technical assessment Fullstack Developer untuk Bilcode Technology,
            dibuat oleh Akhyar. Bukan layanan resmi Bilcode.
          </p>
          <div className="flex gap-4">
            <a href={REPO} className="hover:text-foreground">
              Kode sumber
            </a>
            <a href={API_DOCS} className="hover:text-foreground">
              Dokumentasi API
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
