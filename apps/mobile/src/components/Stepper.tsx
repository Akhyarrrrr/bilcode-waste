import React from "react";
import { StyleSheet, View } from "react-native";
import { Check } from "lucide-react-native";
import { space } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";
import { Text } from "./Text";

export function Stepper({
  steps,
  current,
}: {
  steps: string[];
  current: number;
}) {
  const { colors } = useTheme();
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Langkah laporan"
      accessibilityValue={{
        min: 1,
        max: steps.length,
        now: current + 1,
        text: `Langkah ${current + 1} dari ${steps.length}: ${steps[current]}`,
      }}
      style={styles.row}
    >
      {steps.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <React.Fragment key={label}>
            {index > 0 && (
              <View
                style={[
                  styles.line,
                  {
                    backgroundColor:
                      index <= current ? colors.primary : colors.border,
                  },
                ]}
              />
            )}
            <View style={styles.step}>
              <View
                style={[
                  styles.dot,
                  done || active
                    ? {
                        backgroundColor: colors.primary,
                        borderColor: colors.primary,
                      }
                    : {
                        backgroundColor: colors.surface,
                        borderColor: colors.input,
                      },
                ]}
              >
                {done ? (
                  <Check
                    size={14}
                    color={colors.primaryForeground}
                    strokeWidth={3}
                  />
                ) : (
                  <Text
                    variant="caption"
                    style={{
                      color: active
                        ? colors.primaryForeground
                        : colors.mutedForeground,
                    }}
                  >
                    {index + 1}
                  </Text>
                )}
              </View>
              <Text variant="caption" tone={active ? "default" : "muted"}>
                {label}
              </Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.sm },
  step: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  line: { flex: 1, height: 2, borderRadius: 1 },
});
