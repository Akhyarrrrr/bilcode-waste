import React, { useCallback } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { FlaskConical, Trash2 } from "lucide-react-native";
import { reportCode, type Report } from "@bilcode/contracts";
import { Button } from "../../src/components/Button";
import { Card } from "../../src/components/Card";
import { CategoryBadge } from "../../src/components/CategoryBadge";
import { ErrorState, Notice } from "../../src/components/ErrorState";
import { SectionHeader } from "../../src/components/Header";
import { Screen } from "../../src/components/Screen";
import { Skeleton } from "../../src/components/Skeleton";
import { StatusBadge } from "../../src/components/StatusBadge";
import { Text } from "../../src/components/Text";
import { Timeline } from "../../src/components/Timeline";
import { AiPanel } from "../../src/features/report/AiPanel";
import { LocationPanel } from "../../src/features/report/LocationPanel";
import { message } from "../../src/lib/api";
import { dateTime } from "../../src/lib/format";
import { haptic } from "../../src/lib/haptics";
import { usePullRefresh } from "../../src/lib/query";
import { useDeleteReport, useReport } from "../../src/lib/reports";
import { useSession } from "../../src/session";
import { radius, space } from "../../src/theme/tokens";
import { useTheme } from "../../src/theme/ThemeProvider";

export default function Detail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useReport(id);
  const remove = useDeleteReport();
  const { user } = useSession();
  const { colors } = useTheme();
  const pull = usePullRefresh(useCallback(() => query.refetch(), [query]));
  const report = query.data;

  const confirmDelete = (target: Report) =>
    Alert.alert(
      "Hapus laporan?",
      "Laporan yang masih menunggu ini akan dihapus dari riwayat Anda.",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: () =>
            remove.mutate(target, {
              onSuccess: () => {
                haptic.success();
                if (router.canGoBack()) router.back();
                else router.replace("/reports");
              },
              onError: () => void query.refetch(),
            }),
        },
      ],
    );

  if (!report)
    return (
      <Screen edges={["bottom"]}>
        {query.isError ? (
          <ErrorState
            error={query.error}
            title="Laporan belum dapat dimuat"
            onRetry={() => void query.refetch()}
          />
        ) : (
          <View style={styles.skeleton} accessibilityLabel="Memuat laporan">
            <Skeleton height={240} radius={radius.photo} />
            <Skeleton width="70%" height={26} />
            <Skeleton width="40%" height={14} />
            <Skeleton height={120} radius={radius.card} />
          </View>
        )}
      </Screen>
    );

  const owner = report.reporter.id === user?.id;
  return (
    <Screen
      edges={["bottom"]}
      refreshing={pull.refreshing}
      onRefresh={pull.onRefresh}
    >
      <Image
        source={{ uri: report.photo.url }}
        transition={200}
        contentFit="cover"
        accessibilityLabel={`Foto laporan ${report.title}`}
        style={[styles.hero, { backgroundColor: colors.muted }]}
      />
      <View style={styles.titleBlock}>
        <Text variant="caption" tone="muted">
          {reportCode(report.number)} · {dateTime(report.createdAt)}
        </Text>
        <Text variant="title" accessibilityRole="header">
          {report.title}
        </Text>
        <View style={styles.badges}>
          <StatusBadge status={report.status} />
          <CategoryBadge category={report.category} />
          {report.isDemo && (
            <View style={[styles.demo, { backgroundColor: colors.muted }]}>
              <FlaskConical size={12} color={colors.mutedForeground} />
              <Text variant="caption" tone="muted">
                Data demo
              </Text>
            </View>
          )}
        </View>
      </View>
      <Text>{report.description}</Text>

      <SectionHeader title="Analisis AI" />
      <AiPanel report={report} />

      <SectionHeader title="Lokasi" />
      <LocationPanel report={report} />

      <SectionHeader title="Riwayat status" />
      <Card>
        {report.history.length ? (
          <Timeline events={report.history} />
        ) : (
          <Text tone="muted">Belum ada perubahan status.</Text>
        )}
      </Card>
      <Text variant="caption" tone="muted">
        Dilaporkan oleh {owner ? "Anda" : report.reporter.name}
      </Text>

      {owner && report.status === "PENDING" && (
        <View style={styles.danger}>
          <Notice text={remove.isError ? message(remove.error) : null} />
          <Button
            label="Hapus laporan"
            variant="destructive"
            icon={Trash2}
            busy={remove.isPending}
            onPress={() => confirmDelete(report)}
          />
          <Text variant="caption" tone="muted">
            Laporan hanya dapat dihapus selama statusnya Menunggu.
          </Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  skeleton: { gap: space.lg },
  hero: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: radius.photo,
  },
  titleBlock: { gap: space.sm },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  demo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  danger: { gap: space.sm, marginTop: space.sm },
});
