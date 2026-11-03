import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { ArrowRight, Camera } from "lucide-react-native";
import { Text } from "../../components/Text";
import { haptic } from "../../lib/haptics";
import { radius, space } from "../../theme/tokens";
import { alpha, useTheme } from "../../theme/ThemeProvider";

/** The one primary action on Beranda. */
export function ReportCta() {
  const { colors } = useTheme();
  const fg = colors.primaryForeground;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Laporkan sampah"
      accessibilityHint="Mulai laporan baru dengan foto dan lokasi"
      onPress={() => {
        haptic.tap();
        router.push("/create");
      }}
      android_ripple={{ color: alpha(fg, 0.16) }}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.primary },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.icon, { backgroundColor: alpha(fg, 0.16) }]}>
        <Camera size={26} color={fg} strokeWidth={2} />
      </View>
      <View style={styles.body}>
        <Text variant="heading" tone="inverse">
          Laporkan sampah
        </Text>
        <Text variant="label" tone="inverse" style={styles.sub}>
          Foto, cek saran kategori AI, lalu kirim dengan lokasi GPS.
        </Text>
      </View>
      <ArrowRight size={22} color={fg} strokeWidth={2.2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.card,
    overflow: "hidden",
  },
  pressed: { opacity: 0.9 },
  icon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, gap: 2 },
  sub: { opacity: 0.9 },
});
