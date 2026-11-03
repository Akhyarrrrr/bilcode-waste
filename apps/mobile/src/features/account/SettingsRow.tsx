import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ChevronRight, type LucideIcon } from "lucide-react-native";
import { Text } from "../../components/Text";
import { space } from "../../theme/tokens";
import { alpha, useTheme } from "../../theme/ThemeProvider";

/** Settings list row: icon, label, optional value, chevron when it navigates. */
export function SettingsRow({
  icon: Icon,
  label,
  value,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  value?: string;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const content = (
    <>
      <Icon size={20} color={colors.mutedForeground} />
      <Text style={styles.flex}>{label}</Text>
      {value && (
        <Text variant="label" tone="muted">
          {value}
        </Text>
      )}
      {onPress && <ChevronRight size={20} color={colors.mutedForeground} />}
    </>
  );
  if (!onPress)
    return (
      <View accessible style={styles.row}>
        {content}
      </View>
    );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      android_ripple={{ color: alpha(colors.foreground, 0.08) }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    minHeight: 52,
    paddingHorizontal: space.lg,
  },
  flex: { flex: 1 },
  pressed: { opacity: 0.75 },
});
