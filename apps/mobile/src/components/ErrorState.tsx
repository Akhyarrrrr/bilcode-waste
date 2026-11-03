import React from "react";
import { StyleSheet, View } from "react-native";
import {
  CircleAlert,
  CircleCheck,
  Info,
  RefreshCw,
  TriangleAlert,
  WifiOff,
} from "lucide-react-native";
import { ApiError } from "@bilcode/contracts";
import { message } from "../lib/api";
import { radius, space } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";
import { Button } from "./Button";
import { Text } from "./Text";

type NoticeTone = "error" | "warning" | "info" | "success";

/** Inline message banner; errors are announced to screen readers. */
export function Notice({
  tone = "error",
  text,
  children,
}: {
  tone?: NoticeTone;
  text: string | null | undefined;
  children?: React.ReactNode;
}) {
  const theme = useTheme();
  if (!text) return null;
  const { bg, fg } = {
    error: { bg: theme.colors.destructiveSoft, fg: theme.colors.destructive },
    warning: theme.status.PENDING,
    info: theme.status.IN_PROGRESS,
    success: theme.status.COMPLETED,
  }[tone];
  const Icon = {
    error: CircleAlert,
    warning: TriangleAlert,
    info: Info,
    success: CircleCheck,
  }[tone];
  return (
    <View
      accessibilityRole={tone === "error" ? "alert" : undefined}
      accessibilityLiveRegion="polite"
      style={[styles.notice, { backgroundColor: bg }]}
    >
      <Icon size={18} color={fg} strokeWidth={2.2} style={styles.icon} />
      <View style={styles.body}>
        <Text variant="label" style={{ color: fg }}>
          {text}
        </Text>
        {children}
      </View>
    </View>
  );
}

/** Failed load with the server's reason and a retry action. */
export function ErrorState({
  error,
  onRetry,
  title = "Data belum dapat dimuat",
}: {
  error: unknown;
  onRetry: () => void;
  title?: string;
}) {
  const { colors } = useTheme();
  const offline = error instanceof ApiError && error.status === 0;
  const Icon = offline ? WifiOff : TriangleAlert;
  return (
    <View style={[styles.state, { borderColor: colors.border }]}>
      <Icon size={28} color={colors.mutedForeground} strokeWidth={1.8} />
      <Text variant="bodyStrong" style={styles.center}>
        {offline ? "Tidak ada koneksi" : title}
      </Text>
      <Text tone="muted" style={styles.center}>
        {message(error)}
      </Text>
      <Button
        label="Coba lagi"
        variant="secondary"
        icon={RefreshCw}
        onPress={onRetry}
        style={styles.retry}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: "row",
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.control,
  },
  icon: { marginTop: 1 },
  body: { flex: 1, gap: space.sm },
  state: {
    alignItems: "center",
    gap: space.sm,
    padding: space.xl,
    borderWidth: 1,
    borderRadius: radius.card,
  },
  center: { textAlign: "center" },
  retry: { marginTop: space.sm, alignSelf: "stretch" },
});
