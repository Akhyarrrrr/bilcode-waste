import React from "react";
import { Pressable, StyleSheet } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { alpha, useTheme } from "../theme/ThemeProvider";

/** 44 px round icon-only button; the label is required for screen readers. */
export function IconButton({
  icon: Icon,
  label,
  onPress,
  tone = "default",
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  tone?: "default" | "muted" | "inverse";
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const look = {
    default: { bg: "transparent", fg: colors.foreground },
    muted: { bg: colors.muted, fg: colors.foreground },
    inverse: { bg: alpha("#000000", 0.45), fg: "#FFFFFF" },
  }[tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      hitSlop={4}
      onPress={onPress}
      android_ripple={{
        color: alpha(colors.foreground, 0.12),
        borderless: true,
      }}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: look.bg },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Icon size={22} color={look.fg} strokeWidth={2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
});
