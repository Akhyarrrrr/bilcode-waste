import React from "react";
import { StyleSheet, View } from "react-native";
import { categories, categoryLabels, type Category } from "@bilcode/contracts";
import { categoryIcons } from "../../components/CategoryBadge";
import { Chip } from "../../components/Chip";
import { Text } from "../../components/Text";
import { space } from "../../theme/tokens";
import { useTheme } from "../../theme/ThemeProvider";

export function CategoryPicker({
  value,
  suggested,
  onChange,
}: {
  value: Category | null;
  suggested: Category | null;
  onChange: (category: Category) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      <Text variant="label">Kategori laporan</Text>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Kategori laporan"
        style={styles.row}
      >
        {categories.map((category) => {
          const Icon = categoryIcons[category];
          return (
            <Chip
              key={category}
              label={categoryLabels[category]}
              accessibilityLabel={`${categoryLabels[category]}${suggested === category ? ", saran AI" : ""}`}
              selected={value === category}
              onPress={() => onChange(category)}
              leading={
                <Icon
                  size={16}
                  color={theme.category[category]}
                  strokeWidth={2.4}
                />
              }
            />
          );
        })}
      </View>
      <Text variant="caption" tone="muted">
        {suggested
          ? value === suggested
            ? "Saran AI sudah dipilih. Ubah jika kurang tepat."
            : `Anda mengubah saran AI (${categoryLabels[suggested]}).`
          : "Laporan dikirim tanpa analisis AI. Pilih kategori yang paling sesuai."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  row: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
});
