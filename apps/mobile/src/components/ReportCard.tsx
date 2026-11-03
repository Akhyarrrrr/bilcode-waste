import React, { memo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { MapPin } from "lucide-react-native";
import {
  categoryLabels,
  reportCode,
  reportLabels,
  type Report,
} from "@bilcode/contracts";
import { relativeTime } from "../lib/format";
import { radius, space } from "../theme/tokens";
import { alpha, useTheme } from "../theme/ThemeProvider";
import { CategoryBadge } from "./CategoryBadge";
import { Skeleton } from "./Skeleton";
import { StatusBadge } from "./StatusBadge";
import { Text } from "./Text";

export const ReportCard = memo(function ReportCard({
  report,
}: {
  report: Report;
}) {
  const { colors } = useTheme();
  const when = relativeTime(report.createdAt);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${report.title}. Status: ${reportLabels[report.status]}. Kategori: ${categoryLabels[report.category]}. ${report.locationLabel}. ${when}.`}
      accessibilityHint="Buka detail laporan"
      onPress={() => router.push(`/report/${report.id}`)}
      android_ripple={{ color: alpha(colors.foreground, 0.08) }}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && styles.pressed,
      ]}
    >
      <Image
        source={{ uri: report.photo.url }}
        recyclingKey={report.id}
        transition={200}
        contentFit="cover"
        style={[styles.thumb, { backgroundColor: colors.muted }]}
      />
      <View style={styles.body}>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {reportCode(report.number)} · {when}
        </Text>
        <Text variant="bodyStrong" numberOfLines={2}>
          {report.title}
        </Text>
        <View style={styles.place}>
          <MapPin size={14} color={colors.mutedForeground} />
          <Text
            variant="caption"
            tone="muted"
            numberOfLines={1}
            style={styles.flex}
          >
            {report.locationLabel}
          </Text>
        </View>
        <View style={styles.badges}>
          <StatusBadge status={report.status} />
          <CategoryBadge category={report.category} />
        </View>
      </View>
    </Pressable>
  );
});

/** Mirrors ReportCard's layout so first paint does not jump. */
export function ReportCardSkeleton() {
  const { colors } = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Skeleton width={88} height={88} radius={radius.photo} />
      <View style={[styles.body, styles.skeletonBody]}>
        <Skeleton width="40%" height={12} />
        <Skeleton width="85%" height={16} />
        <Skeleton width="60%" height={12} />
        <View style={styles.badges}>
          <Skeleton width={78} height={22} radius={11} />
          <Skeleton width={70} height={22} radius={11} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: space.md,
    padding: space.md,
    borderWidth: 1,
    borderRadius: radius.card,
    overflow: "hidden",
  },
  pressed: { opacity: 0.85 },
  thumb: { width: 88, height: 88, borderRadius: radius.photo },
  body: { flex: 1, gap: 3 },
  skeletonBody: { gap: 8, paddingTop: 2 },
  place: { flexDirection: "row", alignItems: "center", gap: 4 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  flex: { flex: 1 },
});
