import React from "react";
import { StyleSheet, View } from "react-native";
import { Leaf, Milk, Newspaper, type LucideIcon } from "lucide-react-native";
import { categoryLabels, type Category } from "@bilcode/contracts";
import { radius } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";
import { Text } from "./Text";

export const categoryIcons: Record<Category, LucideIcon> = {
  ORGANIC: Leaf,
  PLASTIC: Milk,
  PAPER: Newspaper,
};

/** The bin colour residents already know: green organic, yellow plastic, blue paper. */
export function CategorySwatch({
  category,
  size = 8,
}: {
  category: Category;
  size?: number;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 4,
        backgroundColor: theme.category[category],
      }}
    />
  );
}

/** Neutral chip with a bin swatch; the label carries the meaning. */
export function CategoryBadge({ category }: { category: Category }) {
  const { colors } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`Kategori: ${categoryLabels[category]}`}
      style={[
        styles.chip,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <CategorySwatch category={category} />
      <Text variant="caption">{categoryLabels[category]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
});
