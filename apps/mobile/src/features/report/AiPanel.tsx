import React from "react";
import { StyleSheet, View } from "react-native";
import { CircleCheck, Hand, Pencil, Sparkles } from "lucide-react-native";
import { categoryLabels, type Report } from "@bilcode/contracts";
import { Card } from "../../components/Card";
import { ConfidenceBars } from "../../components/ConfidenceBars";
import { Notice } from "../../components/ErrorState";
import { Text } from "../../components/Text";
import { space } from "../../theme/tokens";
import { useTheme } from "../../theme/ThemeProvider";

export const LOW_CONFIDENCE = 0.6;

/** The model's real output next to what the reporter finally chose. */
export function AiPanel({ report }: { report: Report }) {
  const { colors } = useTheme();
  const prediction = report.prediction;
  if (!prediction)
    return (
      <Card style={styles.row}>
        <Hand size={20} color={colors.mutedForeground} />
        <View style={styles.flex}>
          <Text variant="bodyStrong">Kategori dipilih manual</Text>
          <Text variant="label" tone="muted">
            Laporan ini dikirim tanpa analisis foto oleh AI.
          </Text>
        </View>
      </Card>
    );
  const confirmed = prediction.category === report.category;
  return (
    <Card>
      <View style={styles.row}>
        <Sparkles size={20} color={colors.primary} />
        <Text variant="bodyStrong" style={styles.flex}>
          Saran AI: {categoryLabels[prediction.category]}
        </Text>
      </View>
      <ConfidenceBars scores={prediction.scores} />
      {prediction.confidence < LOW_CONFIDENCE && (
        <Notice
          tone="warning"
          text="Keyakinan model di bawah 60%. Kategori sebaiknya diperiksa ulang oleh petugas."
        />
      )}
      <View
        style={[styles.row, styles.verdict, { borderColor: colors.border }]}
      >
        {confirmed ? (
          <CircleCheck size={18} color={colors.primary} />
        ) : (
          <Pencil size={18} color={colors.mutedForeground} />
        )}
        <Text variant="label" style={styles.flex}>
          {confirmed
            ? "Dikonfirmasi pelapor"
            : `Diubah pelapor dari ${categoryLabels[prediction.category]} ke ${categoryLabels[report.category]}`}
        </Text>
      </View>
      <Text variant="caption" tone="muted">
        Inferensi {Math.round(prediction.durationMs)} ms · model{" "}
        {prediction.modelVersion}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.sm },
  flex: { flex: 1 },
  verdict: { borderTopWidth: 1, paddingTop: space.md },
});
