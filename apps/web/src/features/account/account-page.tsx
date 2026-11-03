import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/app/theme";
import { toast } from "sonner";
import { z } from "zod";
import { Lock } from "lucide-react";
import { roleLabels, type User } from "@bilcode/contracts";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Field, PasswordInput } from "@/components/field";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { FormError } from "@/components/states";
import { themeOptions } from "@/components/theme-toggle";
import { useAuth } from "@/app/auth";
import { api, errorMessage, queryKeys } from "@/lib/api";
import { initials, shortDate } from "@/lib/format";
import { useDocumentTitle } from "@/lib/use-document-title";

const profileSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter.").max(100),
});
const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Masukkan kata sandi saat ini."),
  password: z.string().min(8, "Kata sandi baru minimal 8 karakter.").max(128),
});

function ProfileForm({ user }: { user: User }) {
  const client = useQueryClient();
  const [error, setError] = useState("");
  const form = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user.name },
  });
  const submit = form.handleSubmit(async (values) => {
    setError("");
    try {
      const updated = await api.request<User>("/auth/me", {
        method: "PATCH",
        body: JSON.stringify(values),
      });
      client.setQueryData(queryKeys.me, updated);
      form.reset({ name: updated.name });
      toast.success("Nama tersimpan.");
    } catch (e) {
      setError(errorMessage(e, "Nama belum tersimpan."));
    }
  });
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Field label="Nama" error={form.formState.errors.name?.message}>
        {(props) => (
          <Input
            {...props}
            disabled={user.isLocked}
            {...form.register("name")}
          />
        )}
      </Field>
      <Field label="Email" hint="Email hanya dapat diubah oleh admin.">
        {(props) => <Input {...props} value={user.email} readOnly disabled />}
      </Field>
      <FormError>{error}</FormError>
      <Button
        type="submit"
        disabled={
          user.isLocked ||
          !form.formState.isDirty ||
          form.formState.isSubmitting
        }
      >
        Simpan nama
      </Button>
    </form>
  );
}

function PasswordForm({ user }: { user: User }) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const form = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", password: "" },
  });
  const submit = form.handleSubmit(async (values) => {
    setError("");
    try {
      await api.request<User>("/auth/me", {
        method: "PATCH",
        body: JSON.stringify(values),
      });
      // The API revokes every session after a password change.
      client.setQueryData(queryKeys.me, null);
      toast.success("Kata sandi diganti. Silakan masuk kembali.");
      navigate("/login", { replace: true });
    } catch (e) {
      setError(errorMessage(e, "Kata sandi belum diganti."));
    }
  });
  const { errors } = form.formState;
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Field
        label="Kata sandi saat ini"
        error={errors.currentPassword?.message}
      >
        {(props) => (
          <PasswordInput
            {...props}
            disabled={user.isLocked}
            autoComplete="current-password"
            {...form.register("currentPassword")}
          />
        )}
      </Field>
      <Field
        label="Kata sandi baru"
        error={errors.password?.message}
        hint="Minimal 8 karakter. Semua perangkat akan dikeluarkan."
      >
        {(props) => (
          <PasswordInput
            {...props}
            disabled={user.isLocked}
            autoComplete="new-password"
            {...form.register("password")}
          />
        )}
      </Field>
      <FormError>{error}</FormError>
      <Button
        type="submit"
        disabled={user.isLocked || form.formState.isSubmitting}
      >
        Ganti kata sandi
      </Button>
    </form>
  );
}

export default function AccountPage() {
  useDocumentTitle("Akun saya");
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  if (!user) return null;
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Akun saya"
        description="Profil, keamanan, dan tampilan."
      />
      <div className="flex items-center gap-4 rounded-xl border bg-card p-5">
        <Avatar className="size-14">
          <AvatarFallback className="bg-primary-soft text-lg font-semibold text-primary">
            {initials(user.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{user.name}</p>
          <p className="truncate text-sm text-muted-foreground">
            {roleLabels[user.role]}, terdaftar sejak {shortDate(user.createdAt)}
          </p>
        </div>
      </div>
      {user.isLocked && (
        <p className="flex items-start gap-3 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
          Ini akun demo yang dipakai bersama penilai, jadi nama dan kata
          sandinya dikunci. Daftarkan akun baru untuk mencoba fitur ini.
        </p>
      )}
      <Panel title="Profil">
        <ProfileForm user={user} />
      </Panel>
      <Panel title="Kata sandi">
        <PasswordForm user={user} />
      </Panel>
      <Panel title="Tampilan" description="Tema berlaku untuk perangkat ini.">
        <RadioGroup
          value={theme}
          onValueChange={setTheme}
          className="grid gap-2 sm:grid-cols-3"
        >
          {themeOptions.map(({ value, label, icon: Icon }) => (
            <Label
              key={value}
              htmlFor={`theme-${value}`}
              className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 font-medium has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary-soft/40"
            >
              <RadioGroupItem id={`theme-${value}`} value={value} />
              <Icon className="size-4 text-muted-foreground" aria-hidden />
              {label}
            </Label>
          ))}
        </RadioGroup>
      </Panel>
    </div>
  );
}
