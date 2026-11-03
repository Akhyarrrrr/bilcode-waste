import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, PasswordInput } from "@/components/field";
import { FormError } from "@/components/states";
import { useAuth } from "@/app/auth";
import { errorMessage } from "@/lib/api";
import { demoAccounts } from "@/lib/demo";
import { useDocumentTitle } from "@/lib/use-document-title";
import { AuthLayout } from "./auth-layout";

const schema = z.object({
  email: z.email("Masukkan alamat email yang valid."),
  password: z.string().min(1, "Masukkan kata sandi."),
});
type Values = z.infer<typeof schema>;

export default function LoginPage() {
  useDocumentTitle("Masuk");
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from;
  const [error, setError] = useState("");
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });
  const submit = form.handleSubmit(async (values) => {
    setError("");
    try {
      await signIn(values);
      navigate(from ?? "/dashboard", { replace: true });
    } catch (e) {
      setError(errorMessage(e, "Belum bisa masuk. Coba lagi."));
    }
  });
  const { errors, isSubmitting } = form.formState;
  return (
    <AuthLayout
      title="Masuk ke Bilcode Waste"
      description="Pantau laporanmu atau kelola penanganan sampah di satu tempat."
      footer={
        <>
          Belum punya akun?{" "}
          <Link to="/register" className="font-semibold text-primary">
            Daftar sebagai pelapor
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Email" error={errors.email?.message}>
          {(props) => (
            <Input
              {...props}
              type="email"
              autoComplete="email"
              {...form.register("email")}
            />
          )}
        </Field>
        <Field label="Kata sandi" error={errors.password?.message}>
          {(props) => (
            <PasswordInput
              {...props}
              autoComplete="current-password"
              {...form.register("password")}
            />
          )}
        </Field>
        <FormError>{error}</FormError>
        <Button type="submit" className="h-10 w-full" disabled={isSubmitting}>
          <LogIn aria-hidden />
          {isSubmitting ? "Memeriksa…" : "Masuk"}
        </Button>
      </form>
      <div className="space-y-2 rounded-xl border border-dashed p-4">
        <p className="text-sm font-medium">Coba dengan akun demo</p>
        <p className="text-xs text-muted-foreground">
          Akun ini dipakai bersama penilai, jadi kata sandi dan perannya
          dikunci.
        </p>
        <div className="grid grid-cols-2 gap-2 pt-1">
          {demoAccounts.map((account) => (
            <Button
              key={account.email}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                form.setValue("email", account.email);
                form.setValue("password", account.password);
                void submit();
              }}
            >
              {account.label}
            </Button>
          ))}
        </div>
      </div>
    </AuthLayout>
  );
}
