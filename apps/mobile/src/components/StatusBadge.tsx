import React from "react";
import { StyleSheet, View } from "react-native";
import {
  CircleCheck,
  CircleX,
  Clock,
  Truck,
  type LucideIcon,
} from "lucide-react-native";
import { reportLabels, type Status } from "@bilcode/contracts";
import { radius } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";
import { Text } from "./Text";

export const statusIcons: Record<Status, LucideIcon> = {
  PENDING: Clock,
  IN_PROGRESS: Truck,
  COMPLETED: CircleCheck,
  REJECTED: CircleX,
};

/** Coloured pill with icon and label, so status never relies on colour alone. */
export function StatusBadge({ status }: { status: Status }) {
  const theme = useTheme();
  const { bg, fg } = theme.status[status];
  const Icon = statusIcons[status];
  return (
    <View
      accessible
      accessibilityLabel={`Status: ${reportLabels[status]}`}
      style={[styles.pill, { backgroundColor: bg }]}
    >
      <Icon size={14} color={fg} strokeWidth={2.4} />
      <Text variant="caption" style={{ color: fg }}>
        {reportLabels[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
});
