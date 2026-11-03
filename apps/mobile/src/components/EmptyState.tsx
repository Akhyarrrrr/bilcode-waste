import React from "react";
import { StyleSheet, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { space } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";
import { Button } from "./Button";
import { Text } from "./Text";

/** Icon, one sentence on what to do, one action. */
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: { label: string; onPress: () => void; icon?: LucideIcon };
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.wrap, { borderColor: colors.border }]}>
      <View style={[styles.icon, { backgroundColor: colors.muted }]}>
        <Icon size={28} color={colors.mutedForeground} strokeWidth={1.8} />
      </View>
      <Text variant="heading" style={styles.center} accessibilityRole="header">
        {title}
      </Text>
      <Text tone="muted" style={styles.center}>
        {body}
      </Text>
      {action && (
        <Button
          label={action.label}
          icon={action.icon}
          onPress={action.onPress}
          style={styles.action}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: space.sm,
    paddingVertical: space.xxl,
    paddingHorizontal: space.xl,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 12,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.xs,
  },
  center: { textAlign: "center" },
  action: { marginTop: space.md, alignSelf: "stretch" },
});
