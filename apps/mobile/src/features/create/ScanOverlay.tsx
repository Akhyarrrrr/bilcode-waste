import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Text } from "../../components/Text";
import { radius } from "../../theme/tokens";
import { useTheme } from "../../theme/ThemeProvider";

/** Scanner frame over the photo while it is prepared, uploaded and analysed. */
export function ScanOverlay({ label }: { label: string }) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    progress.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    return () => cancelAnimation(progress);
  }, [reduced, progress]);
  const line = useAnimatedStyle(() => ({ top: `${8 + progress.value * 84}%` }));
  return (
    <View
      style={styles.overlay}
      accessibilityLiveRegion="polite"
      accessibilityLabel={label}
    >
      {(["tl", "tr", "bl", "br"] as const).map((corner) => (
        <View key={corner} style={[styles.corner, styles[corner]]} />
      ))}
      {!reduced && (
        <Animated.View
          style={[styles.line, { backgroundColor: colors.ring }, line]}
        />
      )}
      <View style={styles.label}>
        <ActivityIndicator color="#FFFFFF" size="small" />
        <Text variant="label" style={styles.labelText}>
          {label}
        </Text>
      </View>
    </View>
  );
}

const CORNER = 28;
const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(9, 9, 11, 0.45)",
    borderRadius: radius.photo,
    alignItems: "center",
    justifyContent: "flex-end",
    padding: 16,
  },
  corner: {
    position: "absolute",
    width: CORNER,
    height: CORNER,
    borderColor: "#FFFFFF",
  },
  tl: {
    top: 14,
    left: 14,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 8,
  },
  tr: {
    top: 14,
    right: 14,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 8,
  },
  bl: {
    bottom: 14,
    left: 14,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 8,
  },
  br: {
    bottom: 14,
    right: 14,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 8,
  },
  line: {
    position: "absolute",
    left: 24,
    right: 24,
    height: 2,
    borderRadius: 1,
    opacity: 0.9,
  },
  label: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: "rgba(9, 9, 11, 0.7)",
  },
  labelText: { color: "#FFFFFF" },
});
