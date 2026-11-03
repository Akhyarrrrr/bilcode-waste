import React from "react";
import { Text as NativeText, type TextProps } from "react-native";
import { type } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";

export type Tone = "default" | "muted" | "primary" | "destructive" | "inverse";

export function Text({
  variant = "body",
  tone = "default",
  style,
  ...props
}: TextProps & { variant?: keyof typeof type; tone?: Tone }) {
  const { colors } = useTheme();
  const color = {
    default: colors.foreground,
    muted: colors.mutedForeground,
    primary: colors.primary,
    destructive: colors.destructive,
    inverse: colors.primaryForeground,
  }[tone];
  return (
    <NativeText
      maxFontSizeMultiplier={1.6}
      {...props}
      style={[
        type[variant],
        { color },
        variant === "number" && { fontVariant: ["tabular-nums"] },
        style,
      ]}
    />
  );
}
