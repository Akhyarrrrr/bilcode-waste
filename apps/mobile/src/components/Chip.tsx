import React from "react";
import { Pressable, StyleSheet } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { haptic } from "../lib/haptics";
import { radius, space } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";
import { Text } from "./Text";

/** Selectable pill with radio semantics; place inside an accessibilityRole="radiogroup". */
export function Chip({
  label,
  selected,
  onPress,
  icon: Icon,
  leading,
  accessibilityLabel,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: LucideIcon;
  leading?: React.ReactNode;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const fg = selected ? colors.primary : colors.foreground;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ checked: selected, selected }}
      hitSlop={{ top: 4, bottom: 4 }}
      onPress={() => {
        haptic.select();
        onPress();
      }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? colors.primarySoft : colors.surface,
          borderColor: selected ? colors.primary : colors.input,
        },
        pressed && styles.pressed,
      ]}
    >
      {leading}
      {Icon && <Icon size={16} color={fg} strokeWidth={2.2} />}
      <Text variant="label" style={{ color: fg }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  pressed: { opacity: 0.75 },
});
