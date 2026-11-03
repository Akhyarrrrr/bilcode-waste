import React from "react";
import {
  Pressable,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import { radius, space } from "../theme/tokens";
import { alpha, useTheme } from "../theme/ThemeProvider";

/** Bordered panel: hierarchy through borders, never shadows. */
export function Card({
  children,
  style,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  ...props
}: ViewProps & {
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const base: ViewStyle = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: space.lg,
    gap: space.md,
    overflow: "hidden",
  };
  if (!onPress)
    return (
      <View {...props} style={[base, style]}>
        {children}
      </View>
    );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      android_ripple={{ color: alpha(colors.foreground, 0.08) }}
      style={({ pressed }) => [base, pressed && { opacity: 0.85 }, style]}
    >
      {children}
    </Pressable>
  );
}
