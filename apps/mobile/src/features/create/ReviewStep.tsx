import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { categoryLabels } from "@bilcode/contracts";
import { Card } from "../../components/Card";
import { CategoryBadge } from "../../components/CategoryBadge";
import { Notice } from "../../components/ErrorState";
import { StaticMap } from "../../components/StaticMap";
import { Text } from "../../components/Text";
import { coordinates, percent } from "../../lib/format";
import { radius, space } from "../../theme/tokens";
import { useTheme } from "../../theme/ThemeProvider";
import type { CreateFlow } from "./useCreateReport";

function EditLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={12}
      onPress={onPress}
      style={styles.edit}
    >
      <Text variant="label" tone="primary">
        Ubah
      </Text>
    </Pressable>
  );
}

export function ReviewStep({ flow }: { flow: CreateFlow }) {
  const { colors } = useTheme();
  const { draft } = flow.state;
  const goto = (step: number) => flow.dispatch({ type: "goto", step });
  return (
    <View style={styles.wrap}>
      <View style={styles.intro}>
        <Text variant="title" accessibilityRole="header">
          Periksa sebelum mengirim
        </Text>
        <Text tone="muted">
          Pastikan foto, kategori, dan lokasinya sudah benar.
        </Text>
      </View>

      <Card>
        <View style={styles.row}>
          {draft.imageUri && (
            <Image
              source={{ uri: draft.imageUri }}
              contentFit="cover"
              accessibilityLabel="Foto yang akan dikirim"
              style={[styles.thumb, { backgroundColor: colors.muted }]}
            />
          )}
          <View style={styles.flex}>
            {draft.category && <CategoryBadge category={draft.category} />}
            <Text variant="caption" tone="muted" style={styles.meta}>
              {draft.prediction
                ? draft.prediction.category === draft.category
                  ? `Sesuai saran AI (${percent(draft.prediction.confidence)})`
                  : `Diubah dari saran AI: ${categoryLabels[draft.prediction.category]}`
                : "Dipilih manual, tanpa analisis AI"}
            </Text>
          </View>
          <EditLink label="Ubah foto dan kategori" onPress={() => goto(0)} />
        </View>
      </Card>

      <Card>
        <View style={styles.row}>
          <Text variant="heading" style={styles.flex}>
            {draft.title.trim()}
          </Text>
          <EditLink label="Ubah judul dan deskripsi" onPress={() => goto(1)} />
        </View>
        <Text>{draft.description.trim()}</Text>
      </Card>

      {draft.location && (
        <Card>
          <View style={styles.row}>
            <View style={styles.flex}>
              <Text variant="bodyStrong">{draft.locationLabel.trim()}</Text>
              <Text variant="caption" tone="muted">
                {coordinates(draft.location.latitude, draft.location.longitude)}
                {draft.location.accuracy == null
                  ? ""
                  : ` · ±${Math.round(draft.location.accuracy)} m`}
              </Text>
            </View>
            <EditLink label="Ubah lokasi" onPress={() => goto(1)} />
          </View>
          <StaticMap
            latitude={draft.location.latitude}
            longitude={draft.location.longitude}
            category={draft.category}
            height={128}
            accessibilityLabel={`Peta lokasi ${draft.locationLabel}`}
          />
        </Card>
      )}

      <Notice
        tone="info"
        text="Laporan masuk dengan status Menunggu. Perubahan statusnya bisa Anda ikuti di tab Laporan."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.lg },
  intro: { gap: space.xs },
  row: { flexDirection: "row", alignItems: "center", gap: space.md },
  flex: { flex: 1, gap: 4 },
  thumb: { width: 72, height: 72, borderRadius: radius.photo },
  meta: { marginTop: 2 },
  edit: {
    minHeight: 44,
    minWidth: 44,
    alignItems: "flex-end",
    justifyContent: "center",
  },
});
