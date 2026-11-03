import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import {
  Camera,
  Hand,
  Images,
  Layers,
  RefreshCw,
  ScanLine,
  Settings,
  Sparkles,
  Sun,
  type LucideIcon,
} from "lucide-react-native";
import { categoryLabels } from "@bilcode/contracts";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { ConfidenceBars } from "../../components/ConfidenceBars";
import { Notice } from "../../components/ErrorState";
import { Text } from "../../components/Text";
import { radius, space } from "../../theme/tokens";
import { alpha, useTheme } from "../../theme/ThemeProvider";
import { LOW_CONFIDENCE } from "../report/AiPanel";
import { CategoryPicker } from "./CategoryPicker";
import { ScanOverlay } from "./ScanOverlay";
import type { CreateFlow } from "./useCreateReport";

const phaseLabels = {
  preparing: "Menyiapkan foto…",
  uploading: "Mengunggah foto…",
  analyzing: "AI menganalisis foto…",
} as const;

function SourceButton({
  icon: Icon,
  label,
  hint,
  onPress,
  compact,
}: {
  icon: LucideIcon;
  label: string;
  hint: string;
  onPress: () => void;
  compact?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={onPress}
      android_ripple={{ color: alpha(colors.primary, 0.12) }}
      style={({ pressed }) => [
        compact ? styles.sourceCompact : styles.source,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          compact ? styles.iconSmall : styles.icon,
          { backgroundColor: colors.primarySoft },
        ]}
      >
        <Icon size={compact ? 18 : 26} color={colors.primary} strokeWidth={2} />
      </View>
      <Text variant={compact ? "label" : "bodyStrong"}>{label}</Text>
      {!compact && (
        <Text variant="caption" tone="muted" style={styles.center}>
          {hint}
        </Text>
      )}
    </Pressable>
  );
}

const tips: { icon: LucideIcon; text: string }[] = [
  { icon: Sun, text: "Foto di tempat terang, tidak melawan cahaya." },
  { icon: ScanLine, text: "Sampah memenuhi bingkai foto." },
  { icon: Layers, text: "Satu jenis sampah utama per laporan." },
];

export function PhotoStep({ flow }: { flow: CreateFlow }) {
  const { colors } = useTheme();
  const { draft, photo } = flow.state;
  const { prediction } = draft;
  const phase = photo.phase;
  return (
    <View style={styles.wrap}>
      <View style={styles.intro}>
        <Text variant="title" accessibilityRole="header">
          Foto sampahnya
        </Text>
        <Text tone="muted">
          Ambil seluruh tumpukan dalam satu foto. AI akan menyarankan
          kategorinya.
        </Text>
      </View>

      {draft.imageUri ? (
        <View>
          <Image
            source={{ uri: draft.imageUri }}
            contentFit="cover"
            transition={150}
            accessibilityLabel="Pratinjau foto laporan"
            style={[styles.preview, { backgroundColor: colors.muted }]}
          />
          {(phase === "preparing" ||
            phase === "uploading" ||
            phase === "analyzing") && (
            <ScanOverlay label={phaseLabels[phase]} />
          )}
        </View>
      ) : null}

      <View style={styles.sources}>
        <SourceButton
          icon={Camera}
          label={draft.imageUri ? "Foto ulang" : "Ambil foto"}
          hint="Buka kamera"
          compact={!!draft.imageUri}
          onPress={() => flow.pick(true)}
        />
        <SourceButton
          icon={Images}
          label={draft.imageUri ? "Ganti dari galeri" : "Pilih dari galeri"}
          hint="Pilih foto yang sudah ada"
          compact={!!draft.imageUri}
          onPress={() => flow.pick(false)}
        />
      </View>

      {!draft.imageUri && (
        <View style={[styles.tips, { borderColor: colors.border }]}>
          <Text variant="label" tone="muted">
            Agar saran AI akurat
          </Text>
          {tips.map(({ icon: Icon, text }) => (
            <View key={text} style={styles.row}>
              <Icon size={18} color={colors.primary} strokeWidth={2} />
              <Text variant="label" style={styles.flex}>
                {text}
              </Text>
            </View>
          ))}
        </View>
      )}

      {phase === "failed" && (
        <Notice text={photo.error}>
          <View style={styles.actions}>
            {photo.denied && (
              <Button
                label="Buka pengaturan"
                variant="secondary"
                icon={Settings}
                onPress={flow.openSettings}
              />
            )}
            {!photo.denied && draft.imageUri && (
              <Button
                label={draft.upload ? "Coba analisis lagi" : "Coba unggah lagi"}
                variant="secondary"
                icon={RefreshCw}
                onPress={flow.retry}
              />
            )}
            {!photo.denied && draft.upload && (
              <Button
                label="Pilih manual"
                variant="ghost"
                icon={Hand}
                onPress={flow.chooseManual}
              />
            )}
          </View>
        </Notice>
      )}

      {prediction && (
        <Card key={prediction.id}>
          <View style={styles.row}>
            <Sparkles size={20} color={colors.primary} />
            <Text variant="bodyStrong" style={styles.flex}>
              Saran AI: {categoryLabels[prediction.category]}
            </Text>
          </View>
          <ConfidenceBars scores={prediction.scores} animate />
          {prediction.confidence < LOW_CONFIDENCE && (
            <Notice
              tone="warning"
              text="AI kurang yakin dengan foto ini. Periksa kategorinya sebelum melanjutkan."
            />
          )}
        </Card>
      )}

      {(prediction || draft.manual) && (
        <CategoryPicker
          value={draft.category}
          suggested={prediction?.category ?? null}
          onChange={(category) => flow.dispatch({ type: "category", category })}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.lg },
  intro: { gap: space.xs },
  preview: { width: "100%", aspectRatio: 4 / 3, borderRadius: radius.photo },
  sources: { flexDirection: "row", gap: space.md },
  source: {
    flex: 1,
    alignItems: "center",
    gap: space.sm,
    paddingVertical: space.xl,
    paddingHorizontal: space.md,
    borderWidth: 1,
    borderRadius: radius.card,
    overflow: "hidden",
  },
  sourceCompact: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    minHeight: 52,
    paddingHorizontal: space.md,
    borderWidth: 1,
    borderRadius: radius.card,
    overflow: "hidden",
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  iconSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.8 },
  center: { textAlign: "center" },
  tips: {
    gap: space.md,
    padding: space.lg,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: radius.card,
  },
  actions: { gap: space.sm },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm },
  flex: { flex: 1 },
});
