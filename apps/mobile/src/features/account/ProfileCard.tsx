import React from "react";
import { StyleSheet, View } from "react-native";
import { Lock } from "lucide-react-native";
import { roleLabels, type User } from "@bilcode/contracts";
import { Card } from "../../components/Card";
import { Notice } from "../../components/ErrorState";
import { Text } from "../../components/Text";
import { initials } from "../../lib/format";
import { radius, space } from "../../theme/tokens";
import { useTheme } from "../../theme/ThemeProvider";

export function ProfileCard({ user }: { user: User }) {
  const { colors } = useTheme();
  return (
    <Card>
      <View style={styles.row}>
        <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
          <Text variant="heading" tone="primary">
            {initials(user.name)}
          </Text>
        </View>
        <View style={styles.flex}>
          <Text variant="heading" numberOfLines={1}>
            {user.name}
          </Text>
          <Text variant="label" tone="muted" numberOfLines={1}>
            {user.email}
          </Text>
          <View style={[styles.role, { backgroundColor: colors.muted }]}>
            {user.isLocked && <Lock size={12} color={colors.mutedForeground} />}
            <Text variant="caption" tone="muted">
              {roleLabels[user.role]}
              {user.isLocked ? " · akun demo" : ""}
            </Text>
          </View>
        </View>
      </View>
      {user.isLocked && (
        <Notice
          tone="info"
          text="Akun demo dipakai bersama penilai lain, jadi ubah nama dan ganti kata sandi dikunci. Daftarkan akun baru untuk mencoba keduanya."
        />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.lg },
  flex: { flex: 1, gap: 2 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  role: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
});
