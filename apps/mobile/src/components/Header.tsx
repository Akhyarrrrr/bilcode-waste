import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import bilcodeLogo from "../../assets/brand/Bilcode.png";
import { space } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";
import { Text } from "./Text";

/** Official Bilcode mark, tinted to the foreground so it reads in both themes. */
export function Brand({ size = 22 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Bilcode Waste"
      style={styles.brand}
    >
      <Image
        source={bilcodeLogo}
        contentFit="contain"
        tintColor={colors.foreground}
        style={{ height: size, width: (size * 762) / 294 }}
      />
      <Text
        variant="heading"
        tone="primary"
        style={{ fontSize: size * 0.82, lineHeight: size }}
      >
        Waste
      </Text>
    </View>
  );
}

/** Large page title used at the top of tab screens. */
export function Header({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.flex}>
        {subtitle && (
          <Text variant="label" tone="muted">
            {subtitle}
          </Text>
        )}
        <Text variant="title" accessibilityRole="header">
          {title}
        </Text>
      </View>
      {right}
    </View>
  );
}

export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.section}>
      <Text variant="heading" accessibilityRole="header" style={styles.flex}>
        {title}
      </Text>
      {action && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action.label}
          hitSlop={12}
          onPress={action.onPress}
          style={styles.link}
        >
          <Text variant="label" tone="primary">
            {action.label}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  brand: { flexDirection: "row", alignItems: "center", gap: space.sm },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingTop: space.sm,
  },
  section: { flexDirection: "row", alignItems: "center", marginTop: space.sm },
  link: { minHeight: 44, justifyContent: "center" },
});
