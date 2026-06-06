# Volt — Frontend Design Reference

This is the locked-in design direction for the Volt frontend. Treat it as the source of truth; if a decision here conflicts with new code, fix the code or update this doc deliberately.

Static visual reference: `frontend-volt/mockups.html` (open directly in a browser).

---

## 1. Visual Principles

- **Black canvas, surgical neon.** Whoop / Nike Training Club / Strava Premium — not Fitbit, not MyFitnessPal.
- **Numbers are the UI.** Hero stats use display font at 48–96px. Labels stay 11–13px uppercase tracked.
- **One accent per screen.** Workouts → volt (green), nutrition → sky (blue), PRs/destructive → blaze (red). Never mix two accents inside the same card.
- **Surface elevation by lightness, not shadow.** `bg-ink-950` page → `bg-ink-900` card → `bg-ink-850/800` inset. Shadows only for active/pressed/hero states.
- **Rounded but not soft.** `rounded-2xl` on cards, `rounded-full` on pills, `rounded-xl` on inputs/buttons. Avoid `rounded-lg`.
- **Borders are hairlines.** `border-white/5` for separators. Never use heavy zinc borders on OLED black.
- **Mobile-first PWA.** Bottom nav on `<md`, sidebar on `≥md`. Center bottom-tab is the elevated "Log" verb.

### Quality Patterns (premium / human checklist)

The target feel is **premium, human, high-quality** — not generated. "Premium" isn't a vibe to chase; it's the result of applying these concrete, reviewable patterns. A PR can be failed against any of them:

1. **One number dominates.** Each screen has a single hero figure at display scale (`text-display`/`text-stat`); everything else is deliberately smaller. If three things compete for the eye, none of them win.
2. **Values animate on mount.** Rings and progress bars ease from 0 → real value on load (drive with a `mounted` flag flipped in `requestAnimationFrame`). Static = lifeless.
3. **Lists are one grouped surface.** Render rows as a single hairline-divided container (`space-y-px overflow-hidden rounded-2xl border border-white/5`), not a stack of individually-bordered cards — competing hairlines read as noise on OLED black.
4. **Relative dates.** "Today" / "Yesterday" / "May 19", not "Monday, May 19, 2026". Use `formatRelativeDate`.
5. **Styling lives in the variant.** Hover/active/cursor states belong in the component (`Button`, `Card`), never re-pasted per page. Repeated utility strings across pages are a generated-code tell and a DRY violation.
6. **Accent restraint.** The screen accent appears in exactly three places: the primary CTA, the one hero stat, and progress fills. Demote everything else (e.g. pagination) to `ghost`/`bone` so the hero stays special.
7. **Handle the empty/edge states.** Null logs, over-goal, zero-meal days, single vs. plural — covering these is itself a quality signal; blank gaps and "1 meals" are tells.

## 2. Color Palette (locked)

Defined in `src/index.css` via Tailwind v4 `@theme`. Same tokens duplicated in `mockups.html` for the CDN preview environment — keep them in sync.

| Token | Hex | Use |
|---|---|---|
| `ink-950` | `#0A0A0B` | Page background |
| `ink-900` | `#111113` | Card background |
| `ink-850` | `#161618` | Input / inset |
| `ink-800` | `#1A1A1D` | Hover surface |
| `ink-700` | `#26262A` | Pressed / divider-strong |
| `bone-50` | `#FAFAFA` | Primary text |
| `bone-300` | `#A1A1AA` | Secondary text |
| `bone-500` | `#71717A` | Muted text / captions |
| `volt-500` | `#C6FF3D` | Workouts, progress, success, primary CTA |
| `blaze-500` | `#F31E4B` | PRs, intensity, destructive, warnings |
| `sky-500` | `#2E8BFF` | Nutrition, recovery, analytics |

**Accent rule:** an accent appears on (a) primary CTA, (b) one hero stat, (c) progress fills. Everything else stays bone/ink.

## 3. Typography

- **Display:** Inter Tight (700/800) — stat numbers, page titles.
- **Body:** Inter (400/500/600).
- **Mono:** JetBrains Mono — only for numeric tables (sets, weights, macro grams) so columns align.

| Class | Size / weight | Use |
|---|---|---|
| `text-display` | clamp(2.75rem → 4rem) / 700 / -0.03em | Hero stat |
| `text-stat` | 2rem / 700 / -0.02em | Card stat |
| `text-h1` | 28px / 700 | Page title |
| `text-h2` | 20px / 600 | Card title |
| `text-body` | 15px / 400 | Default |
| `text-caption` | 11px / 500 / uppercase / 0.08em | Labels |

## 4. Layout

- **Mobile (<768px):** 56px top app bar, 16px gutter, 64px bottom nav with safe-area padding.
- **Desktop (≥768px):** 240px sticky sidebar (collapses to 72px icon-rail at `lg`), max-w-5xl content, 32px gutter, no bottom nav.
- Sidebar and bottom-nav share `navItems.tsx` — single source of truth.

## 5. Navigation & Routes

```
Public                 App (Clerk-protected)
─ /                    ─ /app/dashboard
─ /login               ─ /app/workouts
─ /register            ─ /app/workouts/:planId
                       ─ /app/log
                       ─ /app/exercises
                       ─ /app/nutrition
                       ─ /app/nutrition/:logId
                       ─ /app/weight
                       ─ /app/profile
```

Bottom-tab order: **Home · Workouts · Log (center, raised, volt) · Nutrition · Weight**.

## 6. Component Inventory

**Primitives** (`src/components/ui/`)
- `Button` — variants `primary | danger | sky | ghost | outline`, sizes `sm | md | lg`.
- `Card` + `CardHeader` — `interactive`, `inset`, `accent` (volt/blaze/sky).
- `Stat` — label + value + optional unit, delta, accent, size.
- `Input` / `Textarea` — labeled fields, hint, invalid state.
- `Badge` — `volt | blaze | sky | neutral`.
- `ProgressRing` — SVG ring for macros / volume.

**Layout** (`src/components/layout/`)
- `AppLayout` — Outlet shell with `Sidebar` + `BottomNav`.
- `AuthLayout` — split-screen with branded left panel.
- `Sidebar`, `BottomNav` — driven by shared `navItems`.

**Domain components (planned, not built)**
- `WorkoutPlanCard`, `WorkoutDayRow`, `ExercisePickerSheet`
- `SetLogger`, `RestTimer`
- `MealCard`, `MacroBar`, `CalorieRing`
- `WeightChart`, `ExerciseListItem`

## 7. UX Flows (locked)

**Create a workout plan:** `/app/workouts` → `+ New Plan` (bottom sheet) → `/app/workouts/:planId` builder with empty day cards → tap day → `+ Add exercise` opens picker → auto-saves (no Save button).

**Log a workout:** Dashboard "Today" card → `/app/log?planDayId=…` → big number inputs per set, ✓ on right → all sets complete reveals Rest Timer sheet → PR detection triggers blaze flash + haptic → `Finish` → summary (no confetti — show stats).

**Nutrition log:** No explicit "create log" — log is auto-created on first meal-add for that calendar day. `/app/nutrition` shows today + 6 past days. Tap → `/app/nutrition/:logId` → `+ Meal` opens sheet (name, type pills, kcal + macro steppers).

**Weight:** Hero current weight, 7d delta chip, range tabs (7/30/90/all), line chart, paginated entries. FAB `+` for quick add (weight, date default today, optional note).

## 8. Build Order

1. ✅ Tokens + `@theme` in `index.css`
2. ✅ Shell (`AppLayout`, `Sidebar`, `BottomNav`, `AuthLayout`)
3. ✅ Primitives (`Button`, `Card`, `Stat`, `Input`, `Badge`, `ProgressRing`)
4. ⬜ Wire `App.tsx` to new routes; stub pages with mock data
5. ⬜ Dashboard composition (first Learn-by-Doing candidate)
6. ⬜ Workout Logging (`SetLogger` interaction — second LbD candidate)
7. ⬜ Plan Builder → Plans list → Nutrition → Weight
8. ⬜ Auth (Clerk components themed to match)
9. ⬜ Landing page

## 9. Decisions Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-04-26 | Mobile-first PWA, bottom-nav 5-item with elevated center | Primary verb of the app is "log" — center tab makes that visually unmistakable. |
| 2026-04-26 | One accent per screen | Avoids the "Christmas tree" effect; keeps each surface unambiguously themed by domain. |
| 2026-04-26 | Numbers use display font, never body font | Reinforces "numbers are the UI" — also visually separates data from labels at a glance. |
| 2026-04-26 | No `tailwind.config.js`; tokens live in `index.css` `@theme` | Tailwind v4 idiom; reduces config surface area. |
| 2026-04-26 | Static `mockups.html` precedes React port | Lets us iterate on look without wrestling component APIs first. Will be deleted once screens are in React. |
| 2026-04-26 | Nutrition log auto-creates on first meal | Removes a meaningless step — users think in meals, not "log objects". |
| 2026-04-29 | Landing page is the exception to "one accent per screen" | Marketing surface, not an app screen — showcases all three domain accents (volt/sky/blaze) so each is advertised once. Rule still holds for every authenticated screen. |
| 2026-05-20 | Retuned `sky` → Electric Azure (`#2E8BFF`) and `blaze` → Crimson Rose (`#F31E4B`) | Old values were iOS system cyan/red — pale and "default OS" on OLED black. Saturated azure reads more "tech premium"; crimson reads "PR/intensity" over "error dialog". `volt` unchanged. |
| 2026-05-20 | Added "Quality Patterns" checklist to §1 | Codifies the concrete, reviewable patterns behind the "premium/human" feel (hierarchy, mount animation, grouped lists, accent restraint, edge-state handling) so it's falsifiable in review, not a vibe. Distilled from the nutrition-pages polish pass. |
| 2026-06-05 | Workout detail shows exercises inline (accordion of cards, sets as a mono table); set add/edit opens a `SetLogger` sheet — exercises are **not** clickable routes | Mirrors nutrition (`NutritionLog` edits meals in a sheet, never navigates). Logging is high-frequency/in-the-moment, so per-exercise navigation is the wrong tax; sets are already a flat API resource (`PATCH/DELETE /sets/:setId`), which pairs with inline editing. Per-exercise history/PRs, if added, is also a sheet — not a route. |

Append new rows when a non-trivial decision is made — short reason, not a essay.
