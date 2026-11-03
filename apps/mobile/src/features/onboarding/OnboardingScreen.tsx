import React, { useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArrowRight } from "lucide-react-native";
import { Button } from "../../components/Button";
import { Notice } from "../../components/ErrorState";
import { Brand } from "../../components/Header";
import { Text } from "../../components/Text";
import { message } from "../../lib/api";
import { useOnboarding } from "../../onboarding-context";
import { space } from "../../theme/tokens";
import { useTheme } from "../../theme/ThemeProvider";
import { SlideArt } from "./SlideArt";

const slides = [
  {
    title: "Foto sampah di sekitar Anda",
    body: "Ambil foto atau pilih dari galeri. Lokasi diambil dari GPS saat Anda berada di tempat.",
  },
  {
    title: "AI menyarankan kategorinya",
    body: "Model memberi saran Organik, Plastik, atau Kertas. Anda tetap memeriksa dan bisa mengubahnya.",
  },
  {
    title: "Ikuti penanganannya",
    body: "Laporan masuk dengan status Menunggu. Riwayat mencatat petugas, waktu, dan catatan penanganan.",
  },
];

export function OnboardingScreen({ revisit = false }: { revisit?: boolean }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const list = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onboarding = useOnboarding();
  const last = index === slides.length - 1;

  async function finish() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await onboarding.finish();
      if (revisit) {
        if (router.canGoBack()) router.back();
        else router.replace("/(tabs)");
      }
    } catch (error) {
      setError(`Panduan belum dapat disimpan. ${message(error)}`);
    } finally {
      setBusy(false);
    }
  }
  const goTo = (next: number) => {
    list.current?.scrollToIndex({ index: next, animated: true });
    setIndex(next);
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={styles.top}>
        <Brand size={20} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={revisit ? "Tutup panduan" : "Lewati panduan"}
          disabled={busy}
          hitSlop={8}
          onPress={() => void finish()}
          style={styles.skip}
        >
          <Text variant="label" tone="muted">
            {revisit ? "Tutup" : "Lewati"}
          </Text>
        </Pressable>
      </View>
      <FlatList
        ref={list}
        data={slides}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.title}
        getItemLayout={(_, i) => ({
          length: width,
          offset: width * i,
          index: i,
        })}
        onMomentumScrollEnd={(event) =>
          setIndex(Math.round(event.nativeEvent.contentOffset.x / width))
        }
        renderItem={({ item, index: i }) => (
          <View style={[styles.slide, { width }]}>
            <SlideArt slide={i} />
            <View style={styles.copy}>
              <Text
                variant="title"
                accessibilityRole="header"
                style={styles.center}
              >
                {item.title}
              </Text>
              <Text tone="muted" style={styles.center}>
                {item.body}
              </Text>
            </View>
          </View>
        )}
      />
      <View style={styles.bottom}>
        <View
          accessible
          accessibilityLabel={`Langkah ${index + 1} dari ${slides.length}`}
          style={styles.dots}
        >
          {slides.map((slide, i) => (
            <View
              key={slide.title}
              style={[
                styles.dot,
                {
                  width: i === index ? 24 : 8,
                  backgroundColor: i === index ? colors.primary : colors.input,
                },
              ]}
            />
          ))}
        </View>
        <Notice text={error} />
        <Button
          label={last ? (revisit ? "Selesai" : "Mulai") : "Lanjut"}
          icon={last ? undefined : ArrowRight}
          busy={busy}
          onPress={() => (last ? void finish() : goTo(index + 1))}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
  skip: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  slide: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: space.xl,
    gap: space.xl,
  },
  copy: { gap: space.md, maxWidth: 420, alignSelf: "center" },
  center: { textAlign: "center" },
  bottom: { padding: space.lg, gap: space.lg },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6 },
  dot: { height: 8, borderRadius: 4 },
});
