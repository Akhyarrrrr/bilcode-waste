import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, PasswordInput } from "@/components/field";
import { FormError } from "@/components/states";
import { useAuth } from "@/app/auth";
import { errorMessage } from "@/lib/api";
import { useDocumentTitle } from "@/lib/use-document-title";
import { AuthLayout } from "./auth-layout";

const schema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter.").max(100),
  email: z.email("Masukkan alamat email yang valid."),
  password: z
    .string()
    .min(8, "Kata sandi minimal 8 karakter.")
    .max(128, "Kata sandi maksimal 128 karakter."),
});
type Values = z.infer<typeof schema>;

export default function RegisterPage() {
  useDocumentTitle("Daftar");
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "" },
  });
  const submit = form.handleSubmit(async (values) => {
    setError("");
    try {
      await signIn(values);
      navigate("/dashboard", { replace: true });
    } catch (e) {
      setError(errorMessage(e, "Pendaftaran belum berhasil. Coba lagi."));
    }
  });
  const { errors, isSubmitting } = form.formState;
  return (
    <AuthLayout
      title="Daftar sebagai pelapor"
      description="Buat akun untuk mengirim laporan sampah dan mengikuti penanganannya."
      footer={
        <>
          Sudah punya akun?{" "}
          <Link to="/login" className="font-semibold text-primary">
            Masuk
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Nama lengkap" error={errors.name?.message}>
          {(props) => (
            <Input {...props} autoComplete="name" {...form.register("name")} />
          )}
        </Field>
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
        <Field
          label="Kata sandi"
          error={errors.password?.message}
          hint="Minimal 8 karakter."
        >
          {(props) => (
            <PasswordInput
              {...props}
              autoComplete="new-password"
              {...form.register("password")}
            />
          )}
        </Field>
        <FormError>{error}</FormError>
        <Button type="submit" className="h-10 w-full" disabled={isSubmitting}>
          <UserPlus aria-hidden />
          {isSubmitting ? "Membuat akun…" : "Buat akun"}
        </Button>
      </form>
    </AuthLayout>
  );
}
