import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type ThemeChoice = "light" | "dark" | "system";
const STORAGE_KEY = "bilcode-theme";
const media = () => window.matchMedia("(prefers-color-scheme: dark)");

interface ThemeState {
  theme: ThemeChoice;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: string) => void;
}
const ThemeContext = createContext<ThemeState | null>(null);

function readChoice(): ThemeChoice {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // Storage can be blocked (private mode); fall back to the system setting.
  }
  return "system";
}

/** Class-based theme; index.html applies the same class before first paint to avoid a flash. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setChoice] = useState<ThemeChoice>(readChoice);
  const [systemDark, setSystemDark] = useState(() => media().matches);
  useEffect(() => {
    const query = media();
    const onChange = () => setSystemDark(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  const resolvedTheme =
    theme === "system" ? (systemDark ? "dark" : "light") : theme;
  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  }, [resolvedTheme]);
  const setTheme = (next: string) => {
    const value: ThemeChoice =
      next === "light" || next === "dark" ? next : "system";
    setChoice(value);
    try {
      if (value === "system") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Non-persistent preference is acceptable.
    }
  };
  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const state = useContext(ThemeContext);
  if (!state) throw new Error("ThemeProvider is missing");
  return state;
}
