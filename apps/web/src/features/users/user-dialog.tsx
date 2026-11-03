import { useState, type ReactNode } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { roleLabels, type User } from "@bilcode/contracts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Field, PasswordInput } from "@/components/field";
import { FormError } from "@/components/states";
import { api, errorMessage } from "@/lib/api";

const schema = (creating: boolean) =>
  z.object({
    name: z.string().trim().min(2, "Nama minimal 2 karakter.").max(100),
    email: z.email("Masukkan alamat email yang valid."),
    password: creating
      ? z.string().min(8, "Kata sandi minimal 8 karakter.").max(128)
      : z
          .string()
          .max(128)
          .refine((v) => v === "" || v.length >= 8, "Minimal 8 karakter."),
    role: z.enum(["ADMIN", "USER"]),
    isActive: z.boolean(),
  });
type Values = z.infer<ReturnType<typeof schema>>;

/** Create a user, or edit one; email/password/role changes revoke the user's sessions server-side. */
export function UserDialog({
  user,
  trigger,
}: {
  user?: User;
  trigger: ReactNode;
}) {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  // Read from the latest `user` each time the dialog opens; mount-time defaults go stale after a save.
  const valuesFrom = (u?: User): Values => ({
    name: u?.name ?? "",
    email: u?.email ?? "",
    password: "",
    role: u?.role ?? "USER",
    isActive: u?.isActive ?? true,
  });
  const form = useForm<Values>({
    resolver: zodResolver(schema(!user)),
    defaultValues: valuesFrom(user),
  });
  const mutation = useMutation({
    mutationFn: (values: Values) => {
      const { password, ...rest } = values;
      return api.request<User>(user ? `/users/${user.id}` : "/users", {
        method: user ? "PATCH" : "POST",
        body: JSON.stringify({ ...rest, ...(password ? { password } : {}) }),
      });
    },
    onSuccess: (saved) => {
      void client.invalidateQueries({ queryKey: ["users"] });
      toast.success(
        user ? `Data ${saved.name} disimpan.` : `${saved.name} ditambahkan.`,
      );
      setOpen(false);
    },
    onError: (e) => setError(errorMessage(e, "Data pengguna belum tersimpan.")),
  });
  const { errors } = form.formState;
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (value) {
          form.reset(valuesFrom(user));
          setError("");
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form
          noValidate
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          className="space-y-4"
        >
          <DialogHeader>
            <DialogTitle>
              {user ? `Ubah ${user.name}` : "Tambah pengguna"}
            </DialogTitle>
            <DialogDescription>
              {user
                ? "Mengubah email, kata sandi, peran, atau status akan mengeluarkan pengguna ini dari semua perangkat."
                : "Pengguna baru bisa langsung masuk dengan email dan kata sandi ini."}
            </DialogDescription>
          </DialogHeader>
          <Field label="Nama" error={errors.name?.message}>
            {(props) => <Input {...props} {...form.register("name")} />}
          </Field>
          <Field label="Email" error={errors.email?.message}>
            {(props) => (
              <Input {...props} type="email" {...form.register("email")} />
            )}
          </Field>
          <Field
            label={user ? "Kata sandi baru" : "Kata sandi"}
            error={errors.password?.message}
            hint={user ? "Kosongkan jika tidak diubah." : "Minimal 8 karakter."}
          >
            {(props) => (
              <PasswordInput
                {...props}
                autoComplete="new-password"
                {...form.register("password")}
              />
            )}
          </Field>
          <div className="grid grid-cols-2 items-end gap-3">
            <Field label="Peran">
              {(props) => (
                <Controller
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id={props.id} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USER">{roleLabels.USER}</SelectItem>
                        <SelectItem value="ADMIN">
                          {roleLabels.ADMIN}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
            </Field>
            <Controller
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <div className="flex h-9 items-center gap-2">
                  <Switch
                    id="user-active"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                  <Label htmlFor="user-active">Akun aktif</Label>
                </div>
              )}
            />
          </div>
          <FormError>{error}</FormError>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending
                ? "Menyimpan…"
                : user
                  ? "Simpan"
                  : "Tambah pengguna"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
