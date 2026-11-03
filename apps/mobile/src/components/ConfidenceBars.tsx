import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { categoryLabels, type Category } from "@bilcode/contracts";
import { percent } from "../lib/format";
import { space } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";
import { categoryIcons } from "./CategoryBadge";
import { Text } from "./Text";

/** All three model scores, highest first, in bin colours. */
export function ConfidenceBars({
  scores,
  animate = false,
}: {
  scores: Record<Category, number>;
  animate?: boolean;
}) {
  const sorted = (Object.entries(scores) as [Category, number][]).sort(
    (a, b) => b[1] - a[1],
  );
  return (
    <View style={styles.list}>
      {sorted.map(([category, score], index) => (
        <Bar
          key={category}
          category={category}
          score={score}
          top={index === 0}
          delay={animate ? index * 120 : -1}
        />
      ))}
    </View>
  );
}

function Bar({
  category,
  score,
  top,
  delay,
}: {
  category: Category;
  score: number;
  top: boolean;
  /** -1 renders the final state without motion. */
  delay: number;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const still = delay < 0 || reduced;
  const progress = useSharedValue(still ? 1 : 0);
  useEffect(() => {
    if (!still)
      progress.value = withDelay(
        delay,
        withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }),
      );
  }, [still, delay, progress]);
  const fill = useAnimatedStyle(() => ({
    width: `${Math.max(score * 100 * progress.value, 1)}%`,
  }));
  const color = theme.category[category];
  const Icon = categoryIcons[category];
  return (
    <View
      accessible
      accessibilityLabel={`${categoryLabels[category]} ${percent(score)}`}
      style={styles.bar}
    >
      <View style={styles.labelRow}>
        <Icon size={16} color={color} strokeWidth={2.2} />
        <Text
          variant={top ? "bodyStrong" : "label"}
          tone={top ? "default" : "muted"}
          style={styles.flex}
        >
          {categoryLabels[category]}
        </Text>
        <Text
          variant={top ? "bodyStrong" : "label"}
          tone={top ? "default" : "muted"}
          style={styles.number}
        >
          {percent(score)}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: theme.colors.muted }]}>
        <Animated.View
          style={[
            styles.fill,
            { backgroundColor: color, opacity: top ? 1 : 0.7 },
            fill,
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.md },
  bar: { gap: 6 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  flex: { flex: 1 },
  number: { fontVariant: ["tabular-nums"] },
  track: { height: 8, borderRadius: 4, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 4 },
});
