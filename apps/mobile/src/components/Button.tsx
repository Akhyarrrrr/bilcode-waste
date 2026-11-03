import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { haptic } from "../lib/haptics";
import { radius, space } from "../theme/tokens";
import { alpha, useTheme } from "../theme/ThemeProvider";
import { Text } from "./Text";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";

export function Button({
  label,
  onPress,
  variant = "primary",
  icon: Icon,
  busy,
  disabled,
  style,
  accessibilityHint,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: LucideIcon;
  busy?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}) {
  const { colors } = useTheme();
  const inactive = !!disabled || !!busy;
  const look = {
    primary: {
      bg: colors.primary,
      fg: colors.primaryForeground,
      border: colors.primary,
    },
    secondary: {
      bg: colors.surface,
      fg: colors.foreground,
      border: colors.input,
    },
    ghost: { bg: "transparent", fg: colors.primary, border: "transparent" },
    destructive: {
      bg: colors.surface,
      fg: colors.destructive,
      border: colors.destructive,
    },
  }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: !!busy }}
      disabled={inactive}
      android_ripple={{ color: alpha(look.fg, 0.16) }}
      onPress={() => {
        if (variant === "primary") haptic.tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: look.bg, borderColor: look.border },
        inactive && styles.inactive,
        pressed && styles.pressed,
        style,
      ]}
    >
      <View style={styles.content}>
        {busy ? (
          <ActivityIndicator color={look.fg} />
        ) : (
          Icon && <Icon size={20} color={look.fg} strokeWidth={2.2} />
        )}
        <Text variant="bodyStrong" style={{ color: look.fg }} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: radius.control,
    borderWidth: 1,
    paddingHorizontal: space.lg,
    justifyContent: "center",
    overflow: "hidden",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
  },
  inactive: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
});
