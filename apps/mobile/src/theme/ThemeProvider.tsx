import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Appearance, useColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as SystemUI from "expo-system-ui";
import type { Category, Status } from "@bilcode/contracts";
import {
  categoryColors,
  palettes,
  statusColors,
  type Palette,
  type Scheme,
} from "./tokens";

export type Preference = "system" | "light" | "dark";
const preferenceKey = "bilcode.theme";

export interface Theme {
  scheme: Scheme;
  colors: Palette;
  status: Record<Status, { bg: string; fg: string }>;
  category: Record<Category, string>;
  preference: Preference;
  setPreference: (preference: Preference) => void;
  ready: boolean;
}
const Context = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [preference, setState] = useState<Preference>("system");
  const [ready, setReady] = useState(false);
  const setPreference = useCallback((value: Preference) => {
    setState(value);
    // Native pieces (alerts, keyboard) follow Appearance, not our context.
    Appearance.setColorScheme(value === "system" ? "auto" : value);
    void SecureStore.setItemAsync(preferenceKey, value).catch(() => undefined);
  }, []);
  useEffect(() => {
    SecureStore.getItemAsync(preferenceKey)
      .then((value) => {
        if (value === "light" || value === "dark") setPreference(value);
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, [setPreference]);
  const scheme: Scheme =
    preference === "system"
      ? system === "dark"
        ? "dark"
        : "light"
      : preference;
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(palettes[scheme].background).catch(
      () => undefined,
    );
  }, [scheme]);
  const value = useMemo<Theme>(
    () => ({
      scheme,
      colors: palettes[scheme],
      status: statusColors[scheme],
      category: categoryColors[scheme],
      preference,
      setPreference,
      ready,
    }),
    [scheme, preference, setPreference, ready],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useTheme() {
  const theme = useContext(Context);
  if (!theme) throw new Error("ThemeProvider diperlukan.");
  return theme;
}

/** "#RRGGBB" + opacity -> "#RRGGBBAA" for soft tints of meaning colours. */
export const alpha = (hex: string, opacity: number) =>
  `${hex}${Math.round(opacity * 255)
    .toString(16)
    .padStart(2, "0")}`;
