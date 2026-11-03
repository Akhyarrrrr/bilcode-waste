import React from "react";
import { StyleSheet, View } from "react-native";
import {
  FileText,
  LocateFixed,
  MapPinned,
  RefreshCw,
  Settings,
  Type,
} from "lucide-react-native";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Notice } from "../../components/ErrorState";
import { StaticMap } from "../../components/StaticMap";
import { Text } from "../../components/Text";
import { TextField } from "../../components/TextField";
import { coordinates } from "../../lib/format";
import { space } from "../../theme/tokens";
import { useTheme } from "../../theme/ThemeProvider";
import { problemField } from "./flow";
import type { CreateFlow } from "./useCreateReport";

const POOR_ACCURACY_M = 50;

export function DetailsStep({ flow }: { flow: CreateFlow }) {
  const { colors } = useTheme();
  const { draft, location, error, step } = flow.state;
  const field = step === 1 ? problemField(error) : null;
  const set =
    (name: "title" | "description" | "locationLabel") => (value: string) =>
      flow.dispatch({ type: "field", field: name, value });
  const fix = draft.location;
  const poor = fix?.accuracy != null && fix.accuracy > POOR_ACCURACY_M;
  return (
    <View style={styles.wrap}>
      <View style={styles.intro}>
        <Text variant="title" accessibilityRole="header">
          Di mana lokasinya?
        </Text>
        <Text tone="muted">
          Ambil GPS saat Anda berada di dekat sampah, lalu jelaskan temuan Anda.
        </Text>
      </View>

      <Card style={field === "location" && { borderColor: colors.destructive }}>
        <View style={styles.row}>
          <LocateFixed size={20} color={colors.mutedForeground} />
          <Text variant="bodyStrong" style={styles.flex}>
            Lokasi GPS
          </Text>
          {fix && (
            <Text variant="caption" tone={poor ? "destructive" : "muted"}>
              {fix.accuracy == null
                ? "Akurasi tidak tersedia"
                : `Akurasi ±${Math.round(fix.accuracy)} m`}
            </Text>
          )}
        </View>
        {fix ? (
          <>
            <StaticMap
              latitude={fix.latitude}
              longitude={fix.longitude}
              category={draft.category}
              accessibilityLabel="Peta lokasi GPS yang tersimpan"
            />
            <Text variant="caption" tone="muted">
              {coordinates(fix.latitude, fix.longitude)}
            </Text>
            {poor && (
              <Notice
                tone="warning"
                text="Akurasi masih rendah. Coba ambil ulang di area yang lebih terbuka."
              />
            )}
          </>
        ) : (
          <Text variant="label" tone="muted">
            Koordinat diambil dari GPS perangkat, bukan ditebak.
          </Text>
        )}
        <Notice text={location.error} />
        {location.denied ? (
          <Button
            label="Buka pengaturan"
            variant="secondary"
            icon={Settings}
            onPress={flow.openSettings}
          />
        ) : null}
        <Button
          label={
            fix
              ? "Ambil ulang lokasi"
              : location.error
                ? "Coba lagi"
                : "Gunakan lokasi saat ini"
          }
          variant={fix ? "secondary" : "primary"}
          icon={fix || location.error ? RefreshCw : LocateFixed}
          busy={location.busy}
          onPress={flow.locate}
        />
        {field === "location" && <Notice text={error} />}
      </Card>

      <TextField
        label="Penanda lokasi"
        icon={MapPinned}
        placeholder="Contoh: dekat gerbang taman, sisi utara"
        value={draft.locationLabel}
        onChangeText={set("locationLabel")}
        error={field === "locationLabel" ? error : null}
        maxLength={200}
      />
      <TextField
        label="Judul laporan"
        icon={Type}
        placeholder="Ringkas masalah yang ditemukan"
        value={draft.title}
        onChangeText={set("title")}
        error={field === "title" ? error : null}
        maxLength={120}
      />
      <TextField
        label="Deskripsi"
        icon={FileText}
        placeholder="Jelaskan jenis, jumlah, dan kondisi sampah"
        value={draft.description}
        onChangeText={set("description")}
        error={field === "description" ? error : null}
        hint={`${draft.description.length.toLocaleString("id-ID")}/2.000 karakter · minimal 10`}
        maxLength={2000}
        multiline
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.lg },
  intro: { gap: space.xs },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm },
  flex: { flex: 1 },
});
