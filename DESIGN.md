---
name: Arena Electric
colors:
  surface: '#fef7ff'
  surface-dim: '#e2d3ff'
  surface-bright: '#fef7ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f9f1ff'
  surface-container: '#f4eaff'
  surface-container-high: '#efe3ff'
  surface-container-highest: '#eaddff'
  on-surface: '#20143a'
  on-surface-variant: '#4a4452'
  inverse-surface: '#362a51'
  inverse-on-surface: '#f6edff'
  outline: '#7b7483'
  outline-variant: '#ccc3d4'
  surface-tint: '#6e47b8'
  primary: '#2e006a'
  on-primary: '#ffffff'
  primary-container: '#46178f'
  on-primary-container: '#b38cff'
  inverse-primary: '#d3bbff'
  secondary: '#ba002b'
  on-secondary: '#ffffff'
  secondary-container: '#e31d3d'
  on-secondary-container: '#fffbff'
  tertiary: '#00214c'
  on-tertiary: '#ffffff'
  tertiary-container: '#003674'
  on-tertiary-container: '#69a1ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ebddff'
  primary-fixed-dim: '#d3bbff'
  on-primary-fixed: '#250059'
  on-primary-fixed-variant: '#562c9f'
  secondary-fixed: '#ffdad9'
  secondary-fixed-dim: '#ffb3b2'
  on-secondary-fixed: '#410008'
  on-secondary-fixed-variant: '#920020'
  tertiary-fixed: '#d7e2ff'
  tertiary-fixed-dim: '#abc7ff'
  on-tertiary-fixed: '#001b3f'
  on-tertiary-fixed-variant: '#004590'
  background: '#fef7ff'
  on-background: '#20143a'
  surface-variant: '#eaddff'
typography:
  display-hero:
    fontFamily: Montserrat
    fontSize: 64px
    fontWeight: '900'
    lineHeight: 72px
    letterSpacing: -0.02em
  display-hero-mobile:
    fontFamily: Montserrat
    fontSize: 40px
    fontWeight: '900'
    lineHeight: 46px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Montserrat
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Montserrat
    fontSize: 28px
    fontWeight: '800'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: 0em
  headline-sm:
    fontFamily: Montserrat
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: 0em
  body-lg:
    fontFamily: Montserrat
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: 0em
  body-md:
    fontFamily: Montserrat
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: 0em
  body-sm:
    fontFamily: Montserrat
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0em
  label-lg:
    fontFamily: Montserrat
    fontSize: 16px
    fontWeight: '800'
    lineHeight: 20px
    letterSpacing: 0.04em
  label-md:
    fontFamily: Montserrat
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 18px
    letterSpacing: 0.03em
  label-sm:
    fontFamily: Montserrat
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  numeric-timer:
    fontFamily: Montserrat
    fontSize: 56px
    fontWeight: '900'
    lineHeight: 56px
    letterSpacing: -0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system targets competitive learners, students, remote teams, and event hosts engaged in real-time, high-stakes trivia and live games. The experience must deliver visceral excitement, anticipation, and immediate clarity under rapid countdown constraints.

The visual style blends **High-Contrast Bold Gamification** with **Tactile 3D Extrusions** and **Polished Glassmorphism**. UI elements behave like physical game tokens and arcade buttons: they depress under pressure, cast directional dimensional shadows, and float over deep, atmospheric purple canvases. Interactive surfaces prioritize instant scannability across communal displays, personal tablets, and mobile hand controllers.

## Colors

The palette leverages a deep royal purple foundation enriched by four primary quadrant gameplay colors, each tied intrinsically to specific geometric iconography for maximum accessibility and visual snap.

### Palette Architecture
- **Primary (Royal Purple):** Base `#46178F`, Dark `#2D0F5E` (canvas backdrop and active states), Light `#6B3FA0` (accents and highlights).
- **Gamified Quadrant Colors:**
  - **Answer Red (Triangle):** `#E21B3C` with shadow extrusion `#A01128`.
  - **Answer Blue (Diamond):** `#1368CE` with shadow extrusion `#0B4A96`.
  - **Answer Yellow (Circle):** `#D89E00` with shadow extrusion `#9B7000`.
  - **Answer Green (Square):** `#26890C` with shadow extrusion `#1A5E08`.
- **Surfaces & Neutrals:**
  - Primary Surface: `#FFFFFF`
  - Elevated Surface: `#FAF9FD`
  - Deep Text Neutral: `#1E1238`
  - Muted Neutral: `#685F78`
  - Ambient Translucent White: `rgba(255, 255, 255, 0.12)` for frosted atmospheric elements.

Color roles must never be mixed casually: the four game colors are reserved exclusively for answer tiles, rapid telemetry metrics, and podium rankings.

## Typography

Typography relies on **Montserrat** across all roles to project assertive, geometric punch and maximum readability from a distance.

### Hierarchy & Style Rules
- **Game Prompts & Headlines:** Rendered in `800` or `900` weights. Questions must remain compact, high-impact, and immediately absorbable within seconds.
- **Numbers & Scores:** Emphasize high-weight tabular tracking (`numeric-timer`) for countdowns, combo multipliers, and point totals to prevent layout shift during tick updates.
- **Micro-labels & Badges:** Always set uppercase with expanded tracking (`0.03em` to `0.05em`) in `700` weight to mimic physical arcade signage.

## Layout & Spacing

The platform follows a responsive, fluid grid engineered for rapid fingertip targeting and high-visibility broadcast displays.

### Layout Mechanics
- **Mobile Handheld (Controller View):** 1-column or 2x2 quadrant layout filling 100% of viewport minus `margin` (1rem). Dynamic safe-area padding top and bottom keeps critical tap targets away from system bars.
- **Tablet / Shared Desktop:** 12-column layout with `gutter-desktop` (1.5rem) and `margin-desktop` (2.5rem). The primary stage holds a centralized question card with maximum width of `960px`, anchored by a 2x2 grid of answer containers below.
- **Live Podium & Scoreboard:** Shifts to a centered flex column with variable slot widths, maintaining a rigid `space-md` gap hierarchy between rows.

## Elevation & Depth

Visual depth is achieved through an explicit combination of **Tactile 3D Extrusions** and **Frosted Glass Containers**, avoiding fuzzy ambient drop shadows in favor of crisp, directional mechanical depth.

### Extrusion Mechanics
- **Unpressed Components:** An extruded solid "under-ledge" offset strictly along the Y-axis (typically `4px` on mobile, `6px` on desktop) using a shade 30% darker than the surface fill (e.g., `box-shadow: 0 6px 0 #2D0F5E`).
- **Hover State:** Translate `-1px` on Y-axis with a corresponding `+1px` increase in extrusion depth.
- **Active / Pressed State:** Complete collapse along the Y-axis (`transform: translateY(6px)`), reducing the extrusion offset to `0px`.
- **Disabled State:** Zero extrusion, muted background, low-contrast inner bevel.

### Frosted Glass Surfaces
Non-actionable overlay panels (such as leaderboard overlays, timer badges, and host controls) use frosted glassmorphism:
- Background: `rgba(255, 255, 255, 0.12)` on dark stages or `rgba(255, 255, 255, 0.85)` on light content zones.
- Blur: `backdrop-filter: blur(16px)`.
- Border: `1.5px solid rgba(255, 255, 255, 0.25)` top and side edges to capture downward light reflection.

## Shapes

The system uses a balanced **Rounded (`2`)** profile. Base elements carry a `0.5rem` (`8px`) radius, cards and modular game tiles utilize `1rem` (`16px`), and expansive layout containers scale up to `1.5rem` (`24px`).

### Iconographic Anchors
Geometric identification shapes reinforce the answer buttons:
- **Red:** Equilateral Triangle
- **Blue:** Rotated Square (Diamond)
- **Yellow:** Circle
- **Green:** Square

These shapes must be rendered in pristine white (`#FFFFFF`) with uniform stroke or solid fill inside answer buttons, remaining anchored to the outer edge of each option block.

## Components

### Buttons
- **Standard Primary (Brand):** Fill `#46178F`, lower lip extrusion `0 5px 0 #2D0F5E`, text `#FFFFFF`, radius `1rem`. Active transition snaps downward by `5px`.
- **Answer Buttons (Quadrant Variants):**
  - Stiff, physical rectangular blocks holding a minimum touch target of `64px` on mobile and `110px` on desktop.
  - Distinct colored bodies (`#E21B3C`, `#1368CE`, `#D89E00`, `#26890C`) each supported by their respective hard shadow extrusion.
  - Inner layout: Left-aligned white iconic shape (Triangle, Diamond, Circle, Square) separated cleanly from high-contrast Montserrat bold text.

### Cards & Question Containers
- Surface: Crisp `#FFFFFF` card body with a subtle `#FAF9FD` outer border glow.
- Structural border: `2px solid rgba(70, 23, 143, 0.08)`.
- Base elevation: Supported by a `0 8px 0 rgba(45, 15, 94, 0.08)` baseline floor extrusion to retain physical presence against the royal purple stage.

### Inputs & PIN Entry
- Large, central display characters set in Montserrat 900.
- Individual PIN boxes: `#FFFFFF` fill, `2px solid #6B3FA0`, inner bottom shadow `inset 0 -3px 0 #E5E1EE`.
- Focus state: Border transitions to `#46178F` with a soft outer ring and rapid cursor pulse.

### Selection Controls (Checkboxes & Radios)
- Distinct chunky tiles rather than delicate standard web forms.
- Box: Solid white background with a `2px solid #6B3FA0` boundary and `0 3px 0 #D1C7E3` base lip.
- Checked state: Fill shifts to `#46178F` with a crisp white checkmark extruded inwards.

### Chips & Badges
- Pill-shaped game indicators (`rounded-xl` or full round).
- Glass style: Translucent purple tint (`rgba(70, 23, 143, 0.15)`) with vivid high-contrast border and uppercase `label-sm` text.
- Streak counters: Answer Green (`#26890C`) with flame glyph and white numeric text.

### Gamified Progress & Timer Rings
- Circular timer: SVG stroke dynamic countdown utilizing Montserrat `numeric-timer` in center. Ring transitions from Answer Blue to Answer Yellow, terminating in blinking Answer Red under `5` seconds remaining.
- Podium rows: Stacked horizontal bars that compress and expand dynamically, utilizing extruded edges to elevate 1st, 2nd, and 3rd rank slots.