import React, { memo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { reportCode } from "@bilcode/contracts";
import { Skeleton } from "../../components/Skeleton";
import { statusIcons } from "../../components/StatusBadge";
import { Text } from "../../components/Text";
import { activityTitle, type ActivityItem } from "../../lib/activity";
import { clock } from "../../lib/format";
import { radius, space } from "../../theme/tokens";
import { alpha, useTheme } from "../../theme/ThemeProvider";

type Position = { first: boolean; last: boolean };

/** Rows of one day share a card; position picks the rounded edges. */
function useGroupStyle({ first, last }: Position) {
  const { colors } = useTheme();
  return [
    styles.group,
    { backgroundColor: colors.surface, borderColor: colors.border },
    first && styles.first,
    last && styles.last,
  ];
}

export const ActivityRow = memo(function ActivityRow({
  item: { event, report },
  first,
  last,
}: { item: ActivityItem } & Position) {
  const theme = useTheme();
  const { colors } = theme;
  const group = useGroupStyle({ first, last });
  const { bg, fg } = theme.status[event.toStatus];
  const Icon = statusIcons[event.toStatus];
  const title = activityTitle(event);
  const code = reportCode(report.number);
  const time = clock(event.createdAt);
  // The submission event is the reporter's own action; only staff updates name who acted.
  const byStaff = event.fromStatus !== null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${code}, ${report.title}.${event.note ? ` Catatan ${event.actor.name}: ${event.note}.` : ""} Pukul ${time}.`}
      accessibilityHint="Buka detail laporan"
      onPress={() => router.push(`/report/${report.id}`)}
      android_ripple={{ color: alpha(colors.foreground, 0.08) }}
      style={({ pressed }) => [group, styles.row, pressed && styles.pressed]}
    >
      {!first && (
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
      )}
      <View style={[styles.dot, { backgroundColor: bg }]}>
        <Icon size={18} color={fg} strokeWidth={2.4} />
      </View>
      <View style={styles.body}>
        <View style={styles.top}>
          <Text variant="bodyStrong" numberOfLines={1} style={styles.flex}>
            {title}
          </Text>
          <Text variant="caption" tone="muted">
            {time}
          </Text>
        </View>
        <Text variant="label" tone="muted" numberOfLines={1}>
          {code} · {report.title}
        </Text>
        {event.note ? (
          <View style={[styles.note, { backgroundColor: colors.muted }]}>
            <Text variant="caption" tone="muted">
              {event.actor.name}
            </Text>
            <Text variant="label">{event.note}</Text>
          </View>
        ) : (
          byStaff && (
            <Text variant="caption" tone="muted">
              oleh {event.actor.name}
            </Text>
          )
        )}
      </View>
      <ChevronRight
        size={18}
        color={colors.mutedForeground}
        style={styles.chevron}
      />
    </Pressable>
  );
});

export function ActivityRowSkeleton(position: Position) {
  const group = useGroupStyle(position);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[group, styles.row]}
    >
      <Skeleton width={36} height={36} radius={18} />
      <View style={[styles.body, styles.skeletonBody]}>
        <Skeleton width="55%" height={16} />
        <Skeleton width="80%" height={12} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { borderLeftWidth: 1, borderRightWidth: 1, overflow: "hidden" },
  first: {
    borderTopWidth: 1,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
  },
  last: {
    borderBottomWidth: 1,
    borderBottomLeftRadius: radius.card,
    borderBottomRightRadius: radius.card,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.md,
    padding: space.md,
  },
  pressed: { opacity: 0.85 },
  // Inset past the icon, like a native grouped list.
  divider: {
    position: "absolute",
    top: 0,
    left: space.md + 36 + space.md,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, gap: 2 },
  skeletonBody: { gap: 8, paddingTop: 2 },
  top: { flexDirection: "row", alignItems: "center", gap: space.sm },
  flex: { flex: 1 },
  note: {
    marginTop: space.sm,
    gap: 2,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.control,
  },
  chevron: { marginTop: 9 },
});
