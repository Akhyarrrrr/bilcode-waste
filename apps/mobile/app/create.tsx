import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewInstance,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, usePreventRemove } from "expo-router";
import { ArrowLeft, ArrowRight, Send, X } from "lucide-react-native";
import { Button } from "../src/components/Button";
import { Notice } from "../src/components/ErrorState";
import { IconButton } from "../src/components/IconButton";
import { Stepper } from "../src/components/Stepper";
import { Text } from "../src/components/Text";
import { DetailsStep } from "../src/features/create/DetailsStep";
import { PhotoStep } from "../src/features/create/PhotoStep";
import { ReviewStep } from "../src/features/create/ReviewStep";
import { SuccessView } from "../src/features/create/SuccessView";
import { STEPS, problemField } from "../src/features/create/flow";
import { useCreateReport } from "../src/features/create/useCreateReport";
import { space } from "../src/theme/tokens";
import { useTheme } from "../src/theme/ThemeProvider";

export default function CreateReport() {
  const { colors } = useTheme();
  const flow = useCreateReport();
  const { step, error, submitting, report } = flow.state;
  const scroll = useRef<ScrollViewInstance>(null);
  const [leaving, setLeaving] = useState(false);
  const { dispatch } = flow;
  const back = () => dispatch({ type: "goto", step: step - 1 });

  // Closing, swiping or hardware-back with an unsent draft asks first.
  usePreventRemove(flow.dirty && !leaving && !report, ({ repeat }) =>
    Alert.alert(
      "Buang draf laporan?",
      "Foto dan isian yang belum dikirim akan hilang.",
      [
        { text: "Lanjutkan mengisi", style: "cancel" },
        {
          text: "Buang draf",
          style: "destructive",
          onPress: () => {
            setLeaving(true);
            repeat();
          },
        },
      ],
    ),
  );
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
    // Android back steps through the flow before leaving it.
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (step === 0 || report) return false;
        dispatch({ type: "goto", step: step - 1 });
        return true;
      },
    );
    return () => subscription.remove();
  }, [step, report, dispatch]);

  if (report) return <SuccessView report={report} />;
  const footerError = step === 1 && problemField(error) ? null : error;
  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={[styles.flex, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <IconButton icon={X} label="Tutup" onPress={() => router.back()} />
        <Text variant="heading" accessibilityRole="header" style={styles.title}>
          Laporan baru
        </Text>
        <View style={styles.spacer} />
      </View>
      <View style={styles.stepper}>
        <Stepper steps={STEPS} current={step} />
      </View>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scroll}
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Steps stay mounted so state, focus and the one-time AI animation survive. */}
          <View style={step !== 0 && styles.hidden}>
            <PhotoStep flow={flow} />
          </View>
          <View style={step !== 1 && styles.hidden}>
            <DetailsStep flow={flow} />
          </View>
          {step === 2 && <ReviewStep flow={flow} />}
        </ScrollView>
        <View
          style={[
            styles.footer,
            { borderColor: colors.border, backgroundColor: colors.background },
          ]}
        >
          <Notice text={footerError} />
          <View style={styles.buttons}>
            {step > 0 && (
              <Button
                label="Kembali"
                variant="secondary"
                icon={ArrowLeft}
                disabled={submitting}
                onPress={back}
                style={styles.flex}
              />
            )}
            {step < 2 ? (
              <Button
                label="Lanjut"
                icon={ArrowRight}
                disabled={flow.busy || flow.state.location.busy}
                onPress={() => flow.dispatch({ type: "next" })}
                style={styles.grow}
              />
            ) : (
              <Button
                label="Kirim laporan"
                icon={Send}
                busy={submitting}
                onPress={flow.submit}
                style={styles.grow}
              />
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grow: { flex: 2 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: space.sm,
    paddingTop: space.xs,
  },
  title: { flex: 1, textAlign: "center" },
  spacer: { width: 44 },
  stepper: { paddingHorizontal: space.lg, paddingVertical: space.md },
  content: {
    padding: space.lg,
    paddingBottom: space.xxl,
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
  },
  hidden: { display: "none" },
  footer: {
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  buttons: { flexDirection: "row", gap: space.md },
});
