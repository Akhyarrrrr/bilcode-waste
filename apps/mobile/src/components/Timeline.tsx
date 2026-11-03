import React from "react";
import { StyleSheet, View } from "react-native";
import { reportLabels, type StatusEvent } from "@bilcode/contracts";
import { dateTime } from "../lib/format";
import { radius, space } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";
import { statusIcons } from "./StatusBadge";
import { Text } from "./Text";

/** Vertical status history: status, actor, WIB time and admin note. */
export function Timeline({ events }: { events: StatusEvent[] }) {
  const theme = useTheme();
  return (
    <View>
      {events.map((event, index) => {
        const { bg, fg } = theme.status[event.toStatus];
        const Icon = statusIcons[event.toStatus];
        const last = index === events.length - 1;
        const title = event.fromStatus
          ? `Status: ${reportLabels[event.toStatus]}`
          : `Laporan dikirim · ${reportLabels[event.toStatus]}`;
        return (
          <View key={event.id} style={styles.row} accessible>
            <View style={styles.rail}>
              <View style={[styles.dot, { backgroundColor: bg }]}>
                <Icon size={16} color={fg} strokeWidth={2.4} />
              </View>
              {!last && (
                <View
                  style={[
                    styles.line,
                    { backgroundColor: theme.colors.border },
                  ]}
                />
              )}
            </View>
            <View style={[styles.content, !last && styles.spaced]}>
              <Text variant="bodyStrong">{title}</Text>
              <Text variant="caption" tone="muted">
                {event.actor.name} · {dateTime(event.createdAt)}
              </Text>
              {event.note && (
                <View
                  style={[styles.note, { backgroundColor: theme.colors.muted }]}
                >
                  <Text variant="label">{event.note}</Text>
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space.md },
  rail: { alignItems: "center", width: 32 },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  line: { width: 2, flex: 1, marginVertical: 4, borderRadius: 1 },
  content: { flex: 1, gap: 2, paddingTop: 5 },
  spaced: { paddingBottom: space.lg },
  note: {
    marginTop: space.sm,
    padding: space.md,
    borderRadius: radius.control,
  },
});
