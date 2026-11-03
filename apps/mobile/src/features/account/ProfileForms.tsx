import React, { useState } from "react";
import { KeyRound, Lock, Save, UserRound } from "lucide-react-native";
import type { User } from "@bilcode/contracts";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Notice } from "../../components/ErrorState";
import { Text } from "../../components/Text";
import { TextField } from "../../components/TextField";
import { api, json, message } from "../../lib/api";
import { haptic } from "../../lib/haptics";
import { useSession } from "../../session";

const patchMe = (body: object) =>
  api.request<User>("/auth/me", json("PATCH", body));

export function NameForm({ user }: { user: User }) {
  const session = useSession();
  const [name, setName] = useState(user.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const unchanged = name.trim() === user.name;
  async function save() {
    if (name.trim().length < 2) return setError("Nama minimal 2 karakter.");
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      session.updateUser(await patchMe({ name: name.trim() }));
      haptic.success();
      setSaved(true);
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <Text variant="heading" accessibilityRole="header">
        Profil
      </Text>
      <TextField
        label="Nama lengkap"
        icon={UserRound}
        value={name}
        editable={!user.isLocked}
        onChangeText={(text) => {
          setName(text);
          setError(null);
          setSaved(false);
        }}
        error={error}
        maxLength={100}
        autoComplete="name"
      />
      <Notice
        tone="success"
        text={saved ? "Nama berhasil diperbarui." : null}
      />
      <Button
        label="Simpan nama"
        icon={Save}
        variant="secondary"
        busy={busy}
        disabled={user.isLocked || unchanged}
        onPress={() => void save()}
      />
    </Card>
  );
}

export function PasswordForm({ user }: { user: User }) {
  const session = useSession();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{
    current?: string;
    next?: string;
    form?: string;
  }>({});
  async function save() {
    const problems = {
      current: current ? undefined : "Isi kata sandi saat ini.",
      next:
        next.length >= 8 ? undefined : "Kata sandi baru minimal 8 karakter.",
    };
    setErrors(problems);
    if (problems.current || problems.next) return;
    setBusy(true);
    try {
      await patchMe({ currentPassword: current, password: next });
      haptic.success();
      // The server revokes every session after a password change.
      await session.clear();
    } catch (error) {
      setErrors({ form: message(error) });
      setBusy(false);
    }
  }
  return (
    <Card>
      <Text variant="heading" accessibilityRole="header">
        Kata sandi
      </Text>
      <Text variant="label" tone="muted">
        Setelah diganti, Anda akan keluar dari semua perangkat dan perlu masuk
        kembali.
      </Text>
      <TextField
        label="Kata sandi saat ini"
        icon={Lock}
        secure
        value={current}
        editable={!user.isLocked}
        onChangeText={setCurrent}
        error={errors.current}
        autoCapitalize="none"
        autoComplete="current-password"
        maxLength={128}
      />
      <TextField
        label="Kata sandi baru"
        icon={KeyRound}
        secure
        value={next}
        editable={!user.isLocked}
        onChangeText={setNext}
        error={errors.next}
        hint="Minimal 8 karakter."
        autoCapitalize="none"
        autoComplete="new-password"
        maxLength={128}
      />
      <Notice text={errors.form} />
      <Button
        label="Perbarui kata sandi"
        icon={KeyRound}
        variant="secondary"
        busy={busy}
        disabled={user.isLocked}
        onPress={() => void save()}
      />
    </Card>
  );
}
