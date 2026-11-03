import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { MapPin } from "lucide-react-native";
import type { Category } from "@bilcode/contracts";
import { TILE_SIZE, tileLayout, tileUrl } from "../lib/tiles";
import { radius } from "../theme/tokens";
import { alpha, useTheme } from "../theme/ThemeProvider";
import { categoryIcons } from "./CategoryBadge";
import { Text } from "./Text";

const ZOOM = 16;
const PIN = 30;

/** Key-free map: Esri Gray Canvas tiles composed around the coordinate with a centred pin. */
export function StaticMap({
  latitude,
  longitude,
  category,
  height = 168,
  accessibilityLabel,
}: {
  latitude: number;
  longitude: number;
  /** Pin uses the bin colour plus the category icon, never colour alone. */
  category?: Category | null;
  height?: number;
  accessibilityLabel: string;
}) {
  const theme = useTheme();
  const { colors } = theme;
  const [width, setWidth] = useState(0);
  const tiles = width
    ? tileLayout(latitude, longitude, ZOOM, width, height)
    : [];
  const pin = category ? theme.category[category] : colors.primary;
  const Icon = category ? categoryIcons[category] : MapPin;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      onLayout={(event) => setWidth(Math.round(event.nativeEvent.layout.width))}
      style={[
        styles.map,
        { height, backgroundColor: colors.muted, borderColor: colors.border },
      ]}
    >
      {(["Base", "Reference"] as const).map((layer) =>
        tiles.map((tile) => (
          <Image
            key={`${layer}:${tile.key}`}
            source={{
              uri: tileUrl(layer, theme.scheme === "dark", ZOOM, tile),
            }}
            cachePolicy="disk"
            transition={150}
            style={[styles.tile, { left: tile.left, top: tile.top }]}
          />
        )),
      )}
      {width > 0 && (
        <>
          <View
            pointerEvents="none"
            style={[
              styles.halo,
              {
                backgroundColor: alpha(pin, 0.22),
                left: width / 2 - 28,
                top: height / 2 - 28,
              },
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.pin,
              {
                backgroundColor: pin,
                left: width / 2 - PIN / 2,
                top: height / 2 - PIN / 2,
              },
            ]}
          >
            <Icon size={16} color="#FFFFFF" strokeWidth={2.4} />
          </View>
        </>
      )}
      <View
        style={[
          styles.credit,
          { backgroundColor: alpha(colors.surface, 0.85) },
        ]}
      >
        <Text variant="caption" tone="muted" style={styles.creditText}>
          © Esri, © OpenStreetMap
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    width: "100%",
    borderRadius: radius.photo,
    borderWidth: 1,
    overflow: "hidden",
  },
  tile: { position: "absolute", width: TILE_SIZE, height: TILE_SIZE },
  halo: { position: "absolute", width: 56, height: 56, borderRadius: 28 },
  pin: {
    position: "absolute",
    width: PIN,
    height: PIN,
    borderRadius: PIN / 2,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  credit: {
    position: "absolute",
    right: 0,
    bottom: 0,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderTopLeftRadius: 6,
  },
  creditText: { fontSize: 9, lineHeight: 12 },
});
