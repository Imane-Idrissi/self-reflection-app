# Design System

## Mood

Calm, warm, encouraging. The app should feel like a trusted journal — not a corporate dashboard, not a clinical tool. The user is doing something vulnerable (reflecting on their behavior), so the design must feel safe and supportive, never judgmental.

---

## Color Palette

### Backgrounds
| Token | Hex | Usage |
|-------|-----|-------|
| `bg-primary` | `#FAFAF8` | Main app background — warm off-white, never cold pure white |
| `bg-secondary` | `#F2F1ED` | Cards, panels, sidebar — subtle warmth, gentle contrast |
| `bg-elevated` | `#FFFFFF` | Floating elements, modals, dropdowns — pure white to lift off the warm base |

### Primary (Indigo-Blue)
| Token | Hex | Usage |
|-------|-----|-------|
| `primary-50` | `#EEF2FF` | Subtle highlights, hover backgrounds |
| `primary-100` | `#E0E7FF` | Selected states, light badges |
| `primary-200` | `#C7D2FE` | Progress bars, secondary indicators |
| `primary-400` | `#818CF8` | Icons, secondary buttons |
| `primary-500` | `#6366F1` | Primary buttons, links, active states — the signature color |
| `primary-600` | `#4F46E5` | Primary button hover |
| `primary-700` | `#4338CA` | Primary button pressed |

### Text
| Token | Hex | Usage |
|-------|-----|-------|
| `text-primary` | `#1C1917` | Headings — warm near-black, never pure #000 |
| `text-secondary` | `#57534E` | Body text, descriptions — warm dark gray |
| `text-tertiary` | `#A8A29E` | Placeholders, timestamps, subtle labels |
| `text-inverse` | `#FAFAF8` | Text on dark/primary backgrounds |

### Semantic
| Token | Hex | Usage |
|-------|-----|-------|
| `positive` | `#16A34A` | Positive patterns, session went well |
| `positive-bg` | `#F0FDF4` | Background for positive indicators |
| `caution` | `#D97706` | Medium confidence, needs attention |
| `caution-bg` | `#FFFBEB` | Background for caution indicators |
| `negative` | `#DC2626` | Low confidence, avoidance patterns |
| `negative-bg` | `#FEF2F2` | Background for negative indicators |
| `info` | `#6366F1` | Informational, uses primary |
| `info-bg` | `#EEF2FF` | Background for info indicators |

---

## Typography

### Font Family
- **Headings:** `"Plus Jakarta Sans"` — geometric, modern, warm personality. Feels friendly without being casual.
- **Body:** `"Inter"` — optimized for screens, clean readability at all sizes.
- **Mono:** `"JetBrains Mono"` — for timestamps, technical data, capture entries.

### Scale
| Token | Size | Weight | Line Height | Font | Usage |
|-------|------|--------|-------------|------|-------|
| `display` | 36px | 700 | 1.2 | Jakarta Sans | Hero text, home screen headline |
| `h1` | 28px | 700 | 1.3 | Jakarta Sans | Page titles (Report, Intent) |
| `h2` | 22px | 600 | 1.35 | Jakarta Sans | Section headings |
| `h3` | 18px | 600 | 1.4 | Jakarta Sans | Card titles, pattern names |
| `body` | 15px | 400 | 1.6 | Inter | Main body text |
| `body-medium` | 15px | 500 | 1.6 | Inter | Emphasized body (labels, names) |
| `small` | 13px | 400 | 1.5 | Inter | Secondary info, captions |
| `caption` | 11px | 500 | 1.4 | Inter | Timestamps, badges, metadata |
| `mono` | 13px | 400 | 1.5 | JetBrains Mono | Capture entries, technical data |

---

## Spacing

Use a **4px base unit**. All spacing is a multiple of 4.

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | 4px | Tight gaps (icon to label) |
| `sm` | 8px | Inside compact elements |
| `md` | 16px | Default padding, gaps between related items |
| `lg` | 24px | Section padding, card padding |
| `xl` | 32px | Between sections |
| `2xl` | 48px | Major section breaks |
| `3xl` | 64px | Page-level vertical rhythm |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `sm` | 6px | Small badges, tags |
| `md` | 10px | Buttons, inputs |
| `lg` | 14px | Cards, panels |
| `xl` | 20px | Large containers, modals |
| `full` | 9999px | Circular elements, pills, avatars |

---

## Shadows

Soft, layered shadows that create depth without harshness. Uses warm undertones to match the palette.

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-sm` | `0 1px 2px rgba(28, 25, 23, 0.04)` | Subtle lift — buttons, badges |
| `shadow-md` | `0 4px 12px rgba(28, 25, 23, 0.06)` | Cards, panels |
| `shadow-lg` | `0 8px 24px rgba(28, 25, 23, 0.08)` | Floating elements, dropdowns |
| `shadow-xl` | `0 16px 48px rgba(28, 25, 23, 0.10)` | Modals, the floating feeling button |

---

## Illustrations

- Illustrations are used to add warmth and personality, especially on the home screen and empty states.
- Style: friendly, slightly abstract character illustrations — similar to Planndu/Notion references.
- Placement: intentional, not decorative filler. Every illustration should serve a purpose (welcoming the user, softening an empty state, celebrating a completed session).
- Color: illustrations should use the palette above — primarily warm neutrals with primary indigo-blue as the accent.

---

## Interaction & Motion

- **Transitions:** 150ms ease-out for hover states, 200ms ease-out for panel open/close.
- **Hover:** Subtle background color shift (e.g., `bg-primary` → `bg-secondary`), never abrupt color jumps.
- **Focus:** 2px ring using `primary-400` with 2px offset. Visible and accessible.
- **Loading states:** Gentle pulse animation (opacity 0.5 → 1.0), never aggressive spinners.
- **Page transitions:** Subtle fade (150ms), no sliding or bouncing.

---

## Component Principles

- **Cards:** `bg-elevated` background, `shadow-md`, `radius-lg`, `padding-lg`. Cards are the primary container for content.
- **Buttons:** Rounded (`radius-md`), generous padding (12px 24px), clear hierarchy between primary (filled) and secondary (outlined).
- **Inputs:** `bg-elevated` background, 1px `#E7E5E4` border, `radius-md`. Border transitions to `primary-500` on focus.
- **The floating feeling button:** Uses `shadow-xl` to feel detached from everything else. Rounded (`radius-full`), uses `primary-500` as background. Should feel inviting, not intrusive.

---

## Unique Design Touches

- **Home screen:** A distinctive, welcoming layout that sets the app apart. Uses illustration, generous whitespace, and a bold headline — not a generic dashboard. This is the user's first impression every session.
- **Report confidence indicators:** Use the semantic colors with subtle background tints and rounded badges. High = green, Medium = amber, Low = red. Visually scannable.
- **Session active state:** A soft, breathing glow or pulse around the recording indicator — the app feels alive while capturing, not static.
- **Empty states:** Never just "No data." Always an illustration + encouraging message ("Ready for your first session?" or "Your insights will appear here").
