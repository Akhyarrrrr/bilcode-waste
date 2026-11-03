import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { ReportPreview } from "../landing/report-preview";

export function AuthLayout({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col px-6 py-6 sm:px-10">
        <header className="flex items-center justify-between">
          <Link to="/" aria-label="Bilcode Waste, beranda">
            <Logo />
          </Link>
          <ThemeToggle />
        </header>
        <main className="flex flex-1 items-center py-10">
          <div className="mx-auto w-full max-w-sm space-y-8">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">{title}</h1>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            {children}
            <p className="text-sm text-muted-foreground">{footer}</p>
          </div>
        </main>
      </div>
      <aside
        aria-hidden
        className="relative hidden overflow-hidden border-l bg-muted/50 lg:flex lg:items-center lg:justify-center lg:p-12"
      >
        <div className="w-full max-w-xl space-y-6">
          <p className="max-w-md text-lg leading-relaxed font-medium text-muted-foreground">
            Satu foto, satu titik lokasi. Model menyarankan kategorinya, admin
            menindaklanjuti, dan kamu bisa memantau setiap perubahan statusnya.
          </p>
          <ReportPreview />
        </div>
      </aside>
    </div>
  );
}
