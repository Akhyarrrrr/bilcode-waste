import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Stack, ThemeProvider as NavigationTheme } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react-native";
import { PlusJakartaSans_400Regular } from "@expo-google-fonts/plus-jakarta-sans/400Regular";
import { PlusJakartaSans_500Medium } from "@expo-google-fonts/plus-jakarta-sans/500Medium";
import { PlusJakartaSans_600SemiBold } from "@expo-google-fonts/plus-jakarta-sans/600SemiBold";
import { PlusJakartaSans_700Bold } from "@expo-google-fonts/plus-jakarta-sans/700Bold";
import { Button } from "../src/components/Button";
import { Notice } from "../src/components/ErrorState";
import { Screen } from "../src/components/Screen";
import { Text } from "../src/components/Text";
import { queryClient } from "../src/lib/query";
import { entryDestination } from "../src/onboarding";
import { OnboardingProvider, useOnboarding } from "../src/onboarding-context";
import { SessionProvider, useSession } from "../src/session";
import { ThemeProvider, useTheme } from "../src/theme/ThemeProvider";
import { fonts } from "../src/theme/tokens";

void SplashScreen.preventAutoHideAsync().catch(() => undefined);
SplashScreen.setOptions({ fade: true, duration: 250 });

function BootError({
  title,
  text,
  onRetry,
}: {
  title: string;
  text: string;
  onRetry: () => void;
}) {
  return (
    <Screen edges={["top", "bottom"]}>
      <Text variant="title" accessibilityRole="header">
        {title}
      </Text>
      <Notice text={text} />
      <Button label="Coba lagi" icon={RefreshCw} onPress={onRetry} />
    </Screen>
  );
}

function Routes() {
  const session = useSession();
  const onboarding = useOnboarding();
  const theme = useTheme();
  const { colors } = theme;
  const [fontsLoaded, fontError] = useFonts({
    [fonts.regular]: PlusJakartaSans_400Regular,
    [fonts.medium]: PlusJakartaSans_500Medium,
    [fonts.semibold]: PlusJakartaSans_600SemiBold,
    [fonts.bold]: PlusJakartaSans_700Bold,
  });
  const ready =
    (fontsLoaded || !!fontError) &&
    !session.loading &&
    !onboarding.loading &&
    theme.ready;
  const [booted, setBooted] = useState(false);
  useEffect(() => {
    if (ready)
      void SplashScreen.hideAsync()
        .catch(() => undefined)
        .finally(() => setBooted(true));
  }, [ready]);
  const navigationTheme = useMemo(() => {
    const font = (fontFamily: string) => ({
      fontFamily,
      fontWeight: "normal" as const,
    });
    return {
      dark: theme.scheme === "dark",
      colors: {
        primary: colors.primary,
        background: colors.background,
        card: colors.background,
        text: colors.foreground,
        border: colors.border,
        notification: colors.destructive,
      },
      fonts: {
        regular: font(fonts.regular),
        medium: font(fonts.medium),
        bold: font(fonts.semibold),
        heavy: font(fonts.bold),
      },
    };
  }, [theme.scheme, colors]);

  if (!ready)
    // Splash stays up on first boot; later restores (retry) show a spinner.
    return booted ? (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    ) : null;
  if (session.error)
    return (
      <BootError
        title="Sesi belum dapat dipulihkan"
        text={session.error}
        onRetry={() => void session.restore()}
      />
    );
  if (onboarding.error && !session.user)
    return (
      <BootError
        title="Panduan belum dapat dimuat"
        text={onboarding.error}
        onRetry={() => void onboarding.reload()}
      />
    );
  const destination = entryDestination(!!session.user, onboarding.completed);
  return (
    <NavigationTheme value={navigationTheme}>
      <Stack
        key={session.user?.id ?? "guest"}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
          headerTitleStyle: { fontFamily: fonts.semibold, fontSize: 17 },
          headerShadowVisible: false,
        }}
      >
        <Stack.Protected guard={destination === "onboarding"}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={destination === "auth"}>
          <Stack.Screen name="auth" />
        </Stack.Protected>
        <Stack.Protected guard={!!session.user}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="create"
            options={{ presentation: "modal", animation: "slide_from_bottom" }}
          />
          <Stack.Screen
            name="report/[id]"
            options={{ headerShown: true, title: "Detail laporan" }}
          />
        </Stack.Protected>
        <Stack.Protected guard={onboarding.completed || !!session.user}>
          <Stack.Screen name="guide" options={{ animation: "fade" }} />
        </Stack.Protected>
      </Stack>
    </NavigationTheme>
  );
}

function ThemedStatusBar() {
  const { scheme } = useTheme();
  return <StatusBar style={scheme === "dark" ? "light" : "dark"} />;
}

export default function Layout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ThemedStatusBar />
          <SessionProvider>
            <OnboardingProvider>
              <Routes />
            </OnboardingProvider>
          </SessionProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
