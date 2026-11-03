import React from "react";
import { Tabs } from "expo-router";
import { TabBar } from "../../src/components/TabBar";
import { useTheme } from "../../src/theme/ThemeProvider";

export default function TabLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Beranda" }} />
      <Tabs.Screen name="reports" options={{ title: "Laporan" }} />
      <Tabs.Screen name="activity" options={{ title: "Aktivitas" }} />
      <Tabs.Screen name="account" options={{ title: "Akun" }} />
    </Tabs>
  );
}
