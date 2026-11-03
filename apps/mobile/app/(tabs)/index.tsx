import React, { useCallback } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Camera, Inbox } from "lucide-react-native";
import { EmptyState } from "../../src/components/EmptyState";
import { ErrorState } from "../../src/components/ErrorState";
import { Header, SectionHeader } from "../../src/components/Header";
import {
  ReportCard,
  ReportCardSkeleton,
} from "../../src/components/ReportCard";
import { Screen } from "../../src/components/Screen";
import { Text } from "../../src/components/Text";
import { ReportCta } from "../../src/features/home/ReportCta";
import { StatusSummary } from "../../src/features/home/StatusSummary";
import { firstName, initials, today } from "../../src/lib/format";
import {
  keys,
  queryClient,
  usePullRefresh,
  useRefreshOnFocus,
} from "../../src/lib/query";
import { useDashboard, useRecentReports } from "../../src/lib/reports";
import { useSession } from "../../src/session";
import { space } from "../../src/theme/tokens";
import { useTheme } from "../../src/theme/ThemeProvider";

export default function Home() {
  const { user } = useSession();
  const { colors } = useTheme();
  const stats = useDashboard();
  const recent = useRecentReports();
  useRefreshOnFocus([keys.dashboard, keys.recent]);
  const pull = usePullRefresh(
    useCallback(
      () =>
        Promise.all([
          queryClient.refetchQueries({ queryKey: keys.dashboard }),
          queryClient.refetchQueries({ queryKey: keys.recent }),
        ]),
      [],
    ),
  );
  const name = user?.name ?? "";

  return (
    <Screen refreshing={pull.refreshing} onRefresh={pull.onRefresh}>
      <Header
        subtitle={today()}
        title={`Halo, ${firstName(name)}`}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Buka akun"
            onPress={() => router.navigate("/account")}
            style={[styles.avatar, { backgroundColor: colors.primarySoft }]}
          >
            <Text variant="bodyStrong" tone="primary">
              {initials(name)}
            </Text>
          </Pressable>
        }
      />
      <ReportCta />

      <SectionHeader title="Ringkasan laporan Anda" />
      {stats.isError && !stats.data ? (
        <ErrorState error={stats.error} onRetry={() => void stats.refetch()} />
      ) : (
        <StatusSummary stats={stats.data} />
      )}

      <SectionHeader
        title="Laporan terbaru"
        action={
          recent.data?.items.length
            ? {
                label: "Lihat semua",
                onPress: () => router.navigate("/reports"),
              }
            : undefined
        }
      />
      <View style={styles.list}>
        {recent.isPending &&
          [0, 1, 2].map((key) => <ReportCardSkeleton key={key} />)}
        {recent.isError && !recent.data && (
          <ErrorState
            error={recent.error}
            onRetry={() => void recent.refetch()}
          />
        )}
        {recent.data?.items.map((report) => (
          <ReportCard key={report.id} report={report} />
        ))}
        {recent.data?.items.length === 0 && (
          <EmptyState
            icon={Inbox}
            title="Belum ada laporan"
            body="Temukan tumpukan sampah? Foto dan kirim laporan pertama Anda."
            action={{
              label: "Buat laporan",
              icon: Camera,
              onPress: () => router.push("/create"),
            }}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { gap: space.md },
});
