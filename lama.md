# QuizMaster — UI/UX Design System & Specification for Stitch AI

> **Purpose:** This document specifies the comprehensive design system, user journeys, component specifications, and visual design guidelines for **QuizMaster** (a real-time gamified multiplayer quiz platform inspired by Kahoot!). Use this specification as a blueprint to audit, refine, modernize, and generate enhanced UI/UX components.

---

## 1. Executive Summary & Brand Identity

### 1.1 Product Mission
QuizMaster is a fast-paced, high-engagement live interactive quiz game platform built for classrooms, workshops, and team competitions. It delivers high-energy gamification through real-time synchronization, immersive background music, animated avatars, and instant visual/auditory feedback.

### 1.2 Core Experience Pillars
- **High-Energy Gamification:** Vibrant saturated colors, 3D tactile button feedback, and festive particle animations (confetti, streak fire, floating emojis).
- **Zero-Friction Onboarding:** Players join within 5 seconds using a 6-character game PIN, nickname, and custom avatar.
- **Real-Time Synchronicity:** Zero-latency participant rosters, score rank deltas, and live floating reaction streams.
- **Fair-Play Anti-Cheat:** Visual warnings on browser tab blur, copy/paste prevention, and anti-print styling.

---

## 2. Design System Tokens & Foundations

### 2.1 Color Palette

#### Primary Brand Colors (Kahoot-inspired Royal Purple)
| Token | Hex Value | Usage |
|---|---|---|
| `--kahoot-purple` | `#46178F` | Primary brand background, primary buttons, active badges |
| `--kahoot-purple-dark` | `#2D0F5E` | 3D button shadows, dark card gradients, footer depth |
| `--kahoot-purple-light` | `#6B3FA0` | Hover states, tab outlines, accent borders |
| `--bg-secondary` | `#2D0F5E` | Deep background radial gradients |

#### Gamified 4-Color Answer Tokens
| Color Name | Hex Code | Hover Hex | 3D Shadow Hex | Shape Symbol |
|---|---|---|---|---|
| **Answer Red** | `#E21B3C` | `#CC1835` | `#A8142D` | Triangle (▲) |
| **Answer Blue** | `#1368CE` | `#1060B8` | `#0C4D9A` | Diamond (◆) |
| **Answer Yellow** | `#D89E00` | `#C08D00` | `#997000` | Circle (●) |
| **Answer Green** | `#26890C` | `#1F7509` | `#1A6008` | Square (■) |

#### Neutrals & Surface Colors
| Token | Hex / RGBA Value | Usage |
|---|---|---|
| `--bg-white` | `#FFFFFF` | Form cards, modal containers, inputs |
| `--bg-light` | `#F2F2F2` | Neutral buttons (`btn-light`), question card background |
| `--bg-card-subtle` | `#FAF9FD` | Avatar picker container column, subtle sidebars |
| `--text-dark` | `#333333` | Primary headings and text inside white cards |
| `--text-medium` | `#6B6B6B` | Secondary labels, descriptions inside white cards |
| `--text-light` | `#999999` | Placeholders, micro-copy, timestamps |
| `--text-white` | `#FFFFFF` | All text directly on purple background (`h1`, headers) |
| `--border-color` | `#E0E0E0` | Standard input and card borders |

---

### 2.2 Typography

- **Primary Font Family:** `'Montserrat', system-ui, -apple-system, sans-serif`
- **Font Weights:**
  - `900` (Black): Giant titles, countdown timer, hero headers
  - `800` (Extra Bold): Question titles, buttons, badges, ranks
  - `700` (Bold): Section labels, options, participant names
  - `600` (Semi-Bold): Inputs, subheadings
  - `500` (Medium): Body text, instructions, descriptions

#### Typographic Scale
| Level | Font Size | Line Height | Weight | Letter Spacing |
|---|---|---|---|---|
| **Display / Hero** | `2.5rem` – `3.5rem` (clamp) | `1.15` | 900 | `-0.02em` |
| **Page Title (H1)** | `1.85rem` – `2.0rem` | `1.2` | 800 | `-0.01em` |
| **Card Title (H2)** | `1.25rem` – `1.45rem` | `1.25` | 800 | Normal |
| **Section Title (H3)**| `1.05rem` – `1.15rem` | `1.3` | 700 | Normal |
| **Button Text** | `0.95rem` – `1.1rem` | `1.0` | 800 | `0.04em` (Uppercase) |
| **Body / Inputs** | `0.95rem` – `1.0rem` | `1.5` | 600 | Normal |
| **Micro / Badges** | `0.70rem` – `0.78rem` | `1.2` | 800 | `0.06em` (Uppercase) |

---

### 2.3 Component Styles & Elevation (3D Tactile Language)

QuizMaster adopts a distinctive **3D tactile extrusion effect** (Kahoot-style), giving buttons and cards physical depth:

```css
/* 3D Tactile Button Base */
.btn {
  border-radius: 8px;
  font-weight: 800;
  text-transform: uppercase;
  transition: all 120ms ease;
  user-select: none;
}
.btn-purple {
  background: var(--kahoot-purple);
  color: #ffffff;
  box-shadow: 0 4px 0 var(--kahoot-purple-dark);
}
.btn-purple:active {
  transform: translateY(2px);
  box-shadow: 0 2px 0 var(--kahoot-purple-dark);
}
.btn-light {
  background: #f2f2f2;
  color: #333333;
  box-shadow: 0 4px 0 #cccccc;
}
.btn-secondary {
  background: rgba(255, 255, 255, 0.15);
  color: #ffffff;
  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.2);
}
```

---

## 3. Page-by-Page Information Architecture & Layouts

```
QuizMaster Platform
├── / (Home & Player Join)
│   ├── Left Col: PIN, Name, NIM, Join & Admin Quick Links
│   └── Right Col: Avatar Studio (Spotlight, Randomizer, Tabbed Grid)
│
├── /quiz/[code] (Live Game Engine)
│   ├── State: "waiting" (Live Lobby with synchronized emoji reactions)
│   ├── State: "playing" (Countdown, Question, 4-Color Answer Grid)
│   ├── State: "result" (Instant Correct/Wrong popup, Streak combo banner)
│   └── State: "finished" (Quiz completed celebration & redirect)
│
├── /quiz/[code]/results (Podium & Leaderboard)
│   ├── Top 3 Podium (Gold, Silver, Bronze badges)
│   ├── Full Participant Rank Table with score progression bars
│   └── Question Breakdown Review (User answer vs Correct answer)
│
├── /admin (Dashboard)
│   ├── Admin Password Gate / Auth Card
│   ├── Total Quiz Stats Counters
│   └── Quiz Management Cards (Invite PIN, Status, Action buttons)
│
├── /admin/create & /admin/edit/[id] (Quiz Creator Studio)
│   ├── Left Column (Sticky Sidebar): Quiz details, Time per question, Background Music Picker
│   └── Right Column (Main Editor): Aiken format text importer, XML importer, Question cards list
│
└── /admin/quiz/[id] (Live Room Host Screen)
    ├── Quiz Status Banner (Draft / Aktif / Selesai) & Controls
    ├── Audio Controller (Background Music sync & mute toggle)
    ├── Live Participant Roster with real-time score change flash animations
    └── Real-time Floating Reactions monitor
```

---

## 4. Key UI Components Specification

### 4.1 Avatar Studio Picker (DiceBear v10)
- **Component File:** `src/app/page.js` & `src/lib/avatar.js`
- **Layout:**
  1. **Header:** Title "Pilih Avatar" with dynamic count label.
  2. **Active Spotlight Card:** Circular gradient preview ring (44px), avatar name, and a modern "Acak" (Randomize) pill button.
  3. **Category Scroll Tabs:** Horizontally scrollable pill tabs with navigation arrows (`Semua`, `Pixelbot`, `Gaze`, `Moods`, `Thumbs`, `Face`, `Sprouts`, `Clay`, `Voxel Bot`, `Critters`).
  4. **Avatar Tiles Grid:** Compact grid (`repeat(auto-fill, minmax(42px, 1fr))`) with hover lift effect and checkmark badge on selected item.
  5. **Controlled Height:** Fixed `max-height: 230px` with vertical scroll (`overflow-y: auto`) to ensure zero screen overflow on standard 768px laptop viewports.

### 4.2 Interactive Waiting Lobby (`/quiz/[code]` -> `waiting`)
- **Card Container:** Centered white card with rounded-2xl edges and gentle drop shadow.
- **Player Roster:** Flowing badge chips with player avatar, name, and glowing "Kamu" (You) pill tag for the active player.
- **Reaction Toolbar:** Floating horizontal pill bar containing 6 live reaction emojis: `👏`, `🔥`, `❤️`, `🎉`, `😎`, `🚀`.
- **Live Reaction Stream:** Real-time synchronized floating emojis that animate upwards across the entire screen using CSS `@keyframes floatUp` and auto-cleanup from Firestore after 4s.

### 4.3 4-Color Answer Block Matrix (`/quiz/[code]` -> `playing`)
- **Layout:** 2x2 grid filling the viewport.
- **Items:**
  - Red (Triangle ▲)
  - Blue (Diamond ◆)
  - Yellow (Circle ●)
  - Green (Square ■)
- **Interaction Feedback:**
  - On hover: Scale `1.02` with amplified 3D shadow.
  - On click: Immediate press animation, procedural `sfx.playSelect()` audio, disabled state with selected border indicator.

### 4.4 Answer Result Popup & Streak Multiplier
- **Modal Display:** Full-screen backdrop overlay with centered animated popup.
- **Correct State:** Green checkmark icon, "BENAR!" headline, point breakdown with procedural fanfare audio (`sfx.playCorrect()`).
- **Streak Fire Badge:** For 2+ consecutive correct answers, displays animated gradient badge: `🔥 STREAK x3 (+500 BONUS)` with `sfx.playStreak()`.
- **Wrong State:** Red cross icon, "KURANG TEPAT" headline, encouraging feedback.

### 4.5 Leaderboard & Podium (`/quiz/[code]/results`)
- **Podium Section:** Top 3 winners featured prominently with gold (#D89E00), silver (#7B8794), and bronze (#CD7F32) badge rings and avatar spotlight.
- **Full Rankings Table:** Smooth animated bars showing score proportion relative to the top scorer, with rank change flash animations.
- **Review Accordion:** Collapsible questions list with color indicators (green for user correct, red for incorrect) showing full question review.

### 4.6 Quiz Studio Creator (`/admin/create` & `/admin/edit/[id]`)
- **Header:** High-contrast crisp white `#ffffff` title and subtitle with `btn-secondary` back button.
- **Left Sidebar (380px sticky):**
  - Card 1: Quiz Title, Description, Seconds per Question input.
  - Card 2: Background Music selector (Online Presets with instant preview audio, Local files, Custom URL).
  - Card 3: Action buttons (Primary "Simpan Quiz" and clean "Batal" button).
- **Right Main Area:**
  - Import Bar: Aiken format quick-importer (textarea parser for `A.`, `B.`, `ANSWER: X`) and XML file uploader.
  - Question Cards List: Card with question prompt, 4 answer inputs with colored badges (A, B, C, D), correct answer radio selector, points input, and delete question action.
  - Dashed "+ Tambah Pertanyaan" button styled for dark purple background visibility.

---

## 5. Anti-Cheat & Security UI Features

1. **Tab Blur / Focus Loss Detector:**
   - Detects `document.hidden` or `window.onblur`.
   - Displays a floating red warning banner: *"⚠️ PERINGATAN: Jangan berpindah tab selama quiz berlangsung!"*.
   - Plays alert sound (`sfx.playAlert()`) and records blur violations to the player document.
2. **Text Protection:**
   - CSS `user-select: none` across questions and answers to inhibit copy-pasting into search engines.
   - Context menu and print blocking (`@media print { body { display: none !important; } }`).

---

## 6. Redesign Recommendations for Stitch AI

When refining and elevating the UI with Stitch AI, prioritize the following enhancements:

### 1. Modern Glassmorphism & Depth
- Introduce subtle glassmorphic backdrop filters (`backdrop-filter: blur(12px)`) for the lobby cards and navbar.
- Add radial background light orbs behind the cards to make the deep royal purple `#46178F` feel ambient and state-of-the-art.

### 2. High-DPI Visual Assets
- Replace standard SVG geometric symbols in answer blocks with modern 3D rendered or neon illuminated shapes.
- Enhance the streak badge with an animated gradient border and pulsating embers effect.

### 3. Micro-Interactions & Particle Effects
- Integrate canvas-based confetti bursts upon finishing in 1st/2nd/3rd place.
- Add a smooth spring animation (`framer-motion` or cubic-bezier) when switching leaderboard ranks.

### 4. Compact Viewport Optimization
- Ensure every screen on the player flow (Join -> Waiting -> Question -> Results) fits within `100vh` without requiring page-level scrollbars on mobile and desktop alike.

### 5. Sound & Haptic Settings
- Provide a persistent floating sound toggle (Music volume slider & SFX mute toggle) accessible in all active states.
