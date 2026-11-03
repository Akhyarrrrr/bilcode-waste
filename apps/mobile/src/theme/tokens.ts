import type { Category, Status } from "@bilcode/contracts";

// Mirrors docs/DESIGN.md and apps/web/src/index.css; change all three together.
export const palettes = {
  light: {
    background: "#FAFAFA",
    surface: "#FFFFFF",
    muted: "#F4F4F5",
    border: "#E4E4E7",
    input: "#D4D4D8",
    foreground: "#18181B",
    mutedForeground: "#71717A",
    primary: "#047857",
    primaryForeground: "#FFFFFF",
    primarySoft: "#ECFDF5",
    destructive: "#BE123C",
    destructiveSoft: "#FFF1F2",
    ring: "#10B981",
    overlay: "rgba(9, 9, 11, 0.45)",
  },
  dark: {
    background: "#09090B",
    surface: "#18181B",
    muted: "#27272A",
    border: "#27272A",
    input: "#3F3F46",
    foreground: "#FAFAFA",
    mutedForeground: "#A1A1AA",
    primary: "#34D399",
    primaryForeground: "#022C22",
    primarySoft: "#064E3B",
    destructive: "#FB7185",
    destructiveSoft: "#4C0519",
    ring: "#34D399",
    overlay: "rgba(0, 0, 0, 0.6)",
  },
} as const;
export type Palette = { [K in keyof (typeof palettes)["light"]]: string };
export type Scheme = keyof typeof palettes;

export const statusColors: Record<
  Scheme,
  Record<Status, { bg: string; fg: string }>
> = {
  light: {
    PENDING: { bg: "#FFFBEB", fg: "#B45309" },
    IN_PROGRESS: { bg: "#EFF6FF", fg: "#1D4ED8" },
    COMPLETED: { bg: "#ECFDF5", fg: "#047857" },
    REJECTED: { bg: "#FFF1F2", fg: "#BE123C" },
  },
  dark: {
    PENDING: { bg: "#451A03", fg: "#FCD34D" },
    IN_PROGRESS: { bg: "#172554", fg: "#93C5FD" },
    COMPLETED: { bg: "#064E3B", fg: "#6EE7B7" },
    REJECTED: { bg: "#4C0519", fg: "#FDA4AF" },
  },
};

/** Indonesian sorted-bin colours: green organic, yellow plastic, blue paper. */
export const categoryColors: Record<Scheme, Record<Category, string>> = {
  light: { ORGANIC: "#15803D", PLASTIC: "#D97706", PAPER: "#2563EB" },
  dark: { ORGANIC: "#16A34A", PLASTIC: "#D97706", PAPER: "#3B82F6" },
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { control: 8, card: 12, photo: 10, pill: 999 } as const;

export const fonts = {
  regular: "PlusJakartaSans_400Regular",
  medium: "PlusJakartaSans_500Medium",
  semibold: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
} as const;

export const type = {
  title: {
    fontFamily: fonts.bold,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  heading: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 24 },
  label: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  number: {
    fontFamily: fonts.bold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
} as const;
