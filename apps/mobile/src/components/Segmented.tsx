import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { haptic } from "../lib/haptics";
import { radius } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";
import { Text } from "./Text";

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string; icon?: LucideIcon }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={[styles.track, { backgroundColor: colors.muted }]}
    >
      {options.map(({ value: option, label: text, icon: Icon }) => {
        const selected = option === value;
        const fg = selected ? colors.foreground : colors.mutedForeground;
        return (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected, selected }}
            accessibilityLabel={text}
            onPress={() => {
              if (selected) return;
              haptic.select();
              onChange(option);
            }}
            style={[
              styles.segment,
              selected && {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            {Icon && <Icon size={16} color={fg} strokeWidth={2.2} />}
            <Text variant="label" style={{ color: fg }}>
              {text}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    padding: 3,
    borderRadius: radius.control + 2,
    gap: 3,
  },
  segment: {
    flex: 1,
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: "transparent",
  },
});
