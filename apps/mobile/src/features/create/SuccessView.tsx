import React from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";
import { router } from "expo-router";
import { Check, FileText, House } from "lucide-react-native";
import { reportCode, type Report } from "@bilcode/contracts";
import { Button } from "../../components/Button";
import { StatusBadge } from "../../components/StatusBadge";
import { Text } from "../../components/Text";
import { space } from "../../theme/tokens";
import { alpha, useTheme } from "../../theme/ThemeProvider";

/** Layout animations skip themselves when the system asks for reduced motion. */
export function SuccessView({ report }: { report: Report }) {
  const { colors } = useTheme();
  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={[styles.flex, { backgroundColor: colors.background }]}
    >
      <View style={styles.center}>
        <Animated.View
          entering={ZoomIn.springify().damping(14)}
          style={[
            styles.halo,
            { backgroundColor: alpha(colors.primary, 0.14) },
          ]}
        >
          <View style={[styles.check, { backgroundColor: colors.primary }]}>
            <Check size={44} color={colors.primaryForeground} strokeWidth={3} />
          </View>
        </Animated.View>
        <Animated.View entering={FadeIn.delay(200)} style={styles.copy}>
          <Text
            variant="title"
            accessibilityRole="header"
            accessibilityLiveRegion="polite"
            style={styles.text}
          >
            Laporan terkirim
          </Text>
          <Text tone="muted" style={styles.text}>
            {reportCode(report.number)} sudah kami terima. Petugas akan
            meninjaunya, dan setiap perubahan status tercatat di riwayat
            laporan.
          </Text>
          <StatusBadge status={report.status} />
        </Animated.View>
      </View>
      <View style={styles.actions}>
        <Button
          label="Lihat laporan"
          icon={FileText}
          onPress={() => router.replace(`/report/${report.id}`)}
        />
        <Button
          label="Ke beranda"
          variant="secondary"
          icon={House}
          onPress={() => router.dismissTo("/")}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: space.xl,
    gap: space.xl,
  },
  halo: {
    width: 136,
    height: 136,
    borderRadius: 68,
    alignItems: "center",
    justifyContent: "center",
  },
  check: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { alignItems: "center", gap: space.md, maxWidth: 420 },
  text: { textAlign: "center" },
  actions: { padding: space.lg, gap: space.md },
});
