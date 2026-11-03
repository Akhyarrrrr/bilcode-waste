import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { space } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";

/** Scrollable page with optional pull-to-refresh and a sticky footer. */
export function Screen({
  children,
  edges = ["top"],
  refreshing,
  onRefresh,
  footer,
  contentStyle,
}: {
  children: React.ReactNode;
  edges?: Edge[];
  refreshing?: boolean;
  onRefresh?: () => void;
  footer?: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <SafeAreaView
      edges={edges}
      style={[styles.flex, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.page, contentStyle]}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={!!refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
                progressBackgroundColor={colors.surface}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
        {footer && (
          <View
            style={[
              styles.footer,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
          >
            {footer}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: {
    padding: space.lg,
    paddingBottom: space.xxl,
    gap: space.lg,
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
  },
  footer: {
    flexDirection: "row",
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
