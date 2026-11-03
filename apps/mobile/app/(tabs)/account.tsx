import React, { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import Constants from "expo-constants";
import { router } from "expo-router";
import {
  BookOpen,
  Info,
  LogOut,
  Moon,
  Smartphone,
  Sun,
} from "lucide-react-native";
import { Button } from "../../src/components/Button";
import { Notice } from "../../src/components/ErrorState";
import { Header, SectionHeader } from "../../src/components/Header";
import { Screen } from "../../src/components/Screen";
import { Segmented } from "../../src/components/Segmented";
import { Text } from "../../src/components/Text";
import { ProfileCard } from "../../src/features/account/ProfileCard";
import {
  NameForm,
  PasswordForm,
} from "../../src/features/account/ProfileForms";
import { SettingsRow } from "../../src/features/account/SettingsRow";
import { message } from "../../src/lib/api";
import { useSession } from "../../src/session";
import { radius, space } from "../../src/theme/tokens";
import { useTheme, type Preference } from "../../src/theme/ThemeProvider";

export default function Account() {
  const session = useSession();
  const theme = useTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const user = session.user;
  if (!user) return null;

  const logout = () =>
    Alert.alert(
      "Keluar dari akun?",
      "Anda perlu masuk kembali untuk melihat laporan.",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Keluar",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            setError(null);
            try {
              await session.logout();
            } catch (error) {
              setError(message(error));
              setBusy(false);
            }
          },
        },
      ],
    );

  return (
    <Screen>
      <Header title="Akun" />
      <ProfileCard user={user} />
      {!user.isLocked && (
        <>
          <NameForm user={user} />
          <PasswordForm user={user} />
        </>
      )}

      <SectionHeader title="Tampilan" />
      <Segmented<Preference>
        label="Tema aplikasi"
        value={theme.preference}
        onChange={theme.setPreference}
        options={[
          { value: "system", label: "Sistem", icon: Smartphone },
          { value: "light", label: "Terang", icon: Sun },
          { value: "dark", label: "Gelap", icon: Moon },
        ]}
      />

      <SectionHeader title="Lainnya" />
      <View
        style={[
          styles.group,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <SettingsRow
          icon={BookOpen}
          label="Lihat panduan"
          onPress={() => router.push("/guide")}
        />
        <View
          style={[styles.divider, { backgroundColor: theme.colors.border }]}
        />
        <SettingsRow
          icon={Info}
          label="Versi aplikasi"
          value={Constants.expoConfig?.version ?? "–"}
        />
      </View>

      <Notice text={error} />
      <Button
        label="Keluar"
        variant="destructive"
        icon={LogOut}
        busy={busy}
        onPress={logout}
      />
      <Text variant="caption" tone="muted" style={styles.footer}>
        Bilcode Waste adalah proyek technical assessment, bukan layanan resmi
        Bilcode.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { borderWidth: 1, borderRadius: radius.card, overflow: "hidden" },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: space.lg + 20 + space.md,
  },
  footer: { textAlign: "center" },
});
