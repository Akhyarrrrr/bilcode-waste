import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import type { BottomTabBarProps } from "expo-router/tabs";
import {
  Bell,
  ClipboardList,
  House,
  Plus,
  UserRound,
  type LucideIcon,
} from "lucide-react-native";
import { haptic } from "../lib/haptics";
import { space } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";
import { Text } from "./Text";

const tabs: Record<string, { label: string; icon: LucideIcon }> = {
  index: { label: "Beranda", icon: House },
  reports: { label: "Laporan", icon: ClipboardList },
  activity: { label: "Aktivitas", icon: Bell },
  account: { label: "Akun", icon: UserRound },
};

/** Two tabs, the raised create button, two tabs: the button sits dead centre. */
export function TabBar({
  state,
  emitter,
  navigateToTab,
  insets,
}: BottomTabBarProps) {
  const { colors } = useTheme();
  const items = state.routes.map((route, index) => {
    const tab = tabs[route.name];
    if (!tab) return null;
    const focused = index === state.index;
    const color = focused ? colors.primary : colors.mutedForeground;
    const Icon = tab.icon;
    return (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        accessibilityLabel={tab.label}
        accessibilityState={{ selected: focused }}
        onPress={() => {
          const event = emitter.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused) haptic.select();
          if (!focused && !event.defaultPrevented) navigateToTab(route.key);
        }}
        style={styles.item}
      >
        <View
          style={[
            styles.indicator,
            focused && { backgroundColor: colors.primarySoft },
          ]}
        >
          <Icon size={22} color={color} strokeWidth={focused ? 2.4 : 2} />
        </View>
        <Text variant="caption" style={{ color }}>
          {tab.label}
        </Text>
      </Pressable>
    );
  });
  const create = (
    <View key="create" style={styles.item}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Buat laporan baru"
        onPress={() => {
          haptic.tap();
          router.push("/create");
        }}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: colors.primary,
            borderColor: colors.background,
          },
          pressed && styles.pressed,
        ]}
      >
        <Plus size={28} color={colors.primaryForeground} strokeWidth={2.6} />
      </Pressable>
    </View>
  );
  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bar,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          paddingBottom: Math.max(insets.bottom, space.sm),
        },
      ]}
    >
      {[...items.slice(0, 2), create, ...items.slice(2)]}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
  },
  item: { flex: 1, alignItems: "center", gap: 2, minHeight: 52 },
  indicator: {
    width: 56,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 4,
    marginTop: -26,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.96 }] },
});
