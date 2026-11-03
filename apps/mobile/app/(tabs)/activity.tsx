import React, { useCallback, useMemo } from "react";
import { RefreshControl, SectionList, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { BellRing, Camera } from "lucide-react-native";
import { EmptyState } from "../../src/components/EmptyState";
import { ErrorState } from "../../src/components/ErrorState";
import { Header } from "../../src/components/Header";
import { Text } from "../../src/components/Text";
import {
  ActivityRow,
  ActivityRowSkeleton,
} from "../../src/features/activity/ActivityRow";
import { groupByDay } from "../../src/lib/activity";
import {
  keys,
  queryClient,
  usePullRefresh,
  useRefreshOnFocus,
} from "../../src/lib/query";
import { useActivity } from "../../src/lib/reports";
import { space } from "../../src/theme/tokens";
import { useTheme } from "../../src/theme/ThemeProvider";

export default function Activity() {
  const { colors } = useTheme();
  const activity = useActivity();
  useRefreshOnFocus([keys.activity]);
  const pull = usePullRefresh(
    useCallback(
      () => queryClient.refetchQueries({ queryKey: keys.activity }),
      [],
    ),
  );
  const sections = useMemo(
    () => groupByDay(activity.data ?? []),
    [activity.data],
  );

  const empty = activity.isPending ? (
    <View>
      {[0, 1, 2, 3].map((key) => (
        <ActivityRowSkeleton key={key} first={key === 0} last={key === 3} />
      ))}
    </View>
  ) : activity.isError ? (
    <ErrorState
      error={activity.error}
      onRetry={() => void activity.refetch()}
    />
  ) : (
    <EmptyState
      icon={BellRing}
      title="Belum ada aktivitas"
      body="Setiap kali laporan Anda dikirim atau diproses petugas, pembaruannya muncul di sini."
      action={{
        label: "Buat laporan",
        icon: Camera,
        onPress: () => router.push("/create"),
      }}
    />
  );

  return (
    <SafeAreaView
      edges={["top"]}
      style={[styles.flex, { backgroundColor: colors.background }]}
    >
      <View style={styles.head}>
        <Header title="Aktivitas" subtitle="Pembaruan status laporan Anda" />
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.event.id}
        renderItem={({ item, index, section }) => (
          <ActivityRow
            item={item}
            first={index === 0}
            last={index === section.data.length - 1}
          />
        )}
        renderSectionHeader={({ section }) => (
          <Text
            variant="caption"
            tone="muted"
            accessibilityRole="header"
            style={[styles.day, { backgroundColor: colors.background }]}
          >
            {section.title.toUpperCase()}
          </Text>
        )}
        stickySectionHeadersEnabled
        contentContainerStyle={styles.content}
        ListEmptyComponent={empty}
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
  head: { paddingHorizontal: space.lg, paddingBottom: space.xs },
  content: {
    paddingHorizontal: space.lg,
    paddingBottom: space.xxl,
    flexGrow: 1,
  },
  day: {
    paddingTop: space.lg,
    paddingBottom: space.sm,
    letterSpacing: 0.6,
  },
});
