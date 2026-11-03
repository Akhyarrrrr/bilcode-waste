import React, { useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { ExternalLink, MapPin } from "lucide-react-native";
import type { Report } from "@bilcode/contracts";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Notice } from "../../components/ErrorState";
import { StaticMap } from "../../components/StaticMap";
import { Text } from "../../components/Text";
import { coordinates, mapsUrl } from "../../lib/format";
import { space } from "../../theme/tokens";
import { useTheme } from "../../theme/ThemeProvider";

export function LocationPanel({ report }: { report: Report }) {
  const { colors } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const open = () =>
    void Linking.openURL(mapsUrl(report.latitude, report.longitude)).catch(() =>
      setError("Peta tidak dapat dibuka pada perangkat ini."),
    );
  return (
    <Card>
      <View style={styles.row}>
        <MapPin size={20} color={colors.mutedForeground} />
        <View style={styles.flex}>
          <Text variant="bodyStrong">{report.locationLabel}</Text>
          <Text variant="caption" tone="muted">
            {coordinates(report.latitude, report.longitude)}
            {report.locationAccuracy == null
              ? " · akurasi tidak tersedia"
              : ` · akurasi ±${Math.round(report.locationAccuracy)} m`}
          </Text>
        </View>
      </View>
      <StaticMap
        latitude={report.latitude}
        longitude={report.longitude}
        category={report.category}
        accessibilityLabel={`Peta lokasi ${report.locationLabel}`}
      />
      <Notice text={error} />
      <Button
        label="Buka di Maps"
        variant="secondary"
        icon={ExternalLink}
        onPress={open}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.sm },
  flex: { flex: 1 },
});
