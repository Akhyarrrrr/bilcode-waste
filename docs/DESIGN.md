# Design system: Bilcode Waste

One token set for web (`apps/web/src/index.css`) and mobile (`apps/mobile/src/theme/tokens.ts`).
The look is a quiet operations tool: white and zinc surfaces, one emerald action color, and
colour reserved for meaning (status and waste category).

## Principles

1. **Colour means something.** Emerald is the only action colour. Every other hue encodes a
   report status or a waste category, never decoration.
2. **Categories use the bin colours residents already know.** Indonesian sorted bins are green
   for organic, yellow for inorganic/plastic and blue for paper. Categories are shown as a
   neutral chip with a coloured bin swatch; statuses are coloured pills with an icon. The two
   never rely on colour alone.
3. **Hierarchy through borders and spacing, not shadows.** Panels have a 1px border and no
   shadow; only overlays (menus, dialogs, toasts) float with a shadow.
4. **One motion moment per screen.** The AI result bars animate when a prediction arrives.
   Everything else responds only to user actions (open, confirm, change), and all motion
   respects `prefers-reduced-motion`.
5. **Plain Indonesian copy.** Sentence case, active verbs, buttons named after what happens
   ("Kirim laporan", "Ubah status"). Errors say what happened and what to do next.

## Colour

| Token                | Light     | Dark      | Use                                   |
| -------------------- | --------- | --------- | ------------------------------------- |
| `background`         | `#FAFAFA` | `#09090B` | App canvas                            |
| `surface`            | `#FFFFFF` | `#18181B` | Panels, inputs, sheets                |
| `muted`              | `#F4F4F5` | `#27272A` | Subtle fills, table header, skeleton  |
| `border`             | `#E4E4E7` | `#27272A` | Panel and table lines                 |
| `input`              | `#D4D4D8` | `#3F3F46` | Field borders (3:1 non-text contrast) |
| `foreground`         | `#18181B` | `#FAFAFA` | Primary text                          |
| `muted-foreground`   | `#71717A` | `#A1A1AA` | Secondary text (≥4.5:1 on surface)    |
| `primary`            | `#047857` | `#34D399` | Primary buttons, links, focus         |
| `primary-foreground` | `#FFFFFF` | `#022C22` | Text on primary                       |
| `primary-soft`       | `#ECFDF5` | `#064E3B` | Selected nav item, AI highlight       |
| `destructive`        | `#BE123C` | `#FB7185` | Delete, reject                        |
| `ring`               | `#10B981` | `#34D399` | Focus outline                         |

### Status (pill: soft background + strong text + icon)

| Status        | Label    | Icon (lucide) | Light bg / text       | Dark bg / text        |
| ------------- | -------- | ------------- | --------------------- | --------------------- |
| `PENDING`     | Menunggu | `Clock`       | `#FFFBEB` / `#B45309` | `#451A03` / `#FCD34D` |
| `IN_PROGRESS` | Diproses | `Truck`       | `#EFF6FF` / `#1D4ED8` | `#172554` / `#93C5FD` |
| `COMPLETED`   | Selesai  | `CircleCheck` | `#ECFDF5` / `#047857` | `#064E3B` / `#6EE7B7` |
| `REJECTED`    | Ditolak  | `CircleX`     | `#FFF1F2` / `#BE123C` | `#4C0519` / `#FDA4AF` |

### Waste category (bin swatch; also chart series)

| Category  | Label   | Icon (lucide) | Light     | Dark      |
| --------- | ------- | ------------- | --------- | --------- |
| `ORGANIC` | Organik | `Leaf`        | `#15803D` | `#16A34A` |
| `PLASTIC` | Plastik | `Milk`        | `#D97706` | `#D97706` |
| `PAPER`   | Kertas  | `Newspaper`   | `#2563EB` | `#3B82F6` |

## Typography

**Plus Jakarta Sans** (variable, by Tokotype, Jakarta) for everything, self-hosted on web
(`@fontsource-variable/plus-jakarta-sans`) and bundled on mobile
(`@expo-google-fonts/plus-jakarta-sans`). Numbers use `font-variant-numeric: tabular-nums`.

| Role                   | Size / line                        | Weight | Tracking |
| ---------------------- | ---------------------------------- | ------ | -------- |
| Display (landing hero) | 48–60 / 1.05                       | 700    | -0.03em  |
| Page title             | 24 / 32 (mobile 26/32)             | 700    | -0.02em  |
| Section title          | 16 / 24                            | 600    | -0.01em  |
| Body                   | 14 / 20 (landing and mobile 16/24) | 400    | 0        |
| Label, table head      | 13 / 18                            | 500    | 0        |
| Caption, meta          | 12 / 16                            | 500    | 0        |
| KPI number             | 30 / 36                            | 700    | -0.02em  |

No all-caps labels and no eyebrow text above headings.

## Shape and spacing

- Radius: panels and cards 12, controls 8, pills and avatars full, photos 10.
- Spacing on a 4px grid; page gutter 24 (desktop), 16 (mobile web and native).
- Content max width 1280. Text blocks stay under ~72 characters.
- Breakpoints: 640, 768, 1024, 1280. Tables become stacked rows below 768.
- Touch targets ≥ 44px on mobile and native.

## Components

| Component     | Notes                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------- |
| Button        | `primary`, `secondary` (surface + border), `ghost`, `destructive`; 36px web, 48px native |
| StatusBadge   | Pill with icon and label; never colour alone                                             |
| CategoryBadge | Neutral chip with 8px rounded bin swatch and label                                       |
| KPI strip     | One bordered panel split into cells, not separate cards                                  |
| AI panel      | Three probability bars in category colours, top result first, confidence note under 60%  |
| Timeline      | Vertical status history with actor, WIB time and admin note                              |
| Empty state   | Icon, one sentence on what to do, one action                                             |
| Skeleton      | Matches final layout; never a full-page spinner after first paint                        |
| Map           | CARTO Positron (light) / Dark Matter (dark) tiles; pins in category colour               |

## Brand

Product name **Bilcode Waste**. The Bilcode mark comes from the official SVG
(<https://bilcode.id/Bilcode.svg>) and is rendered in `currentColor` so it follows the theme.
The product is an assessment project, not an official Bilcode service; the footer says so.
