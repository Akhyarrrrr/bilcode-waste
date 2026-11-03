import React, { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Camera, Inbox } from "lucide-react-native";
import { reportLabels, statuses, type Status } from "@bilcode/contracts";
import { Chip } from "../../src/components/Chip";
import { EmptyState } from "../../src/components/EmptyState";
import { ErrorState } from "../../src/components/ErrorState";
import { Header } from "../../src/components/Header";
import {
  ReportCard,
  ReportCardSkeleton,
} from "../../src/components/ReportCard";
import { statusIcons } from "../../src/components/StatusBadge";
import {
  keys,
  queryClient,
  usePullRefresh,
  useRefreshOnFocus,
} from "../../src/lib/query";
import { useReportList } from "../../src/lib/reports";
import { space } from "../../src/theme/tokens";
import { useTheme } from "../../src/theme/ThemeProvider";

const isStatus = (value: unknown): value is Status =>
  statuses.includes(value as Status);

export default function Reports() {
  const { colors } = useTheme();
  // The filter lives in the route so Beranda's summary cells can deep-link into it.
  const params = useLocalSearchParams<{ status?: string }>();
  const status = isStatus(params.status) ? params.status : null;
  const list = useReportList(status);
  useRefreshOnFocus([keys.reportList(status)]);
  const pull = usePullRefresh(
    useCallback(
      () => queryClient.refetchQueries({ queryKey: keys.reportList(status) }),
      [status],
    ),
  );
  const items = list.data?.pages.flatMap((page) => page.items) ?? [];
  const total = list.data?.pages[0]?.total;

  const filters = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="radiogroup"
      accessibilityLabel="Saring status laporan"
      contentContainerStyle={styles.filters}
      style={styles.filterBar}
    >
      {([null, ...statuses] as const).map((value) => (
        <Chip
          key={value ?? "ALL"}
          label={value ? reportLabels[value] : "Semua"}
          icon={value ? statusIcons[value] : undefined}
          selected={status === value}
          onPress={() => router.setParams({ status: value ?? "" })}
        />
      ))}
    </ScrollView>
  );

  const empty = list.isPending ? (
    <View style={styles.gap}>
      {[0, 1, 2, 3].map((key) => (
        <ReportCardSkeleton key={key} />
      ))}
    </View>
  ) : list.isError ? (
    <ErrorState error={list.error} onRetry={() => void list.refetch()} />
  ) : (
    <EmptyState
      icon={Inbox}
      title={
        status
          ? `Belum ada laporan ${reportLabels[status].toLowerCase()}`
          : "Belum ada laporan"
      }
      body={
        status
          ? "Laporan dengan status ini akan muncul di sini. Pilih Semua untuk melihat laporan lain."
          : "Laporan yang Anda kirim akan muncul di sini beserta statusnya."
      }
      action={
        status
          ? undefined
          : {
              label: "Buat laporan",
              icon: Camera,
              onPress: () => router.push("/create"),
            }
      }
    />
  );

  return (
    <SafeAreaView
      edges={["top"]}
      style={[styles.flex, { backgroundColor: colors.background }]}
    >
      <View style={styles.head}>
        <Header
          title="Laporan"
          subtitle={
            total === undefined ? "Riwayat laporan Anda" : `${total} laporan`
          }
        />
      </View>
      {filters}
      <FlatList
        data={items}
        keyExtractor={(report) => report.id}
        renderItem={({ item }) => <ReportCard report={item} />}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={empty}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (list.hasNextPage && !list.isFetchingNextPage)
            void list.fetchNextPage();
        }}
        ListFooterComponent={
          list.isFetchingNextPage ? (
            <ActivityIndicator color={colors.primary} style={styles.more} />
          ) : undefined
        }
        refreshControl={
          <RefreshControl
            refreshing={pull.refreshing}
            onRefresh={pull.onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { paddingHorizontal: space.lg },
  filterBar: { flexGrow: 0 },
  filters: {
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  content: {
    padding: space.lg,
    paddingTop: space.xs,
    paddingBottom: space.xxl,
    flexGrow: 1,
  },
  separator: { height: space.md },
  gap: { gap: space.md },
  more: { marginVertical: space.lg },
});
