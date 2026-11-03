import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import {
  reportLabels,
  statuses,
  type Statistics,
  type Status,
} from "@bilcode/contracts";
import { Skeleton } from "../../components/Skeleton";
import { statusIcons } from "../../components/StatusBadge";
import { Text } from "../../components/Text";
import { radius, space } from "../../theme/tokens";
import { alpha, useTheme } from "../../theme/ThemeProvider";

/** One bordered panel split into four status cells; each opens the filtered list. */
export function StatusSummary({ stats }: { stats: Statistics | undefined }) {
  const theme = useTheme();
  const { colors } = theme;
  const cell = (status: Status, index: number) => {
    const { bg, fg } = theme.status[status];
    const Icon = statusIcons[status];
    const count = stats?.counts[status];
    return (
      <Pressable
        key={status}
        accessibilityRole="button"
        accessibilityLabel={
          stats
            ? `${reportLabels[status]}: ${count} laporan`
            : `${reportLabels[status]}: memuat`
        }
        accessibilityHint="Buka daftar laporan dengan status ini"
        disabled={!stats}
        onPress={() =>
          router.navigate({ pathname: "/reports", params: { status } })
        }
        android_ripple={{ color: alpha(colors.foreground, 0.08) }}
        style={({ pressed }) => [
          styles.cell,
          { borderColor: colors.border },
          index % 2 === 0 && styles.leftCell,
          index < 2 && styles.topCell,
          pressed && styles.pressed,
        ]}
      >
        <View style={[styles.icon, { backgroundColor: bg }]}>
          <Icon size={18} color={fg} strokeWidth={2.4} />
        </View>
        {stats ? (
          <Text variant="number">{count}</Text>
        ) : (
          <Skeleton width={36} height={28} style={styles.numberSkeleton} />
        )}
        <Text variant="label" tone="muted">
          {reportLabels[status]}
        </Text>
      </Pressable>
    );
  };
  return (
    <View
      style={[
        styles.panel,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      {statuses.map(cell)}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderWidth: 1,
    borderRadius: radius.card,
    overflow: "hidden",
  },
  cell: {
    width: "50%",
    padding: space.lg,
    gap: 6,
    minHeight: 112,
  },
  leftCell: { borderRightWidth: 1 },
  topCell: { borderBottomWidth: 1 },
  pressed: { opacity: 0.8 },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  numberSkeleton: { marginVertical: 3 },
});
