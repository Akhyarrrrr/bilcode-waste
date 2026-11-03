import React, { useRef, useState } from "react";
import { StyleSheet, View, type TextInputInstance } from "react-native";
import {
  FlaskConical,
  Lock,
  LogIn,
  Mail,
  UserPlus,
  UserRound,
} from "lucide-react-native";
import { ApiError } from "@bilcode/contracts";
import { Button } from "../src/components/Button";
import { Notice } from "../src/components/ErrorState";
import { Brand } from "../src/components/Header";
import { Screen } from "../src/components/Screen";
import { Segmented } from "../src/components/Segmented";
import { Text } from "../src/components/Text";
import { TextField } from "../src/components/TextField";
import {
  validateCredentials,
  type CredentialErrors,
  type Credentials,
} from "../src/features/auth/validate";
import { message } from "../src/lib/api";
import { useSession } from "../src/session";
import { space } from "../src/theme/tokens";

const DEMO_EMAIL = "user@bilcode-waste.test";
const DEMO_PASSWORD = process.env.EXPO_PUBLIC_DEMO_PASSWORD;

export default function Auth() {
  const session = useSession();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [values, setValues] = useState<Credentials>({
    name: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<CredentialErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const emailRef = useRef<TextInputInstance>(null);
  const passwordRef = useRef<TextInputInstance>(null);
  const register = mode === "register";

  const change = (field: keyof Credentials) => (text: string) => {
    setValues((current) => ({ ...current, [field]: text }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };
  async function submit() {
    if (busy) return;
    const problems = validateCredentials(values, register);
    setErrors(problems);
    setFormError(null);
    if (Object.keys(problems).length) return;
    setBusy(true);
    try {
      await session.authenticate(register, {
        ...(register ? { name: values.name.trim() } : {}),
        email: values.email,
        password: values.password,
      });
    } catch (error) {
      if (register && error instanceof ApiError && error.code === "DUPLICATE")
        setErrors({
          email:
            "Email sudah terdaftar. Masuk dengan email ini atau gunakan email lain.",
        });
      else setFormError(message(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen edges={["top", "bottom"]} contentStyle={styles.page}>
      <Brand size={26} />
      <View style={styles.intro}>
        <Text variant="title" accessibilityRole="header">
          {register ? "Buat akun pelapor" : "Masuk ke akun Anda"}
        </Text>
        <Text tone="muted">
          {register
            ? "Laporkan sampah dari foto dan lokasi, lalu ikuti penanganannya."
            : "Lanjutkan laporan dan pantau perkembangan statusnya."}
        </Text>
      </View>
      <Segmented
        label="Pilih masuk atau daftar"
        value={mode}
        onChange={(next) => {
          setMode(next);
          setErrors({});
          setFormError(null);
        }}
        options={[
          { value: "login", label: "Masuk" },
          { value: "register", label: "Daftar" },
        ]}
      />
      <View style={styles.form}>
        {register && (
          <TextField
            label="Nama lengkap"
            icon={UserRound}
            value={values.name}
            onChangeText={change("name")}
            error={errors.name}
            maxLength={100}
            autoComplete="name"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
          />
        )}
        <TextField
          ref={emailRef}
          label="Email"
          icon={Mail}
          value={values.email}
          onChangeText={change("email")}
          error={errors.email}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          maxLength={254}
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <TextField
          ref={passwordRef}
          label="Kata sandi"
          icon={Lock}
          secure
          value={values.password}
          onChangeText={change("password")}
          error={errors.password}
          hint={register ? "Minimal 8 karakter." : undefined}
          autoCapitalize="none"
          autoComplete={register ? "new-password" : "current-password"}
          maxLength={128}
          returnKeyType="go"
          onSubmitEditing={() => void submit()}
        />
        <Notice text={formError} />
        <Button
          label={register ? "Buat akun" : "Masuk"}
          icon={register ? UserPlus : LogIn}
          busy={busy}
          onPress={() => void submit()}
        />
        {DEMO_PASSWORD && (
          <Button
            label="Gunakan akun demo"
            variant="secondary"
            icon={FlaskConical}
            disabled={busy}
            accessibilityHint="Mengisi email dan kata sandi akun demo"
            onPress={() => {
              setMode("login");
              setValues({
                name: "",
                email: DEMO_EMAIL,
                password: DEMO_PASSWORD,
              });
              setErrors({});
              setFormError(null);
            }}
          />
        )}
      </View>
      <Text variant="caption" tone="muted" style={styles.footer}>
        Proyek technical assessment untuk Bilcode Technology, bukan layanan
        resmi Bilcode.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { paddingTop: space.xl, gap: space.xl, flexGrow: 1 },
  intro: { gap: space.sm },
  form: { gap: space.lg },
  footer: { textAlign: "center", marginTop: "auto" },
});
