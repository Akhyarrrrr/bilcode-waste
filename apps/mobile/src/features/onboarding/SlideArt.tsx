import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import {
  Camera,
  CircleCheck,
  MapPin,
  ScanLine,
  Sparkles,
  Truck,
  type LucideIcon,
} from "lucide-react-native";
import { categories, categoryLabels } from "@bilcode/contracts";
import { categoryIcons } from "../../components/CategoryBadge";
import { Text } from "../../components/Text";
import { alpha, useTheme } from "../../theme/ThemeProvider";

function Bubble({
  icon: Icon,
  color,
  size,
  style,
}: {
  icon: LucideIcon;
  color: string;
  size: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        styles.bubble,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: alpha(color, 0.14),
        },
        style,
      ]}
    >
      <Icon size={size * 0.42} color={color} strokeWidth={1.8} />
    </View>
  );
}

/** Icon compositions on soft tinted circles; decorative, hidden from screen readers. */
export function SlideArt({ slide }: { slide: number }) {
  const theme = useTheme();
  const { primary } = theme.colors;
  const satellite = {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
  };
  return (
    <View
      style={styles.stage}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {slide === 0 && (
        <View style={styles.cluster}>
          <Bubble icon={Camera} color={primary} size={184} />
          <Bubble
            icon={ScanLine}
            color={primary}
            size={64}
            style={[styles.topRight, satellite]}
          />
          <Bubble
            icon={Sparkles}
            color={primary}
            size={52}
            style={[styles.bottomLeft, satellite]}
          />
        </View>
      )}
      {slide === 1 && (
        <View style={styles.bins}>
          {categories.map((category, index) => (
            <View
              key={category}
              style={[styles.bin, index === 1 && styles.raised]}
            >
              <Bubble
                icon={categoryIcons[category]}
                color={theme.category[category]}
                size={index === 1 ? 112 : 92}
              />
              <Text variant="label">{categoryLabels[category]}</Text>
            </View>
          ))}
        </View>
      )}
      {slide === 2 && (
        <View style={styles.cluster}>
          <Bubble icon={Truck} color={theme.status.IN_PROGRESS.fg} size={184} />
          <Bubble
            icon={MapPin}
            color={theme.status.PENDING.fg}
            size={60}
            style={[styles.topLeft, satellite]}
          />
          <Bubble
            icon={CircleCheck}
            color={theme.status.COMPLETED.fg}
            size={64}
            style={[styles.bottomRight, satellite]}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    height: 260,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
  },
  cluster: {
    width: 260,
    height: 260,
    alignItems: "center",
    justifyContent: "center",
  },
  bubble: { alignItems: "center", justifyContent: "center" },
  topRight: { position: "absolute", top: 20, right: 6 },
  bottomLeft: { position: "absolute", bottom: 26, left: 10 },
  topLeft: { position: "absolute", top: 22, left: 8 },
  bottomRight: { position: "absolute", bottom: 22, right: 6 },
  bins: { flexDirection: "row", alignItems: "flex-end", gap: 12 },
  bin: { alignItems: "center", gap: 8 },
  raised: { marginBottom: 28 },
});
