import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputInstance,
  type TextInputProps,
} from "react-native";
import { CircleAlert, Eye, EyeOff, type LucideIcon } from "lucide-react-native";
import { radius, space, type as typography } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";
import { Text } from "./Text";

export function TextField({
  label,
  icon: Icon,
  error,
  hint,
  secure,
  multiline,
  ref,
  ...props
}: TextInputProps & {
  label: string;
  icon?: LucideIcon;
  error?: string | null;
  hint?: string;
  /** Password field with a show/hide toggle. */
  secure?: boolean;
  ref?: React.Ref<TextInputInstance>;
}) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const border = error
    ? colors.destructive
    : focused
      ? colors.ring
      : colors.input;
  return (
    <View style={styles.field}>
      <Text variant="label">{label}</Text>
      <View
        style={[
          styles.box,
          multiline && styles.multiline,
          {
            backgroundColor:
              props.editable === false ? colors.muted : colors.surface,
            borderColor: border,
            borderWidth: focused || error ? 2 : 1,
          },
        ]}
      >
        {Icon && (
          <Icon size={20} color={colors.mutedForeground} strokeWidth={2} />
        )}
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          placeholderTextColor={colors.mutedForeground}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
          secureTextEntry={secure && hidden}
          multiline={multiline}
          maxFontSizeMultiplier={1.6}
          {...props}
          onFocus={(event) => {
            setFocused(true);
            props.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            props.onBlur?.(event);
          }}
          style={[
            styles.input,
            { color: colors.foreground },
            multiline && styles.multilineInput,
          ]}
        />
        {secure && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              hidden ? "Tampilkan kata sandi" : "Sembunyikan kata sandi"
            }
            hitSlop={10}
            onPress={() => setHidden(!hidden)}
            style={styles.toggle}
          >
            {hidden ? (
              <Eye size={20} color={colors.mutedForeground} />
            ) : (
              <EyeOff size={20} color={colors.mutedForeground} />
            )}
          </Pressable>
        )}
      </View>
      {error ? (
        <View style={styles.message} accessibilityLiveRegion="polite">
          <CircleAlert size={14} color={colors.destructive} strokeWidth={2.4} />
          <Text variant="caption" tone="destructive" style={styles.flex}>
            {error}
          </Text>
        </View>
      ) : (
        hint && (
          <Text variant="caption" tone="muted">
            {hint}
          </Text>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  box: {
    minHeight: 50,
    borderRadius: radius.control,
    paddingHorizontal: space.md,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  multiline: { alignItems: "flex-start", paddingVertical: space.sm },
  input: {
    ...typography.body,
    flex: 1,
    paddingVertical: 10,
  },
  multilineInput: { minHeight: 104, textAlignVertical: "top" },
  toggle: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  message: { flexDirection: "row", gap: 6, alignItems: "center" },
  flex: { flex: 1 },
});
