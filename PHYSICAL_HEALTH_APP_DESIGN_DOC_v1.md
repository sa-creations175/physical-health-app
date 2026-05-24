# Physical Health App — Design Decisions v1

A living document capturing the design philosophy, architecture, and feature decisions for the Physical Health app — part of Silas's Personal OS suite.

Last updated: May 24, 2026 (v2.3)

**What changed in v2.3 (May 24, 2026):** Build 2.6 — mobility tracking, cardio routing, iOS safe-area, and a strength QoL touch. (1) **Mobility / flexibility** joins the daily bundle as a fourth component: a "Flex / Mobility" row with a ±5-minute stepper + tap-to-type, a green check once the day clears the threshold, a "Mobility: X / N days" weekly count, and a collapsible **Links** section for saved follow-along videos (open in a new tab, add, delete). Any mobility minutes make a day qualifying; mobility folds into the grid-intensity percentage. (2) The **cardio card taps straight to `/log/cardio`** (matching the lifting tiles); the expand-in-place list is gone. (3) **iOS safe-area** — content clears the notch/home indicator and the green header bleeds behind the status bar. (4) Adding **Calf Raises** to a session pre-fills its first set from the session's most-recent completed **Squats** set. Schema bumps to v11 (mobility_minutes on `bundle_logs`; three mobility fields on `user_preferences`). Service worker cache bumped v2 → v3. Adds §Build 2.6 session log and a "Mobility" note to §Nutrition / daily bundle.

**What changed in v2.2 (May 24, 2026):** Build 2.5 — dashboard reorder + section customization. The dashboard sections (lifting / cardio / nutrition / no-delivery streak / daily bundle / Apple Watch) can now be reordered with up/down arrow buttons, renamed inline, and shown/hidden — all from a per-user reorder mode entered via a "Reorder" pill in the header or a full-width "Reorder sections" button at the bottom of the scroll. Order + per-section `{ label, visible }` config persist on `user_preferences` as JSON strings. Section header labels now render from that config (not hardcoded), so renames show immediately. At least one section must stay visible. Schema bumps to v10 (two new `user_preferences` columns, backfilled on upgrade). Adds §Build 2.5 session log and a "Dashboard customization" subsection to §Dashboard design. New `green-mid` (#1a6b4a) accent token + `shadow-card` elevation.

**What changed in v2.1 (May 24, 2026):** Visual system overhaul. (1) Dashboard imagery — a deep-green hero band behind the header (day / date / streak) with decorative concentric arc rings (white, ~9% opacity, right-clipped), plus a 28px accent glyph at the top-right of every pillar (dumbbell / pulse / leaf / flame / bolt / heart-pulse; lotus reserved for the future mobility card). All inline SVG, no icon-library dependency. (2) **Light theme** — the app flips from the dark charcoal base to a near-white ground (matches Finance OS): background `#f5f7f5`, white cards (`#ffffff`), dark ink text (`#0d1f18`), readable green section labels (`#157A5C`). Green CTAs keep white text; the deep-green hero band remains a colored banner. (3) Type — display headings now use **Bricolage Grotesque**, body/UI uses **DM Sans** (loaded via Google Fonts). Updates §Visual identity (palette + typography). No schema or data-layer changes (still Dexie v9).

**What changed in v2.0 (May 23, 2026):** Build 2.4 — daily bundle (calisthenics) tracker shipped as a second Nutrition-pillar dashboard card, sibling to the no-delivery streak. New `bundle_logs` store (one row per user per day, created lazily the first time any exercise is logged that date) tracks three exercises independently — push-ups, ab rolls, calf raises. Card shows a "weeks on target" streak ("Best: Nwk"), a Sun→Sat intensity grid (none/low/medium/full color ramp by combined progress vs daily targets), three weekly progress bars (total vs daily target × 4), an "N of 4 days this week" tracker, and a today-only log section with superset-sized −/+ buttons and tap-to-type direct entry per exercise. Locked product decisions: per-exercise independent logging (not a bundle requirement), any reps of anything = a qualifying day, consecutive weeks with ≥ 4 qualifying days = the streak, increments + targets editable in Settings. Schema bumps to v9: new `bundle_logs` store, plus six `user_preferences` fields (three daily targets 100/60/120, three increments 25/15/30) backfilled on the existing row. Adds §Build 2.4 session log and a "Daily bundle tracker" subsection inside §Nutrition tracker design.

**What changed in v1.9 (May 19, 2026):** Build 2.3 — no-delivery streak tracker shipped as a dedicated Nutrition-pillar card on the dashboard. New `delivery_days` store (one row per user per day, present only when the user actively marks the day). Card shows current streak ("X days"), all-time best ("Best: Y days"), and a Sun→Sat grid of 44px tappable squares; each square cycles unmarked → clean (green ✓) → ordered (red ✗) → unmarked on tap. Streak math walks backward from today with the same "today forgiveness" rule the workout streak uses. Slip definition is locked to delivery orders only — eating out socially doesn't count. Schema bumps to v8 (new store, no upgrade backfill). Adds §Build 2.3 session log and a "No-delivery streak" subsection inside §Nutrition tracker design.

**What changed in v1.8 (May 19, 2026):** Build 2.2 — strength logger gets its in-session ergonomics pass. Drafts (sessions with `feel_rating` null) now surface as a Resume badge on the type-select tile, tagged with the start time; a "Discard session" link in the active screen cascades sets → links → session for clean exit. Session date is editable on both the type-select screen (defaults today) and the completion screen (in case retro is decided last). Exercises in an active session can be deleted (with confirm) and drag-reordered (HTML5 DnD, ☰ handle). Each exercise carries a free-form note that surfaces on the completion summary. The dashboard lifting tiles now tap-to-route (`/log/strength?type=X`) instead of expanding an in-place detail panel — that panel is removed. The cardio card swaps total minutes for **qualifying** minutes ("X min this week") so the stat tracks the same definition of "counts" as the headline. The in-session progressive-overload suggestion is removed entirely — no prompt, no +5lb pre-fill, no indicator; PR detection still surfaces quietly in the exercise library sparkline. Schema bumps to v7: `session_exercises.notes` non-indexed column, backfilled to null on upgrade. Adds §Build 2.2 session log with the full commit trail, decisions, and schema delta.

**What changed in v1.7 (May 3, 2026):** Build 2.1 polish session — 11 commits covering principles-doc untrack, type-select tap-to-route parity, three iterations on the cardio time picker (the third one cracked it), date/time visual treatment to the dark-block style, paired Duration + Intensity side-by-side row, distance for distance-eligible cardio types (Run / Bike / Walk / Hike / Row), and Settings inline save confirmation. Schema bumped to v6: v5 was an index-only hotfix (added `name` to `cardio_types`) and v6 added `distance_miles` to `cardio_logs` with backfill. Adds §Build 2.1 polish session log with the full commit trail, decisions, schema deltas, UI/UX changes, and follow-ups.

**What changed in v1.6 (May 2, 2026):** Phase 2, Build 2.1 complete — cardio logger end-to-end, dashboard cardio card live-data-bound, Settings extended with the cardio threshold. Adds §Build 2.1 session log with the 7-commit trail, decisions log, schema additions, and follow-ups carried forward. Schema bumped to v4: new `cardio_types` store seeded with 10 starter activities, `cardio_logs` reshaped (session_id nullable, `cardio_type_id` FK, precise `started_at` ISO timestamp, `notes` nullable, indexed on `started_at` instead of `session_id`), `user_preferences` gains `cardio_threshold_minutes`. HealthKit + repeat-last-session + resume-in-progress strength remain Phase 2 follow-ups; this build is foundation for them.

**What changed in v1.5 (April 30, 2026):** Phase 1 complete. Adds §Phase 1 complete — checkpoint with the full 31-commit trail (scaffold → close), grouped done-vs-deferred summary, the small follow-ups carried into Phase 2, and current build state. Schema bumped to v3 with the new `user_preferences` table; the design-philosophy body is unchanged. Phase 1 ships an installable, offline-capable PWA at 382 KB JS / 117 KB gzipped.

**What changed in v1.4 (April 28, 2026):** End-of-session checkpoint covering build days 1–2. Adds §Build session log — days 1–2 with the full commit trail, decisions log, and current Phase 1 status. Schema gains two columns on `sets` (`set_type`, `duration_seconds`) so timed efforts log natively alongside reps. No design-philosophy changes — this version primarily catches the doc up to what's already built.

**What changed in v1.3 (April 28, 2026):** Lifting type display labels unified to the `Body`-suffixed pattern across all surfaces — `UPPER BODY`, `LOWER BODY`, `FULL BODY`. v1.2 had landed `LOWER` (matching `UPPER` and `FULL BODY`); v1.3 promotes both `UPPER` and `LOWER` to the longer form so the three labels read as a consistent set. Data layer enums stay `upper / lower / full_body`. Updated §Dashboard design accordingly.

**What changed in v1.2 (April 28, 2026):** Dashboard lifting card display label changed from `LEGS` to `LOWER` (later promoted to `LOWER BODY` in v1.3). Data layer enum stays `lower`.

**What changed in v1.1 (April 27, 2026):** Phase 1 scope locked after design review. Resolutions baked into the doc:
- Repo: `git init` + scaffold now, first commit before any feature code; no GitHub remote until Phase 6.
- Display label `LOWER BODY` maps to schema enum `lower`. UI uses display labels, data layer always uses the enum. (Was `LEGS` in v1.1; renamed to `LOWER` in v1.2; promoted to `LOWER BODY` in v1.3.)
- `LOCAL_USER_ID = 'local-user-001'` constant carried in every row from Phase 1, so Phase 6 Supabase migration is purely additive.
- `prompts` table + thin orchestrator module ship in Phase 1 with zero registered triggers. Phases 4/5 plug in.
- PR auto-detection logic is in Phase 1, surfaced as a quiet inline indicator on the exercise history view.
- Hardcoded weekly + daily targets, editable via a minimal Settings page in Phase 1.
- Streak pill counts consecutive days with at least one strength OR cardio session. Mobility / nutrition / supplements alone don't count.
- Phase 1 ships four routes: Dashboard, Log Session, Exercise Library, Settings.

---

## Executive summary

This app is the physical health domain of a Personal OS suite. It answers the question: "How am I doing physically?" It is not a generic fitness tracker. It is a personal accountability system built around five pillars, designed to be used at the gym, in the kitchen, and everywhere in between — primarily on a phone.

The app is built as a standalone PWA that integrates into the eventual Personal OS meta-dashboard. It shares the same backend (Supabase), auth, and architectural principles as the Musical Journey App.

---

## Who this is for

Silas. 8 years of lifting experience. Flexible split (upper / lower / full body). Serious about body composition, community, and long-term internal health. Goals are directional and values-driven — not just numbers. The app must reflect and reinforce the identity: "I am a strong, fit and healthy man who consistently cares for his body."

---

## The five pillars

Every feature, metric, and screen maps to one of these five domains:

| Pillar | Color identity | Primary metric |
|---|---|---|
| Strength | Deep green (#0F6E56) | Sessions by type + progressive overload |
| Cardio | Teal accent | Sessions per week vs target |
| Mobility | Amber | Freshness (days since last practice) |
| Nutrition | Blue (#185FA5) | Daily protein / water / veg / supplements |
| Health check-ins | Purple | Freshness (days since last visit) |

---

## Visual identity

### Color palette

Light theme (v2.1, matches Finance OS). Was a dark charcoal base through v2.0.

| Role | Value | Usage |
|---|---|---|
| Background | `#f5f7f5` | App base — near-white, no blue cast |
| Card surface | `#ffffff` | All cards, panels, expandable sections |
| Card border | `#e3e8e4` | Subtle separation between cards |
| Primary text | `#0d1f18` | All primary numbers and headings on cards |
| Secondary text | `#5f6b65` | Labels, sublabels inside cards |
| Hint text | `#6b756e` | Date, week number, small hints |
| Dividers | `#e3e8e4` / `#e7ece8` | Horizontal rules / progress-bar tracks |
| Recessed surface | `#eef1ef` | Inputs, secondary buttons, unlogged grid cells |
| Green primary | `#0F6E56` | CTA buttons (white text), progress bars, accents |
| Green label | `#157A5C` | Section labels on white cards (readable green) |
| Green text light | `#9FE1CB` | Text on green / deep surfaces (e.g. hero band) |
| Green dark | `#3B6D11` | Progress bar fills, sparkline dots |
| Blue accent | `#185FA5` | Water tracking bar |
| Red / alert | `#E24B4A` | Stale indicators, missed targets |

### Typography

Display headings (`h1`, `h2`) use **Bricolage Grotesque**; body and UI text use **DM Sans**. Both loaded via Google Fonts, with `system-ui` fallbacks. (Was system sans-serif through v2.0.)

- Day / header: 22px, weight 500, `#f0f0f0`
- Date subheader: 12px, weight 400, `#777`
- Section micro-label: 9px, weight 500, letter-spacing 0.06em, `#5DCAA5` (on cards) or `#777` (on background)
- Stat number: 19–22px, weight 500, `#f0f0f0`
- Stat denominator: 12px, weight 400, `#777`
- Body / row label: 12–13px, weight 400, `#aaa` or `#ddd`
- Body value: 12–13px, weight 500, `#f0f0f0`

### Key aesthetic rules

- Near-white base, white card surfaces, dark ink text (light theme, v2.1) — the deep-green hero band is the one bold colored surface
- Single accent color family: deep green does all the work
- Red is reserved exclusively for truth-honoring alerts (stale, missed, behind)
- Blue used only for water tracking — one semantic meaning, used consistently
- No gradients, no shadows, no glow effects
- Breathing room between sections via dividers, not padding compression
- All-caps micro-labels (9px, letter-spacing 0.06em) for section headers inside cards

---

## Dashboard design

The dashboard is the philosophical center. Opens the app. Answers: "How am I doing today?"

### Header
Deep-green hero band (v2.1) with decorative concentric arc rings behind the text (white, ~9% opacity, clipped to the right edge).
- Day name (large, white) — Bricolage Grotesque
- Date + week number (small, mint `#9FE1CB`)
- Streak pill (translucent-white background, white text) — top right. Counts consecutive days with at least one strength OR cardio session logged. Mobility, nutrition, and supplements alone do not contribute to the streak.

### Section: This week — lifting
Three tappable stat cards side by side:
- LOWER BODY — `x / target` sessions
- UPPER BODY — `x / target` sessions
- FULL BODY — `x / target` (labeled "optional")

Display labels (`LOWER BODY`, `UPPER BODY`, `FULL BODY`) map to schema enum values (`lower`, `upper`, `full_body`). UI surfaces always render display labels; the data layer always uses the enum (`upper | lower | full_body | cardio | mobility`).

Tap any card → expands below with:
- 7-day dot row (green dot = session logged, grey = rest day)
- Last session summary line (e.g. "Tue — squats, RDLs, leg press")

### Section: This week — cardio
Single wide card showing:
- Session count vs weekly target (e.g. "3 of 5 target")
- "X more to hit your week" subline
- Session type pills on the right (done = green, remaining = grey dash)
- Progress bar (green fill, grey track)

Tap card → expands with 7-day dot row + session detail line

### Section: Today — nutrition
Card with four rows:
- Protein: `Xg / target` with mini progress bar (green)
- Water: `X / 8 glasses` with mini progress bar (blue)
- Vegetables: `X / 3 servings` with mini progress bar (lighter green)
- Supplements: pill row — done (green bg, mint text), not done (grey bg, grey text)

Supplements are tappable — one tap toggles done/not done for the day.

### Section: Today — Apple Watch
Three small stat cards side by side (pulled via HealthKit):
- STEPS — value + "of 10k" + mini progress bar
- ACTIVE CAL — value + "of 600" + mini progress bar
- REST HR — value + "bpm · good / elevated / low" label

### CTA row
- Primary: "Log session" (full green button)
- Secondary: "Log nutrition" (grey card button)

### Dashboard customization (added Build 2.5)

The dashboard is no longer a fixed stack — the user controls the order, names, and visibility of each section. Entered via a "Reorder" pill at the top-right of the hero header, or a full-width "Reorder sections" button at the bottom of the scroll. Locked decisions:

- **Reorder mode is local UI state, not a route.** Entering/leaving doesn't navigate — the dashboard swaps its normal content for a list of reorder cards in place. A mint banner ("Use ↑ ↓ to reorder — tap ✓ to save") with a green Done (✓) button sits below the header.
- **Three controls per section: reorder arrows, rename, show/hide.** Up/down arrow buttons (44×44, green-mid; dimmed + disabled at the list ends) move a section one position per tap; a pencil opens an inline underline-only input to rename; an eye toggles visibility (green open-eye = visible, dim eye-off = hidden). Hidden sections render at 50% opacity with a struck-through label. (Reorder was HTML5 drag-and-drop in the initial Build 2.5 cut; swapped to arrow buttons same day because DnD is unreliable on iOS Safari.)
- **Every change persists immediately — Done just exits.** Reorder writes the new order; eye/pencil write the section config. There is no separate save step; ✓ only leaves the mode. Rationale: the reorder view *is* the editor, and a phone user shouldn't lose edits by forgetting to "save."
- **At least one section must stay visible.** Hiding the last visible section is refused with a brief inline message ("At least one section must be visible") — an empty dashboard is never a valid state.
- **Labels render from config, not code.** Each section header reads its label from the stored config, so a rename appears instantly on the live dashboard. Defaults are Title Case; the on-card micro-label uppercases them, so the casing only shows on the reorder card (Bricolage Grotesque).
- **Storage is JSON-on-prefs, not a new table.** `dashboard_section_order` (array of keys) and `dashboard_section_config` (`{ key: { label, visible } }`) live as JSON strings on the single `user_preferences` row — parsed/serialized by `useDashboardConfig`. Defensive parsing drops unknown keys and backfills missing ones, so a future section appears automatically and a malformed blob can't break render.

---

## Strength logger design

Accessed via "Log session" button or bottom nav.

### Session start screen
User selects session type:
- Upper body
- Lower body
- Full body
- (Type is remembered and pre-selected based on what's due next)

### Exercise logging (gym-usable)
- Exercise name (searchable from personal library + add new)
- Sets logged as rows: weight · reps · done checkbox
- "Add set" button copies previous set's weight/reps
- Swipe left to delete a set
- "Add exercise" adds next exercise below

### Progressive overload signal
After 2–3 consecutive sessions hitting all target reps for an exercise, a quiet prompt appears:
"You've hit your bench target 3 sessions running. Ready to add weight?"
Non-blocking. User can dismiss or act.

### Session completion
- Summary card: exercises logged, total sets, total volume
- Session type confirmation
- Subjective feel rating: Flying / Cruising / Crawling (motion metaphor, not clinical)
- Notes field (optional)

### Exercise library
- Personal library of exercises (user-built over time)
- Starter set seeded on first launch
- Per-exercise history: last weight × reps, trend over last 8 sessions
- PR tracking (auto-detected, surfaced quietly)

---

## Cardio logger design

Simple and fast — designed for logging during or immediately after.

### Log screen
- Cardio type (searchable: stairmaster, run, bike, row, elliptical, swim, walk, etc.)
- Duration (minutes — tap to type or +/- nudge buttons)
- Intensity: Low / Moderate / High (maps to Zone 2 / mixed / HIIT)
- Notes (optional)

### Weekly target
User sets weekly session target (e.g. 4–6 sessions) in settings.
Dashboard shows progress vs target — not total minutes.

---

## Mobility logger design

Simplest of the five pillars to log — highest value for freshness tracking.

### Log screen
- Practice type: stretching / yoga / foam rolling / dynamic warmup / breathwork / other
- Duration (minutes)
- Body area focus (multi-select): upper / lower / full body / hips / spine / shoulders
- Notes (optional)

### Freshness tracking
Shared infrastructure with Personal OS:
- 0–3 days: fresh (green)
- 4–10 days: getting stale (amber)
- 11–20 days: stale (orange)
- 21+ days: very stale (red)

Dashboard surface: if mobility is stale, the pillar balance bar shows red + "stale — X days" label.

---

## Nutrition tracker design

Philosophy: honest pattern awareness, not obsessive logging. Low friction, high signal.

### Daily anchor (always visible on dashboard)

**Protein:** User sets daily target (grams). Logs protein intake in grams — either by meal description (AI estimates) or direct entry. Progress bar on dashboard.

**Water:** Target 8 glasses/day. Tap to log each glass. Progress shown on dashboard.

**Vegetables:** Target 3 servings/day. Tap to log each serving. Simple counter.

**Supplements:** User configures their supplement list once in settings (e.g. Creatine, Vitamin D, Fish Oil, Magnesium). Each day, tap each pill to mark taken. Resets at midnight.

### AI macro estimator (Phase 3 feature)
Describe a meal in plain language. AI estimates protein / carbs / fat / calories.
Used to feed protein total — not displayed as a full macro breakdown on the dashboard.
Optional deep-dive mode for cut phases.

### What is NOT on the dashboard
- Calories total
- Carbs / fat breakdown
- Meal-by-meal log

These live in a nutrition detail screen, accessible but not front-and-center.

### No-delivery streak (added Build 2.3)

A separate Nutrition-pillar card on the dashboard tracking the daily habit of skipping food delivery. Locked decisions:

- **Own card, sibling to the nutrition shell.** Not a sub-metric. The nutrition card stays focused on macros + supplements; the streak card is the habit / behavior surface. Both live in the Nutrition pillar.
- **Slip definition is delivery-only.** Eating out socially (restaurants, dinner with friends) does NOT count as a slip. Only delivery orders (UberEats, DoorDash, etc.) qualify. This is intentional — the friction the user is breaking is the at-home tap-an-app habit, not the social-meal behavior.
- **Three-state daily toggle.** Each day's square cycles through unmarked → clean → ordered → unmarked on tap. Unmarked = no decision (grey + day initial); clean = a no-delivery day (green + ✓); ordered = a delivery day (red + ✗). Absence of a row IS the unmarked state — only marked days persist.
- **Streak forgiveness for today.** A still-unmarked today doesn't break the current streak — the walk starts from yesterday in that case. Same forgiveness rule the workout streak uses. An 'ordered' day always breaks the streak, including today. Any future day is ignored.
- **Best (longest) streak surfaces alongside.** The card shows "X days" current and "Best: Y days" historical. The current run can also be the best — a live record stays visible without needing an "ordered" cap to count.
- **Weekly grid is the primary interaction.** Sun–Sat, 44×44 tappable squares, day initials below. Today gets a 2px mint border on the grey fill when still unmarked — passive nudge, no animation.

### Daily bundle tracker (added Build 2.4)

A second Nutrition-pillar card on the dashboard tracking a daily calisthenics habit — the supersets the user runs most days (push-ups, ab rolls, calf raises, typically 25 / 15 / 30). It sits directly below the no-delivery streak card. Locked decisions:

- **Per-exercise independent logging, not a bundle requirement.** The three exercises are tracked separately. A day with only push-ups still counts; the user isn't forced to do all three to "qualify." The name "bundle" describes the typical superset grouping, not a completion gate.
- **Any reps = a qualifying day.** The bar for a day to count toward the streak is the lowest possible: any reps of anything (`pushups + ab_rolls + calf_raises > 0`). The habit being built is *showing up daily*, not hitting a number — consistent with the Personal-OS "attempts and time, not just outcomes" principle. Hitting the full targets is surfaced separately as grid intensity, not as the qualifying threshold.
- **Streak = consecutive weeks with ≥ 4 qualifying days.** Unlike the delivery streak (consecutive *days*), the bundle streak is measured in *weeks*. A week needs 4+ qualifying days to count. This tolerates the user's real pattern (most days, not every day) without punishing a rest day. The headline reads "N weeks on target," with an all-time "Best: Nwk" alongside.
- **Current week is open — never breaks, never counts until it closes.** The week containing today is in progress: it can't break the streak (a slow start to the week isn't a failure) and doesn't add to the count until it rolls into the past, even if it already has 4+ days. Both the current walk and the longest scan operate only on closed weeks. Mirrors the spirit of the delivery card's today-forgiveness, scaled up to the week unit.
- **Four intensity bands drive the grid color.** `none` (nothing logged) → grey; `low` (1–49% of combined daily targets) → dark green; `medium` (50%+ combined) → mid green; `full` (all three individual targets met) → deep green. "Full" is reserved for hitting every target individually, because independent tracking means a day could overshoot the combined total while skipping an exercise — strong, but not complete, so it caps at medium.
- **Weekly progress bars target daily × 4.** Each exercise's bar measures the week's running total against `daily_target × 4` (the four qualifying days the streak needs). The fill caps at 100% visually; the number shows the true total so an overflow week reads honestly.
- **Superset-sized increments, editable in Settings.** The −/+ buttons on each today row step by the user's configured increment (default 25 / 15 / 30 — one superset), so a typical tap logs a real set, not +1. Both the increments and the daily targets live in a "Daily bundle" Settings section. Tapping the count opens a tap-to-type field for exact entry (same pattern as cardio duration).
- **Today-only logging.** The log section edits today's row only; past days are read-only in the grid. Retroactive editing isn't a need yet (unlike cardio, which logs discrete past sessions) — the bundle is a same-day habit check.
- **Mobility / flexibility is a fourth component (added Build 2.6).** A "Flex / Mobility" row tracks minutes instead of reps: a ±5-minute stepper with tap-to-type, and a green check the moment the day reaches the qualifying threshold (`bundle_mobility_min_minutes`, default 5). Any mobility minutes make the day qualifying (same "any work counts" rule as the rep components), and mobility folds into the grid-intensity percentage — credited at full value once the threshold is met, capped there so a long session can't distort the bar. A separate "Mobility: X / N days" weekly count (target `bundle_mobility_target`, default 4) sits below the log rows. A collapsible **Links** section holds saved follow-along videos (`{ id, label, url }` in a prefs JSON string): tap to open in a new tab (Safari / YouTube on iOS), `+ Add link` with inline label/URL inputs, `×` to delete. Stored on `bundle_logs.mobility_minutes` + three `user_preferences` fields (Dexie v11).

---

## Health check-ins design

Simple freshness tracker for medical appointments.

### Check-in types (user-configurable)
Defaults: Physical / Doctor, Dental, Dermatologist

Each has:
- Last visit date (user logs manually)
- Target frequency (e.g. every 6 months)
- Freshness indicator based on days since last visit
- Next due date (calculated)
- Notes field (for findings, follow-ups)

### Dashboard surface
Health check-ins appear in the pillar balance section as a single row — not expanded on the main dashboard. Tap to see detail.

Alert fires when any check-in is overdue: "Dental visit overdue — last was 7 months ago."

---

## Apple Watch / HealthKit integration

Pulled automatically — no manual entry needed.

| Data point | Source | Dashboard display |
|---|---|---|
| Steps | HealthKit | Daily count vs 10k target |
| Active calories | HealthKit | Daily vs user-set goal |
| Resting heart rate | HealthKit | Latest reading + status label |
| Workout duration | HealthKit | Used to auto-suggest cardio log |

HealthKit pull happens on app open and every 15 minutes while active.

Cardio sessions detected by Apple Watch can be imported with one tap — pre-fills type and duration.

---

## Goals layer

Each pillar supports goals following the Personal OS convention:

- Qualitative aspiration (open text) — no time limit
- Quantitative target (metric + value + date) — max 1 year horizon

### Current directional goals (seeded on first launch, user edits)

**Strength:** Maintain 4 lifting sessions per week. Increase progressive overload across main compound lifts.

**Cardio:** 4–6 cardio sessions per week, 20–30 min each. Decrease and maintain low body fat %.

**Mobility:** At least 1 dedicated mobility session per week. Never go more than 7 days without.

**Nutrition:** Daily protein target (user sets). 8 glasses water. 3 vegetable servings. All supplements taken 6/7 days.

**Health:** Find a doctor in LA. Find a dentist in LA. Schedule physical within 3 months.

Goals are displayed per-pillar in a Goals screen. Dashboard surfaces goal progress passively — no separate goal widget on the main screen in Phase 1.

---

## Proactive prompts

All prompts route through a centralized orchestration layer. Max 2 prompts per day.

### Prompt types (Phase 1)

| Prompt | Trigger | Priority |
|---|---|---|
| Mobility stale | 8+ days since last session | High |
| Progressive overload ready | 3 sessions hitting target reps | Medium |
| Weekly cardio on track | Hit target mid-week | Low |
| Supplement missed | End of day, supplement not logged | Low |
| Health check-in overdue | Past target frequency | High |
| Week review | Sunday evening | Medium |

Prompts are dismissable. Dismissed prompts re-surface after a type-appropriate window (e.g. mobility stale re-prompts after 3 days).

---

## Build phases

### Phase 1 — Core dashboard + strength logger

**Repo and tooling:**
- Fresh Vite + React + TS + Tailwind + Dexie scaffold in `~/Documents/physical-health-app`
- `git init` with first commit ("scaffold") before any feature code
- No GitHub remote yet — defer until Phase 6
- PWA manifest + service worker (no custom install prompt in Phase 1)

**Routing (4 routes, bottom nav):**
- Dashboard (`/`)
- Log Session (`/log/strength`)
- Exercise Library (`/library`)
- Settings (`/settings`)

**Dashboard:**
- All five sections rendered with the locked palette and typography
- Strength section is the only section wired to live Dexie data; cardio / nutrition / Apple Watch / mobility / health check-ins render as visual shells with empty-state values
- Header day/date/week + streak pill (live count from logged sessions)

**Strength logger (fully functional):**
- Session start: select session type (upper / lower / full_body) — pre-selects what's due next based on weekly targets
- Exercise rows: weight · reps · done; "Add Set" copies prior set's weight/reps; swipe-left to delete
- "Add Exercise" picker from library with add-new option
- Completion: summary (exercises, total sets, total volume), feel rating (Flying / Cruising / Crawling), optional notes
- All writes go through a synced-write wrapper from day one so Phase 6 sync hooks plug in cleanly

**Exercise library:**
- Searchable list, seeded with starter exercises on first launch via lifecycle-aware seeder
- Per-exercise history view: last weight × reps, sparkline trend over last 8 sessions, PR badges
- PR auto-detection runs on session save; surfaced as a quiet inline indicator on the history view

**Settings (minimal):**
- Edit weekly session targets per pillar (legs / upper / full body / cardio sessions per week)
- Edit daily nutrition targets (protein g / water glasses / veg servings) — stored even though dashboard nutrition section is a visual shell in Phase 1
- Hardcoded defaults match the seeded goals in §Goals layer

**Schema (full Phase 1 schema lands now):**
- All tables from §Schema (Phase 1) created on first launch, including ones not used until later phases
- Every row carries `user_id = LOCAL_USER_ID` so the Phase 6 Supabase migration is purely additive

**Prompt orchestration:**
- `prompts` table created
- Thin orchestrator module: daily soft cap (max 2), context-aware suppression (no prompts during active session log), dismiss-window logic
- Zero registered triggers in Phase 1 — Phases 4 / 5 plug in

### Phase 2 — Cardio + HealthKit
- Cardio logger
- HealthKit integration (steps, active cal, resting HR, workout import)
- Dashboard Apple Watch section live

### Phase 3 — Nutrition
- Daily check-in (protein / water / veg / supplements)
- AI macro estimator
- Supplement configuration in settings

### Phase 4 — Mobility
- Mobility logger
- Freshness tracking system
- Dashboard mobility staleness alerts

### Phase 5 — Health check-ins + Goals
- Health check-in tracker
- Goals layer across all pillars
- Proactive prompts system

### Phase 6+ — Cloud sync + meta-dashboard
- Supabase backend
- Cross-device sync
- Personal OS meta-dashboard integration
- Detraining detection after gaps

---

## Tech stack

Identical to Musical Journey App:

- React + TypeScript
- Vite
- Tailwind CSS
- Dexie (IndexedDB, local-first)
- Supabase (Phase 6+)
- Vercel hosting
- PWA (installable, offline-capable)

### HealthKit integration
- React Native WebView bridge for HealthKit access (iOS only in Phase 2)
- OR: Capacitor plugin for HealthKit if PWA approach is insufficient
- Decision deferred to Phase 2 — assess feasibility at build time

---

## Schema (Phase 1)

All Phase 1 rows carry a `user_id` field set to a constant `LOCAL_USER_ID = 'local-user-001'`, exported from a single source. This keeps the schema shape stable into Phase 6, where Supabase auth replaces the constant with real user IDs — a purely additive migration rather than a structural one.

Tables to define before first build:

```
sessions
  id, user_id, created_at, updated_at
  type: 'upper' | 'lower' | 'full_body' | 'cardio' | 'mobility'
  date, duration_minutes, notes
  feel_rating: 'flying' | 'cruising' | 'crawling'

exercises (library)
  id, user_id, name, muscle_group, is_compound
  created_at, last_used_at

session_exercises
  id, session_id, exercise_id, order_index
  notes: string | null                    -- added v1.8 (Dexie v7)

sets
  id, session_exercise_id, set_number
  weight, reps, completed, created_at
  set_type: 'reps' | 'duration'           -- added v1.4 (Dexie v2)
  duration_seconds: number | null         -- added v1.4 (Dexie v2)

cardio_logs
  id, user_id, session_id, type, duration_minutes
  intensity: 'low' | 'moderate' | 'high'

nutrition_logs
  id, user_id, date
  protein_grams, water_glasses, veg_servings
  supplements_taken: json array of supplement ids

supplements (user config)
  id, user_id, name, active

health_checkins
  id, user_id, type (doctor/dental/derm/custom)
  last_visit_date, frequency_months, notes

goals
  id, user_id, pillar, title, aspiration_text
  metric, target_value, target_date
  parent_goal_id, created_at

prompts
  id, user_id, type, priority, fired_at, dismissed_at
  re_prompt_after_days

delivery_days                                -- added v1.9 (Dexie v8)
  id, user_id, date
  status: 'clean' | 'ordered'
  created_at, updated_at

bundle_logs                                  -- added v2.0 (Dexie v9)
  id, user_id, date                          -- one row per user per day
  pushups, ab_rolls, calf_raises             -- independent rep counts, default 0
  created_at, updated_at
```

`user_preferences` also gains six bundle fields in v9 (Dexie upgrade hook backfills the existing row): `bundle_pushup_target` (100), `bundle_abroll_target` (60), `bundle_calfraise_target` (120), `bundle_pushup_increment` (25), `bundle_abroll_increment` (15), `bundle_calfraise_increment` (30).

---

## Design principles carried from Personal OS

- Dashboard is the philosophical center — opens first, every time
- Honest metrics, not flattering ones — detraining shows up after gaps
- Truth-honoring trumps gentle defaults — staleness clocks run during vacation
- Attempts and time, not just outcomes — showing up is the signal
- Deduce intent from signals — no "I'm in a building phase" toggles
- Honest about abundance — when caught up, say so and offer strategy
- Show the trade-off — workout choices surface what gets delayed
- Day as the unit of breadth — not every session must cover all pillars
- Mobile-first — phone is the primary device, gym usability is non-negotiable
- Progressive onboarding — this-week goals first, longer-range optional
- Centralized prompt orchestration — max 2 prompts/day, tiered priority

---

## Open questions (decide before Phase 2)

1. HealthKit: PWA bridge vs Capacitor — assess in Phase 2
2. AI macro estimator: Anthropic API call from client vs edge function
3. Progressive overload algorithm: exact parameters for "ready to progress" signal
4. Supplement reset time: midnight local time vs user-configurable
5. Cardio target: weekly session count only, or also weekly minutes?

---

## How to use this document

Paste at the start of every build session alongside the Personal OS Design Principles doc. This document is the source of truth for all design decisions. Update it before starting a new build, not after.

Order: complete design conversations → update this doc → write build prompt referencing this doc → kick off build.

---

## Build session log — days 1–2 (April 27–28, 2026)

End-of-day-2 checkpoint. Covers everything built and decided since the repo was initialized on April 27. Paste this section back at the start of the next session for full context.

### Commits (chronological)

| Hash | Step / kind | What it did |
|---|---|---|
| `b28c86e` | scaffold | Vite + React + TS + Tailwind + Dexie scaffold; first commit before any feature code (per Phase 1 plan, no GitHub remote). |
| `beed715` | step 2 | Dexie schema for the full Phase 1 table set; lifecycle-aware seeder for starter exercises. |
| `da6c092` | step 3 | Routing (`/`, `/log/strength`, `/library`, `/settings`) + bottom nav + base color tokens in Tailwind config. |
| `e30ab4a` | step 4 | Dashboard shell — all five sections rendered; strength section + streak pill wired to live Dexie data, others render as visual shells. |
| `c0e9515` | fix | Week start flipped to Sunday; lifting weekly defaults updated to 2 lower / 2 upper / 0 full body. |
| `0408134` | polish | Text brightness pass — more green throughout dashboard, micro-labels readable on grey cards. |
| `bc017bb` | polish | Brightness floor `#bbb` for small text on grey card surfaces (legibility audit fix). |
| `a585e6d` | fix | Lifting card display label `LEGS` → `LOWER` (intermediate step before v1.3 promotion to `LOWER BODY`). |
| `20092ba` | step 5 | Strength logger end-to-end — type-select → active session → exercise picker → set rows → completion screen with feel rating + notes. |
| `cdc34fe` | fix(seeder) | In-flight promise guard + heal-duplicates pass so StrictMode double-mount can't seed twice. |
| `c85ef3b` | fix(log-strength) | Cancellation guard on `suggestNextLiftingType` so a stale async resolution can't overwrite the user's tapped pick. |
| `bf2a926` | feat(library) | Tap-to-edit existing exercises in the Library (rename, reassign muscle group, toggle compound). |
| `2e0ff73` | feat(active-session) | Per-exercise "Last · {date} · N sets" history line above the live set rows in the active session. |
| `7210327` | docs (v1.2) | Synced design doc to `LOWER` display label. |
| `a13669b` | fix (v1.3) | Unified lifting type labels to `UPPER BODY` / `LOWER BODY` / `FULL BODY` across dashboard, log-strength type selector, active session header, and completion screen. Doc bumped to v1.3. |
| `f4582d8` | chore (v1.3) | Refreshed stale `// LEGS` / `// UPPER` code comments in `defaults.ts` to match the v1.3 display convention. |
| `1ab93f0` | feat(sets) | `reps` ↔ `duration` toggle on each set. Schema migrated to Dexie v2 with backfill. UI: per-row pill toggles mode, set-magnitude input swaps reps↔seconds, last-session history renders both, lb·reps total volume excludes duration sets. |

### Decisions made (and the reasoning behind each)

- **Sunday week start.** All weekly windows (`startOfWeekISODate`, dashboard 7-day dot row, this-week session counts) treat Sunday as day zero. Picked over Monday so the dashboard's "this week" matches the user's mental model of a fresh slate on Sunday morning.
- **Weekly lifting defaults: 2 lower / 2 upper / 0 full body.** Full body card stays on the dashboard but is labeled "optional" with target 0 — surfaces the option without nagging when not in use. Editable in Settings (step 7).
- **Display labels: `LOWER BODY` / `UPPER BODY` / `FULL BODY`.** Three rounds: first `LEGS` → then `LOWER` (matching `UPPER`) → finally promoted to the `Body`-suffixed pattern in v1.3 so all three read as a consistent set. Data-layer enum stays `upper | lower | full_body | cardio | mobility`.
- **Streak definition: consecutive days with at least one strength OR cardio session.** Mobility / nutrition / supplements alone don't keep the streak alive. Today doesn't break the streak before the user has logged — if today has no qualifying session, the count starts from yesterday.
- **Bottom nav routes (4 tabs): Dashboard, Log, Library, Settings.** Locked early for Phase 1; cardio / mobility / nutrition loggers will be reachable from inside their dashboard sections rather than as top-level tabs to keep the nav from sprawling.
- **Swipe-to-delete on sets: deferred.** Each `SetRow` ships an inline `×` button instead. Phone gym usability is fine without the gesture, and the gesture costs more than its value at this stage. Will revisit in polish phase.
- **Orphaned session rows are acceptable.** A session created but never finished (no `feel_rating`) stays in the table — every dashboard query filters on `feel_rating !== null`, so unfinished sessions are invisible to summaries / streaks / history. No active cleanup on app open. Trade-off accepted: cleaner code today, a future "resume in-progress session" feature gets the dangling rows for free.
- **Inputs use 16px text size** (`text-[16px]` Tailwind class on weight / reps / duration / search inputs) so iOS Safari doesn't auto-zoom the page when an input gains focus. This is why those inputs read larger than other body copy.
- **Volume metric: lb·reps.** Sum of `weight × reps` across all rep-mode sets in a session — surfaced on the completion screen with the `lb·reps` unit hint. Duration sets are excluded from this total (`weight × seconds` isn't comparable). Total set count still includes duration sets.

### Schema additions in this session

`sets` table gained two columns via Dexie version 2 (additive migration with upgrade hook):

| Column | Type | Default for backfill | Purpose |
|---|---|---|---|
| `set_type` | `'reps' \| 'duration'` | `'reps'` | Discriminates rep-mode from timed-effort sets. |
| `duration_seconds` | `number \| null` | `null` | Seconds elapsed for `set_type='duration'`; ignored when `set_type='reps'`. |

Indexes unchanged (both fields are non-indexed columns). Existing rows backfill in the upgrade hook so consumer code can treat both fields as present.

`src/lib/setFormat.ts` introduced as the single source of truth for the right-hand-side magnitude string (`"5"` for reps, `"45s"` / `"1:30"` for durations). Used in the active session's "Last" history line; will be the rendering point for PR detection and the future per-exercise history sparkline.

### Phase 1 completion status

Numbered steps used during build (matches commit-message labels):

| Step | Deliverable | Status |
|---|---|---|
| 1 | Repo + scaffold (`b28c86e`) | ✅ done |
| 2 | Dexie schema + seeder (`beed715`) | ✅ done — schema bumped to v2 in `1ab93f0` |
| 3 | Routing + bottom nav + tokens (`da6c092`) | ✅ done |
| 4 | Dashboard shell + live strength + streak (`e30ab4a` + polish) | ✅ done |
| 5 | Strength logger end-to-end (`20092ba` + follow-ups) | ✅ done |
| 6 | Exercise library detail — per-exercise history view, last-8-sessions sparkline, PR badges | ⏳ remaining |
| 7 | Settings — editable weekly lifting + cardio targets, daily nutrition targets | ⏳ remaining (page is a placeholder today) |
| 8 | PR auto-detection — runs on session save, surfaces as quiet inline indicator on history view | ⏳ remaining |
| 9 | Prompt orchestration scaffold — `prompts` table + thin orchestrator module with daily soft cap, zero registered triggers | ⏳ remaining |
| 10 | PWA manifest + service worker + Phase 1 polish pass | ⏳ remaining |

**Unblocked and ready to start next session: step 6 or step 7.**

### Known issues / follow-ups for next session

- **Resume in-progress sessions.** Today, navigating away from `/log/strength/active/:id` and re-tapping "Log session" creates a new session row instead of resuming the open one. The data is there (orphan-tolerant on purpose) — needs a tiny "you have a session in progress, resume?" check on the type-select screen.
- **Repeat last session (Phase 2).** From the session type select screen, offer a "Repeat last [Lower Body / Upper Body / Full Body] session" option that pre-loads all exercises and sets from the most recent session of that type, with weights and reps editable before saving. Saves significant logging time for users who run similar sessions week to week.
- **Swipe-to-delete on sets.** Deferred during step 5; the inline `×` button is fine for now. Revisit during step 10 polish if it actually feels missing in real use.
- **Visual tweaks still open:**
  - The reps/duration toggle pill on `SetRow` is text-only ("reps" / "sec") — fine functionally, but may want a clearer affordance once it's been used in a real workout. Watch for misses in the gym.
  - The "Last · {date} · N sets" history strip uses `bg-charcoal` inside a `bg-card` row — readable but tight. Consider a subtle inset border if the contrast feels muddy.
  - Completion screen volume tile shows `lb·reps` as a tiny subscript; if a session is mostly duration sets the number will read low. Decide later whether to add a separate "time under tension" tile or leave volume as the rep-only metric.
- **PR auto-detection** logic isn't wired yet — exercises don't surface PR badges in the Library or active session. Step 8.
- **Settings page is a placeholder.** Hardcoded defaults are baked into `src/lib/defaults.ts` and will move into a `user_preferences` table edited via the Settings UI in step 7.

---

## Phase 1 complete — checkpoint (April 30, 2026)

End-of-Phase-1 closure. Strength logging end-to-end, dashboard, exercise library + history + PR detection, settings, prompt orchestration scaffold, and PWA installability are all shipped. The app is usable in a real gym today; Phase 2 (Cardio + HealthKit) is the next build session.

### Phase 1 commit trail (31 commits, scaffold → close)

| # | Hash | Message |
|---|---|---|
| 1 | `b28c86e` | scaffold: vite + react + ts + tailwind + dexie |
| 2 | `beed715` | step 2: dexie schema + lifecycle-aware seeder |
| 3 | `da6c092` | step 3: routing + bottom nav + base color tokens |
| 4 | `e30ab4a` | step 4: dashboard shell with live strength + streak |
| 5 | `c0e9515` | fix: flip week start to Sunday + update lifting defaults |
| 6 | `0408134` | polish: text brightness pass + more green throughout dashboard |
| 7 | `bc017bb` | polish: brightness floor #bbb for small text on grey card surfaces |
| 8 | `a585e6d` | fix: lifting card display label LEGS → LOWER |
| 9 | `20092ba` | step 5: strength logger end-to-end |
| 10 | `cdc34fe` | fix(seeder): in-flight promise guard + heal duplicates |
| 11 | `c85ef3b` | fix(log-strength): protect user's type pick from stale async resolution |
| 12 | `bf2a926` | feat(library): tap-to-edit exercises |
| 13 | `2e0ff73` | feat(active-session): show last session's sets per exercise |
| 14 | `7210327` | docs: sync design doc to LOWER display label (v1.2) |
| 15 | `a13669b` | fix: unify lifting type labels to UPPER/LOWER/FULL BODY (v1.3) |
| 16 | `f4582d8` | chore(defaults): refresh stale LEGS/UPPER comments |
| 17 | `1ab93f0` | feat(sets): reps/duration toggle |
| 18 | `07ca151` | docs: v1.4 end-of-session checkpoint |
| 19 | `627015c` | feat(dashboard): move CTA row directly under header |
| 20 | `a28e211` | docs: capture "repeat last session" as Phase 2 follow-up |
| 21 | `414b7f2` | feat(library): exercise detail page + history sparkline + PR detection (step 6) |
| 22 | `cbc2d5a` | fix(library): sort exercise history by created_at, not date |
| 23 | `41f5eaf` | fix(library): "Last session" card shows literal last set, not top set |
| 24 | `dc1913e` | feat(library): show Last set + Personal best side-by-side on detail card |
| 25 | `325549f` | fix(log): order session types lower → upper → full body |
| 26 | `4c40f8d` | feat(dashboard): celebrate weekly target on pillar cards |
| 27 | `32b090f` | step 7: Settings page + user_preferences live targets |
| 28 | `e7520cf` | step 8: prompt orchestration module (zero registered triggers) |
| 29 | `49b3c2b` | step 10a: PWA manifest + service worker + green app icon |
| 30 | `59ac030` | step 10b: touch target audit — bring all tap targets to ≥44px |
| 31 | `7e13e70` | step 10c: drop unreachable exercise === null branch |

### What's shipped

**Infrastructure**
- Vite + React 19 + TypeScript + Tailwind + Dexie scaffold.
- Dexie schema at v3: `sessions`, `exercises`, `session_exercises`, `sets`, `cardio_logs`, `nutrition_logs`, `supplements`, `health_checkins`, `goals`, `prompts`, `user_preferences`. All rows carry `user_id = LOCAL_USER_ID` so the Phase 6 Supabase migration is purely additive.
- Synced-write wrappers (`syncedAdd` / `syncedUpdate` / `syncedDelete` / etc.) on every write so Phase 6 sync hooks plug in cleanly without touching call sites.
- Lifecycle-aware seeder with in-flight promise guard, dedupe-on-launch, and lazy-create of the `user_preferences` row.
- PWA: `manifest.webmanifest`, hand-rolled service worker (network-first for navigation requests, cache-first for hashed assets), green app icon, full apple-mobile meta tags. Registered production-only.

**Dashboard**
- Header with day / date / week / streak (consecutive days with strength OR cardio).
- CTA row directly under the header — primary action in the thumb zone on open.
- Lifting cards: live counts, weekly targets sourced from `user_preferences`, mint-stripe + ✓ celebration when target met. Full-Body card guarded so target-0 never celebrates.
- Cardio card: count, progress bar, session pills, "caught up" copy, mint-stripe + ✓ + mint pills on celebration.
- Nutrition card: visual shell with target text live-bound to `user_preferences` (data binding lands in Phase 3).
- Apple Watch card: visual shell (HealthKit lands in Phase 2).

**Strength logger end-to-end**
- Type-select screen with "Due next" suggestion (respects `user_preferences` targets).
- Active session: exercise picker with add-new flow, per-exercise "Last · {date} · N sets" history strip, set rows with reps↔duration toggle, inline × delete.
- Completion screen: exercises / sets / volume (lb·reps) summary, Flying / Cruising / Crawling feel rating, optional notes.

**Exercise library**
- Searchable list seeded with starter exercises on first launch.
- Detail page (`/library/:exerciseId`): two-column "Last set" + "Personal best" card, inline-SVG sparkline of last 8 sessions' top set, history list with quiet PR pills.
- Multi-hook live-query composition (one `useLiveQuery` per Dexie table) so observation across `session_exercises` / `sessions` / `sets` is unambiguous regardless of early-return paths.
- PR detection: pure helper, per-mode (rep-mode est-1RM via Epley, duration-mode by seconds). Surfaces immediately on save via the live query — no explicit save-time hook needed in Phase 1.
- Edit accessible from the detail header.

**Settings**
- Editable weekly targets (lower / upper / full body / cardio sessions per week) and daily nutrition targets (protein g / water glasses / veg servings).
- Save-on-blur, min/max clamped per field. No save button.
- All consumers (`LiftingSection`, `CardioSection`, `NutritionSection`, `suggestNextLiftingType`) read live preferences via `useLiveQuery` so dashboard re-renders the moment a target is edited.

**Prompt orchestration scaffold**
- `src/lib/promptOrchestration.ts` with `canFirePrompt` / `firePrompt` / `dismissPrompt` / `getActivePrompts`.
- Three suppression rules enforced: daily soft cap (≤2/day), active-session suppression (`feel_rating === null` on any session is the signal), per-type re-prompt cooldown.
- Six prompt types pre-registered (mobility_stale, progressive_overload_ready, weekly_cardio_on_track, supplement_missed, health_checkin_overdue, week_review) with default priority + cooldown.
- Zero registered triggers in Phase 1 — Phase 4/5 wires them. Tree-shaken from the Phase 1 bundle.

**Polish**
- All tap targets ≥44px (iOS HIG), 48px on list rows, 64px on bottom nav.
- 16px input text everywhere to dodge iOS Safari auto-zoom on focus.
- Charcoal + green-deep + green-mint palette consistent across every surface.
- Real `<title>`, theme color, apple-mobile-web-app meta tags.

### What's deferred to Phase 2+

**Phase 2 — Cardio + HealthKit**
- Cardio logger (table + dashboard card exist; logging UI not yet built).
- HealthKit bridge (PWA via WebView vs Capacitor — decision deferred to build time).
- Apple Watch dashboard card binds to live HK data (steps, active cal, resting HR, workout import).
- **Repeat last session** — pre-load most-recent session of the chosen type with editable sets (Phase 2 follow-up).
- **Resume in-progress strength sessions** — orphan-tolerant data model is in place; the "you have a session in progress, resume?" UX prompt isn't.

**Phase 3 — Nutrition**
- Daily check-in UI (protein / water / veg / supplements).
- AI macro estimator.
- Supplement configuration in Settings.

**Phase 4 — Mobility**
- Mobility logger.
- Freshness tracking system (0–3 fresh / 4–10 amber / 11–20 orange / 21+ red).
- Dashboard mobility staleness alerts.

**Phase 5 — Health check-ins + Goals + Prompts**
- Health check-in tracker.
- Goals layer per pillar.
- Register prompt triggers (mobility stale, supplement missed, weekly cardio, health overdue, week review) into the orchestrator built in step 8. The progressive-overload trigger that was originally on this list was dropped in Build 2.2 — the user decides when to add weight; PR detection still surfaces visually in the exercise library.
- PR-on-save trigger as the orchestrator's first consumer (visual PR surface already ships via live query; the explicit save-time hook is deferred since there's no consumer in Phase 1).

**Phase 6+** — Supabase backend, cross-device sync, Personal OS meta-dashboard integration, detraining detection after gaps.

### Known follow-ups carried into Phase 2

- **Swipe-to-delete on sets.** Deferred during step 5; the inline `×` button is fine in practice. Revisit if it actually feels missing in real gym use.
- **Reps/duration toggle pill on `SetRow`.** Text-only ("reps" / "sec") — functional but may want a clearer affordance after real workouts. Watch for misses.
- **"Last · {date} · N sets" history strip contrast.** `bg-charcoal` inside `bg-card` row — readable but tight. Consider a subtle inset border if it feels muddy.
- **Completion screen volume tile.** Shows `lb·reps`; if a session is mostly duration sets the number reads low. Decide later whether to add a separate "time under tension" tile or leave volume as the rep-only metric.
- **ExerciseDetail "Loading…" vs "Exercise not found" ambiguity.** `db.exercises.get()` returns `undefined` for both pending live-query and missing rows. Edge case — would need a sentinel default to distinguish.

### Current state

- **Installable PWA** — manifest, service worker (network-first nav, cache-first assets), apple-touch-icon, theme color all wired. Add to Home Screen on iOS / install prompt on desktop.
- **Offline-capable** — app shell + assets cached after first visit. All data is local in IndexedDB; nothing depends on a network round-trip yet.
- **Bundle**: 382 KB JS (117 KB gzipped), 9.8 KB CSS (3.0 KB gzipped). No PWA tooling dep; service worker is hand-rolled.
- **Schema**: Dexie v3. Eleven tables, all `user_id`-keyed.
- **Tree clean**, all 31 commits descriptive, Vercel-safe author email throughout. Ready to deploy whenever the user is.

---

## Build 2.1 session log — May 2, 2026

End-of-session checkpoint for Phase 2's first build. Cardio is now first-class: a full logger lives at `/log/cardio`, the dashboard cardio card binds to live `cardio_logs` data, the streak counts cardio days from the new table, Settings exposes a configurable threshold for "qualifying" sessions, and a generic toast component is in place for any future save flow to reuse. HealthKit + Apple Watch import + repeat-last-session + resume-in-progress strength sessions remain Phase 2 follow-ups — none of them are blocked by this build.

### Commits (chronological)

| # | Hash | Message |
|---|---|---|
| 1 | `5b97c3d` | step 2.1.1: schema v4 — cardio_types + reshape cardio_logs |
| 2 | `87bcb35` | step 2.1.2: timeBucket + cardioDateLabel helpers |
| 3 | `eaf6e6d` | step 2.1.3: cardio peer in type-select + /log/cardio + Toast provider |
| 4 | `889de02` | step 2.1.4: cardio logger screen |
| 5 | `dadff2e` | step 2.1.5: cardio dashboard card live + streak counts cardio_logs |
| 6 | `8d6be61` | step 2.1.6: Settings — Min cardio duration |
| 7 | _(this commit)_ | docs: v1.6 Build 2.1 checkpoint |

### Schema additions (Dexie v4)

| Change | Detail |
|---|---|
| New store: `cardio_types` | `id, user_id, name, created_at, last_used_at`. Indexed on `user_id, last_used_at`. |
| Reshape: `cardio_logs.session_id` | now `string \| null` — cardio doesn't always conjure a parent Session row. |
| Reshape: `cardio_logs.type` (string) → `cardio_type_id` (FK) | inline activity name replaced by FK to `cardio_types`. |
| New: `cardio_logs.started_at` | precise local-time intent serialized to ISO. Bucket label is computed at render time, never stored. |
| New: `cardio_logs.updated_at` | for parity with the rest of the schema's audit columns. |
| Reshape: `cardio_logs.notes` | now `string \| null`. |
| Index move | `cardio_logs` indexed on `started_at` instead of `session_id` (week queries). |
| New: `user_preferences.cardio_threshold_minutes` | default 20, backfilled by upgrade hook on the existing single row. |
| Seeder | `cardio_types` seeded on first launch with Stairmaster, Run, Bike, Walk, Row, Elliptical, Swim, Hike, Jump rope, Dance via the existing in-flight-promise + dedupe pattern. |

Twelve tables now (`cardio_types` is the new addition); all rows still carry `user_id = LOCAL_USER_ID` for clean Phase 6 sync migration.

### Decisions made (and why)

- **Cardio is its own data plane — no `Session` row.** Phase 1 cardio (in the `sessions` table with `type='cardio'`) was vestigial; the Build 2.1 logger writes straight to `cardio_logs` and `session_id` becomes nullable. The Session row was a tax on every cardio entry without giving anything back. `computeStreak` was updated to pull cardio days from `cardio_logs.started_at` directly so the streak doesn't silently break.
- **Bucket label is computed, not stored.** Morning / Afternoon / Evening / Late night are derived from the timestamp at render time via `src/lib/timeBucket.ts`. A future tweak to the boundaries (or a "user picks their own boundaries" feature later) flows everywhere a log is rendered without a backfill.
- **Threshold is `cardio_threshold_minutes`, not `cardio_minimum_minutes`.** Default 20. Below it = `SHORT` badge + 65% opacity in the expand panel + excluded from qualifying weekly count. Above-the-line minutes still count toward the "X min total" subline so a day of two 12-min walks isn't invisible. This honors the principle "attempts and time, not just outcomes" — short sessions are surfaced, just not falsely promoted.
- **Tap-to-pick on Cardio peer in type-select; tap-to-select on strength peers.** Cardio routes immediately to `/log/cardio` because cardio doesn't need a "Start session" confirmation step. Strength still goes through "select then Start" so the user can change their pick before a Session row opens.
- **Suggestion math stays strength-only.** The "Due next" badge was a strength-pillar concept driven by weekly lifting targets; cross-pillar suggestions ("you're behind on cardio — pick that") are deferred to a later design pass to avoid stacking heuristics before the principles for them are locked.
- **Retroactive guard at >7 days.** Anything within the last week is logged silently. Past that window, a soft confirm modal names the date and the days-ago count and asks "Save anyway?" — same Personal-OS philosophy as truth-honoring defaults: no silent backdating into a stale week, but the user keeps full agency.
- **Threshold default is read from prefs once on mount.** A `useRef` flag prevents a later live-query re-resolution from yanking a value out from under the user mid-edit. The `DEFAULT_CARDIO_THRESHOLD_MINUTES` constant is the fallback for the brief first-render frame before prefs resolve.
- **Toast as a generic provider.** Even though only cardio save uses it today, it's wired through a `ToastProvider` at the app root with a `useToast()` hook, so the next save flow (nutrition, mobility) just imports and calls. Bottom-center, charcoal bg, 2s auto-dismiss, tap-to-dismiss, single-line. Positioned with `env(safe-area-inset-bottom) + 84px` so it floats above the bottom nav on notched iPhones.
- **Most-used cardio chips fall back to alphabetical.** Five chips above the type field. With no logging history, fallback is the first five seeded types alphabetically (Bike, Dance, Elliptical, Hike, Jump rope) — keeps the chip row populated on a fresh install instead of leaving a hole.

### What shipped

**Logger (`/log/cardio`):**
- Header with Cancel.
- When section: side-by-side date / time fields. Native iOS picker triggered via hidden `<input>` + `showPicker()` (with `.click()` fallback). Time field shows the bucket label inline ("Time · Morning") so the user always sees the bucket the system has decided on.
- Type section: most-used chips (top-right green when selected) + tap-to-open full picker (alphabetical, search, "+ Add new type" inline). Selected type surfaces "Last logged: {Type} · {duration} min · {Intensity}, {N} days ago." (or "earlier today" / "yesterday" for tight windows).
- Duration section: −5 / +5 nudge buttons (44×44) + tap-to-type input. Default seeded once from `cardio_threshold_minutes`. 16px input text on iOS to dodge auto-zoom. Sanity ceiling 600 minutes.
- Intensity: 3-pill segmented (Low / Moderate / High), default Moderate.
- Notes: optional 2-row textarea.
- Save: full-width green CTA → writes `cardio_logs` row + bumps the type's `last_used_at` via synced wrappers → fires toast → navigates to dashboard. Retro-guard intercepts saves >7 days back with a soft confirm.

**Dashboard cardio card:**
- Top-row mint micro-label + ✓ on completion.
- Pills row: target count, qualifying = filled, remaining = dashed grey ring, all-filled when at-or-over target.
- Count headline: "{qualifying}" + "/ {target} sessions".
- Subline: "{minutes} min total" + " · {N} short" (suffix vanishes when N=0).
- Progress bar: qualifying-only fill on a charcoal track.
- Sub-copy: "{N} more to hit your week" / "You crushed your week" (mint).
- Celebration: 3px mint top stripe + ✓ next to title when complete.
- Overshoot: "+N OVER TARGET" mint micro-text right-aligned.
- Whole card tappable → expand panel: "This week's sessions" grouped by day. Day label appears once per day, subsequent rows align in the same column. Below-threshold sessions render at 65% opacity with a SHORT badge. Intensity abbreviates to lowercase low / mod / high. Empty state: "No sessions logged this week yet" centered.

**Settings:**
- Existing weekly cardio target verified editable (was already in Phase 1; clamped 0–14).
- New "Min cardio duration" row, default 20, clamped 1–180, save-on-blur, hint copy explains its effect on the dashboard.

**Plumbing:**
- `cardio_types` seeded with 10 starter activities via the lifecycle-aware seeder.
- `getCardioSummary(threshold)` reads cardio_logs directly. Threshold is plumbed in from a live-queried `user_preferences` so dashboard re-renders the moment the user edits the threshold in Settings — no forced refetch needed.
- `computeStreak` updated to union strength session dates with `cardio_logs.started_at` local-dates.
- `ToastProvider` at the app root, `useToast()` hook for callsites.
- Helpers: `src/lib/timeBucket.ts` (`timeBucketFor`, `timeBucketLabel`, `cardioDateLabel`, `clockLabel`), `src/lib/cardioHelpers.ts` (`createCardioLog`, `createCardioType`, `getMostUsedCardioTypes`, `getLastLogOfType`, `isRetroactive`, `localDateOf`).

### What's deferred (Phase 2 follow-ups)

- **HealthKit bridge decision (PWA WebView vs Capacitor) + integration.** Steps, active calories, resting HR, workout duration. One-tap import for Apple-Watch-detected workouts. Apple Watch dashboard card binding. Independent of this build — design doc still lists the decision as "assess at build time".
- **Repeat last session** on the strength type-select screen (Phase 2 follow-up from Phase 1).
- **Resume in-progress strength session** UX (orphan-tolerant data model is in place from Phase 1).
- **Cardio target: sessions vs sessions + minutes.** Open question from v1; current Settings only exposes weekly session count. Revisit if the "X min total" subline starts feeling like the more meaningful metric in real use.

### Known follow-ups carried into Phase 2.2+

- **Cardio history page.** Out of scope for 2.1 by design. The expand panel covers this-week visibility; longer-range history would benefit from a dedicated route. Helpers (`getMostUsedCardioTypes`, `getLastLogOfType`, the bucket helper) are already shaped to power it.
- **Cardio PRs / progressive-overload signals for cardio.** Same shape as strength — quiet inline indicators on a per-type detail surface. Not in 2.1.
- **Per-cardio-type detail view.** A library-style "Run" detail page with sparkline + history. Pattern from `ExerciseDetail.tsx` ports cleanly when needed.
- **Edit / delete a cardio_log.** Today saves are one-shot — no editing surface. Low-priority polish; the data model already supports it (we wrote `updated_at` on schema purpose, not just for sync).
- **Bucket-boundary user override.** Current boundaries are locked. If a user genuinely lives nights, "Morning" starting at 5 AM may not match. Defer until a real complaint surfaces.

### Current state

- **Schema**: Dexie v4. Twelve tables, all `user_id`-keyed.
- **Bundle**: 401 KB JS (122 KB gzipped), 11.4 KB CSS (3.4 KB gzipped). Modest growth from Phase 1's 382 / 117 — the new logger screen + toast + cardio query path account for it.
- **Dev experience**: `npm run dev` boots clean, every step 2.1.* commit type-checks, `npm run build` succeeds.
- **Tree clean**, 7 new commits descriptive, Vercel-safe author email throughout.

---

## Build 2.1 polish session log — May 3, 2026

End-of-session checkpoint for the polish round that followed Build 2.1's close. Eleven commits, all incremental — fixes against real-use friction (tap behavior, picker dismiss, time picker), visual treatment unification (dark blocks across the cardio logger), and two new features that surfaced from in-use review (distance for run/bike/walk/hike/row, Settings inline save confirmation). Schema moved from v4 to v6 over the course of the session.

### Commits (chronological)

| # | Hash | Message |
|---|---|---|
| 1 | `57b4862` | chore: untrack principles doc (suite-level reference) |
| 2 | `d3acd03` | fix(cardio): index name on cardio_types (Dexie v5) |
| 3 | `da93d5b` | fix(log): tap-to-route on all type-select tiles |
| 4 | `61ac3dc` | polish(cardio): dismiss + chip order + visual pass on /log/cardio |
| 5 | `3302a08` | fix(cardio): picker dismiss + time picker open + paired duration/intensity layout |
| 6 | `d2b788e` | fix(cardio): time picker showPicker() + dark date/time block treatment |
| 7 | `5332152` | fix(cardio): use visible <input type="time"> — opacity-0 silently no-ops showPicker on time |
| 8 | `e04c500` | chore(cardio): strip diagnostic console.log on time input |
| 9 | `f531e53` | feat(cardio): distance for distance-eligible types |
| 10 | `73b80cf` | feat(settings): inline save confirmation on every field |
| 11 | `3b9ec4d` | fix(settings): move save check next to input, not label |

### Decisions made (and why)

- **Suite-level docs don't belong in the app's repo.** `PERSONAL_OS_DESIGN_PRINCIPLES_*.md` lives alongside the project but isn't part of its source tree. After it got pulled into a commit by a stray `add -A` sweep, untracked it (commit 1) and added a `.gitignore` pattern so future sweeps can't grab it back. Local copy preserved on disk for reference.
- **All four type-select tiles tap-to-route — no select-then-Start.** Phase 1 strength tiles required a two-step (select tile, then tap Start), while cardio (added in 2.1) routed immediately on tap. The asymmetry was friction that Silas noticed in real use. Strength tiles still open a fresh `Session` row before navigating, so type plumbing through `createSession → /log/strength/active/:id → ActiveSession.session.type` is unchanged. A `routing` flag locks the tiles for the brief async window so a double-tap can't open two sessions.
- **Suggestion math stays strength-only — explicitly preserved through the tap-to-route change.** Cross-pillar suggestion ("you're behind on cardio — pick that") is deferred to a later design pass. The "Due next" badge continues to surface only on strength tiles. Cardio peers without it.
- **Native time picker fight: third attempt was the keeper.** Three commits (5, 6, 7) iterated on getting the time picker to open reliably. (1) Removed `<input>` nested inside `<button>` (invalid HTML — Safari was quietly refusing showPicker for time in that structure). (2) Added explicit `showPicker()` calls on click. (3) Discovered that `showPicker()` silently no-ops on `type="time"` when the input is `opacity:0` in some browsers (Safari especially — date is more lenient about visibility, time is not). Resolution: drop the invisible-overlay pattern for time, use a real visible `<input type="time">` styled to match the dark block. Date keeps the invisible-overlay + showPicker since it works there. Asymmetric structure but each input type uses the pattern that works for it. Console.log diagnostic stayed in for one verification round, then stripped (commit 8).
- **Date/time picker outside-tap dismiss = fullscreen overlay.** Document mousedown listener didn't fire reliably (Chrome desktop's date popup intercepts outside clicks before they bubble to document). Switched to a fullscreen overlay rendered while a picker is open: clicks on the system-layer picker UI go to the picker, clicks anywhere else hit our overlay and call `blur()` on the input to force-close. More reliable across browsers.
- **Cardio chip fallback is curated, not alphabetical.** Stairmaster, Run, Bike, Walk, Row — in that order — when the user has no cardio history. Alphabetical buried Run behind Bike / Dance / Elliptical. Used types still take priority and sort by recency; the curated list only fills remaining slots and skips any name already present.
- **Picker placeholder copy: "Search or pick another."** Read clearer than "Pick activity" once the chip row is populated above the field. Explicitly names the relationship between chips and full picker.
- **Dark-block visual treatment, applied unifiedly across the logger.** The Duration + Intensity row landed first in `#1a1a1a` near-black with a 2px mint left accent and mint micro-labels. The date/time fields followed in commit 6 — flipped from `#686868` (card grey) to the same near-black block, mint left accent matched, mini-labels became mint, values became `#f0f0f0`. The whole logger now reads as a unified palette.
- **Duration + Intensity collapse into a single paired side-by-side row.** Two equal-width blocks instead of two stacked full-width sections. Intensity stretches via the grid's `items-stretch` to match Duration's natural height — pills get more room, which looks intentional rather than empty.
- **Pills carry semantic color when selected.** Low = `#378ADD` (calm / Zone 2), Moderate = `#0F6E56` (primary accent), High = `#BA7517` (exertion). Unselected pills are filled grey `#686868` — never outline-only against the dark block (which would render the affordance invisible).
- **Distance is opt-in per type — not a universal field.** A 30-min Stairmaster session has no meaningful "distance," so the section only appears for Run / Bike / Walk / Hike / Row. Match is case-insensitive against canonical names; user-added types fall outside the eligible set unless they share a name. Eligibility lives in `cardioHelpers.DISTANCE_ELIGIBLE_TYPES` so any future surface (history, per-type detail) reads the same source of truth.
- **Distance state is preserved across type toggles.** A user who second-guesses their pick and switches Run → Stairmaster → Run shouldn't lose what they typed. State stays in memory; the *current* selected type's eligibility decides at save time. A non-eligible type at save always writes `null`.
- **Distance is purely informational.** Qualifying-vs-short logic, the threshold, total-minutes summation, most-used chip ranking — all unchanged. Dashboard expand panel just appends a `5.2 mi` cell when present.
- **Settings save confirmation fires on save success, not blur.** The mint ✓ only flips on after `await onCommit(...)` resolves. If the synced-write throws, control never reaches the line and the check stays hidden — correct error signal. A `useRef`-held timer drives a 2-second visible window with a 500ms opacity fade-out; quick consecutive edits clear and reschedule the timer so the check stays continuously visible through the re-edit instead of flickering off.
- **Save check sits next to the value, not the label.** Initial implementation (commit 10) put the ✓ inline with the label on the left column. Real-use observation: the eye watches the input column when typing, so the confirmation should appear there. Commit 11 wrapped input + check in a small flex group with reserved space (`w-3`) so the check has somewhere to fade in/out without causing layout shift.
- **All Settings fields go through `NumberRow`.** That meant the save-check feature lands once and covers all nine fields (lifting × 3, cardio target, cardio threshold, nutrition × 3, plus full-body) — no per-field plumbing.

### Schema changes

**Dexie v5 (`d3acd03`) — index-only hotfix.** `cardio_types` index list gained `name` so `LogCardio`'s picker `orderBy('name')` query resolves. v4 had omitted it, which broke the page on first paint with a `SchemaError`. No upgrade callback needed — Dexie auto-rebuilds indexes on upgrade. All other stores byte-identical to v4. The v4 declaration was preserved so any client that briefly opened the app between v4 release and this hotfix still walks a clean upgrade ladder.

**Dexie v6 (`f531e53`) — distance for cardio.** `cardio_logs` gained `distance_miles: number | null`. Non-indexed column. Backfilled to `null` on upgrade so consumer code can treat the field as always-present. Indexes unchanged.

| Version | Change | Upgrade |
|---|---|---|
| v5 | `cardio_types` index list adds `name` | Index-only — no callback |
| v6 | `cardio_logs.distance_miles` added | Backfill `null` on existing rows |

Twelve tables. All rows still carry `user_id = LOCAL_USER_ID` for clean Phase 6 sync migration.

### UI / UX changes

**Type-select screen (`/log/strength`):**
- All four tiles tap-to-route — no separate "Start session" button.
- In-flight tile keeps mint border for visual feedback while the others dim to 50%.
- Subtext copy: "Pre-selected based on what's due this week" → "Tap to start logging."

**Cardio logger (`/log/cardio`) — visual unification:**
- Header gains a small mint heart-pulse glyph (inline SVG, no icon-lib dep).
- Date / time fields flip to dark `#1a1a1a` block treatment with 2px mint left accent, mint micro-labels, `#f0f0f0` values, ⌄ chevrons (date only — time field uses native browser-rendered arrows / spinners since the visible-input pattern doesn't support our custom chevron without conflict).
- Type picker placeholder: "Search or pick another."
- Most-used chip fallback: curated order Stairmaster, Run, Bike, Walk, Row.
- Native picker dismiss on outside tap via fullscreen overlay (replaces document mousedown approach).

**Cardio logger — Duration + Intensity:**
- Paired side-by-side blocks in dark `#1a1a1a` with mint left accents.
- Duration block (non-eligible types): centered "DURATION" mint micro-label, 32px white digit on grey `#686868` panel (tap-to-type), "min" sublabel, −5 / +5 buttons (52×40, FILLED grey, no border, white 16px text).
- Duration block (eligible types: Run / Bike / Walk / Hike / Row): expands to two stacked sub-sections. Top "TIME" sub-section (28px digit, 44×32 buttons), 0.5px `#333` divider, bottom "DISTANCE" sub-section ("Add distance" mint tap-target when empty; once tapped, same grey panel pattern with 28px input, "mi" sublabel, ±0.1 nudge buttons with floating-point-safe rounding).
- Intensity block: three pills stacked vertically with 6px gap, FILLED grey `#686868` unselected, semantic color when selected (Low `#378ADD`, Moderate `#0F6E56`, High `#BA7517`). Block stretches to match Duration's natural height.
- Notes textarea: mint left accent (extends the row-anchoring pattern).

**Time picker (specifically):**
- Real visible `<input type="time">` in the dark block (not the invisible-overlay pattern that date uses). Native UI affordances (Chrome popup / iOS wheel sheet / macOS spinners) signal interactivity.
- `colorScheme: 'dark'` style nudge so browsers that respect it render picker UI in dark mode.
- 16px font-size on the input dodges iOS Safari's auto-zoom-on-focus behavior.

**Dashboard cardio card expand panel:**
- When a session has distance, append a `5.2 mi` cell between duration and intensity (preserves the existing gap-3 visual rhythm).

**Settings:**
- Inline save confirmation: mint ✓ next to the input, fades in on save success, holds 2s, fades out (500ms transition).
- Re-edit within the visible window cleans the timer and starts fresh — check stays continuously visible through the re-edit.
- Reserved space (`w-3`) so the fade in/out doesn't cause layout shift.

### Known follow-ups carried into next build

- **HealthKit integration.** Steps, active calories, resting HR, workout duration; Apple Watch dashboard card binding; one-tap import for Watch-detected workouts. Bridge decision (PWA WebView vs Capacitor) still deferred. Independent of everything in this session.
- **Cardio target: sessions vs sessions + minutes.** Open question; current Settings only exposes weekly session count. Revisit if "X min this week" starts feeling like the more meaningful metric.
- **Cardio history page.** Out of scope for 2.1 by design. The expand panel covers this-week visibility; longer-range history would benefit from a dedicated route. Helpers (`getMostUsedCardioTypes`, `getLastLogOfType`, `timeBucket`) are shaped to power it.
- **Per-cardio-type detail view.** Library-style "Run" detail page with sparkline + history. Pattern from `ExerciseDetail.tsx` ports cleanly when needed.
- **Edit / delete a cardio_log.** Today saves are one-shot. Low-priority polish; data model already supports it (`updated_at` is written on save).
- **Distance unit (mi vs km).** Hard-coded to miles. If a user is metric-native, a setting flips the unit. Not on the radar for this build.
- **Save-confirmation accessibility.** The ✓ is `aria-hidden` (visual-only). A polite live-region with "Saved" text would announce the success to screen readers. Defer.
- **Bucket-boundary user override.** Locked at Morning 05:00 / Afternoon 12:00 / Evening 18:00 / Late night 00:00–04:59. Defer until a real complaint surfaces.

### Current state

- **Schema**: Dexie v6. Twelve tables, all `user_id`-keyed.
- **Bundle**: 407.5 KB JS (122.9 KB gzipped), 12.8 KB CSS (3.6 KB gzipped). Up from v1.6's 401 / 122 — distance UI + save-confirmation timer state account for it.
- **Dev experience**: `npm run dev` boots clean, every commit since v1.6 type-checks, `npm run build` succeeds.
- **Tree clean**, 11 new commits descriptive, Vercel-safe author email throughout.

---

## Build 2.2 session log — May 19, 2026

End-of-session checkpoint for the strength logger's in-session ergonomics pass. Nine commits, three threads: (a) draft / resume + discard + retroactive dates close the long-standing "I tapped Log session twice and got a ghost row" gap; (b) per-exercise affordances (delete, drag-reorder, free-form notes) reach feature parity with the cardio logger's tactile polish; (c) the dashboard catches up — lifting tiles route directly into logging, the cardio card swaps total minutes for qualifying minutes. The overload prompt scaffold (including its weight pre-fill in `repeatLastSession`) is removed entirely — the user decides when to add weight.

### Commits (chronological)

| # | Hash | Message |
|---|---|---|
| 1 | `86bd137` | feat(db): schema v7 — session_exercises.notes |
| 2 | `4f8ca26` | feat(strength): resume in-progress drafts; discard option |
| 3 | `4efab41` | feat(strength): editable session date on log + complete screens |
| 4 | `bf58ecd` | feat(strength): remove exercise from active session |
| 5 | `7a1be9f` | feat(strength): drag to reorder exercises in active session |
| 6 | `3ac4c2e` | feat(strength): per-exercise notes in active session |
| 7 | `d0392e1` | refactor: remove progressive overload prompt scaffolding |
| 8 | `4ede96d` | feat(dashboard): lifting tiles route straight to /log/strength |
| 9 | `d5f0474` | feat(cardio): qualifying weekly minutes on dashboard card |
| 10 | _(this commit)_ | docs: v1.8 Build 2.2 session log |

### Schema delta (Dexie v7)

| Change | Detail |
|---|---|
| `session_exercises.notes: string \| null` | Per-exercise free-form note (form cue, equipment swap, etc.). Non-indexed column; backfilled to `null` on upgrade via `tx.table('session_exercises').toCollection().modify(...)`. Index list unchanged. Consumer code can treat the field as always-present. |

The store index strings stay byte-identical to v6 — only the row shape changes, so Dexie's upgrade path is the standard "modify each row" hook. Twelve tables now; no new ones.

### Decisions made (and why)

- **Resume beats Repeat-panel beats Fresh.** When a tile has an orphan draft AND a completed last session, Resume wins — the half-finished workout is the more actionable signal. The repeat-panel only opens when no draft exists. Conceptually: orphan = active work; repeat panel = pick a plan; fresh creation = no history.
- **Resume badge shows the START TIME, not "x minutes ago".** Two reasons: (a) the start time anchors the draft to a moment the user remembers ("oh, the 2:14 PM one — that was the lower body I bailed on after squats"); (b) "X min ago" creeps every render and would force a re-render heartbeat on the type-select screen, which is otherwise inert.
- **Discard is below the primary CTAs and styled quiet.** Dotted underline, card-mute text, sits at the bottom — same pattern as "Cancel" affordances elsewhere. A confirm dialog with a destructive-red action gates the actual delete. Cascade order is sets → links → session so a partial failure can't leave dangling children that the tile would still see as a draft.
- **Session date editable on both ends.** The type-select screen defaults to today and the chosen date threads through `createSession` / `repeatLastSession` into the new row. The completion screen exposes the same field so a forgotten retro decision (or a wrong-tap on the dashboard tile) is still recoverable before save. Existing dashboard queries already read `session.date` (not `created_at`), so retroactive sessions land in the correct week / streak / dashboard count without a separate audit.
- **Exercise delete with confirm, set delete without.** The per-set × is one tap because a misclick costs one row and the prior weight is right there to retype. The per-exercise × wipes the whole exercise plus all its sets — that's a heavier mistake to make accidentally, so it gets an inline confirm with a destructive-red action and a Cancel.
- **HTML5 drag-and-drop, no new dependency.** The spec said no new library; native drag events handle this fine at six-to-ten rows. Optimistic ordering during drag via a local override state so the reorder feels instant; once the persistence call resolves and the live query catches up, the override clears. The handle (☰) is decorative — the whole row is `draggable` — so the user doesn't have to thumb a small target.
- **Note input opens expanded when a saved note exists, collapsed otherwise.** Two states for the same field — collapsed shows an "Add note" mint tap-target (low visual weight, no border), expanded shows a single-line input. Saves on blur, not keystroke. Clearing the field on blur stores `null` and collapses again so the affordance is self-cleaning. The completion-screen summary surfaces all non-empty notes in their `order_index` order.
- **Progressive-overload prompt removed in full.** No prompt, no `+= 5lb` pre-fill in `repeatLastSession`, no `progressive_overload_ready` entry in `PROMPT_TYPES`. PR detection in `composeExerciseHistory` and the library sparkline stays — PRs still surface visually, they just no longer prescribe the next number. Decision rationale: prescribing weight removes the user's judgment from the action that requires the most judgment (load progression on the right day, with the right body).
- **Dashboard tile tap-to-route replaces the in-place detail panel.** The expanded "7-day dots + last session summary" panel is removed. Reasoning: the panel's job overlapped with what the tile already shows (count + streak), and tapping the tile to expand a panel and THEN tap "Log session" is two motions for one decision. Now: tap the tile → land in the type-select screen with the type pre-fired through `?type=X`, which runs the same Resume / repeat-panel / new-session decision tree as a manual tap. The primary "Log session" CTA still routes to type-select with no pre-selection for the "I'll decide on the screen" path.
- **Cardio "qualifying minutes" replaces "total minutes."** The dashboard headline counts qualifying sessions (≥ threshold); a stat labeled "total minutes" that included sub-threshold sessions was inconsistent with that headline. The new "X min this week" stat counts only qualifying sessions. Short sessions stay visible — both as a "· N short" tail on the same line and as 65%-opacity rows in the expanded list — but the headline-level number is now self-consistent.

### What shipped

**Schema:**
- Dexie v7: `session_exercises.notes` non-indexed, backfilled to null on upgrade. v6→v7 is a row-shape-only migration; index strings unchanged.

**Type-select screen (`/log/strength`):**
- Resume badge replaces the "Due next" badge on a tile when an orphan draft exists for that type. Sub-label: `started 2:14 PM`. Tapping a Resume tile bypasses the repeat panel and routes straight to `/log/strength/active/:id` for the draft — no new row.
- `Session date` DateBlock below the four tiles. Defaults to today; tapping opens the native date picker. The chosen date threads through `createSession` and `repeatLastSession`.
- Query-param entry: `/log/strength?type=lower` (etc.) — when both async queries have loaded, the page auto-fires the same `handleTap` it would on a manual tap.
- DateBlock primitive (`src/components/ui/DateBlock.tsx`) — the cardio logger's date field factored out: dark `#1a1a1a` surface, mint `#5DCAA5` left accent, "Today / Yesterday / Mon Apr 28" rendered value, invisible-overlay `<input type="date">` with `showPicker()`.

**Active session screen:**
- ☰ drag handle on each exercise row header (decorative). Whole row is draggable via HTML5 DnD. Optimistic local override during drag; `reorderSessionExercises` rewrites `order_index` for every row whose position actually changed.
- `×` exercise delete in the header. Inline confirm strip below the header with Cancel / destructive-red Remove. `removeExerciseFromSession` cascades sets → link.
- `Add note` collapsible per exercise. Tap to expand into a single-line input; existing notes open expanded. Blur saves via `updateSessionExerciseNotes` (null on empty, trimmed string otherwise).
- `Discard session` quiet text link below the Finish CTA. Confirm dialog → `discardSession` cascades sets → links → session, then navigates back to type-select.

**Completion screen:**
- Editable `Session date` DateBlock above the feel-rating selector. Writes through to `session.date` on change via `updateSessionDate`.
- `Exercise notes` summary section (only mounts when at least one note is non-empty): exercise name + note text per row, ordered by `order_index`, muted style.

**Dashboard:**
- Lifting tiles: tap navigates to `/log/strength?type=X`. The in-place 7-day-dots + last-session panel and its toggle state are removed.
- Cardio card: "X min total" replaced with "X min this week" (qualifying minutes only). Short-count tail kept (` · N short` suffix when N > 0). `CardioWeekSummary.totalMinutes` renamed `qualifyingMinutes`; CardioSection was the only consumer.

**Strength helpers (`src/lib/strengthHelpers.ts`):**
- `createSession(type, date?)` — date optional, defaults today.
- `repeatLastSession(type, date?)` — date optional, defaults today. PR-driven `+= 5` removed; carried set copies weight verbatim.
- `updateSessionDate(sessionId, date)` — used by the completion screen.
- `getDraftSessionByType(type)` / `DraftSessionSummary` — most-recent orphan + start timestamp.
- `discardSession(sessionId)` — cascade delete.
- `removeExerciseFromSession(sessionExerciseId)` — cascade delete for one exercise.
- `reorderSessionExercises(orderedIds, current)` — rewrite `order_index` only where it changed.
- `updateSessionExerciseNotes(sessionExerciseId, notes)`.

**Date helpers:** `timeOfDayLabel(iso)` — "2:14 PM" (12h, no leading zero, uppercase AM/PM). Drives the Resume badge's secondary line.

**Prompt orchestration:** `progressive_overload_ready` removed from `PROMPT_TYPES`. Header comment updated to note the change. No registered triggers in Phase 1 — the change is scaffold-level.

### Known follow-ups carried into next build

- **Retroactive edit of an already-completed session date.** v1.8 ships editable date *before* and *during* a session (type-select default, completion screen). Once a session is saved, there's no editing surface — a misdated session has to be discarded and re-created. Next sensible home for this is the dashboard's expanded lifting panel, or a future strength history page. Schema already supports it (`updated_at` ticks on every write).
- **HealthKit integration.** Still deferred. Bridge decision (PWA WebView vs Capacitor) outstanding.
- **Cardio target: sessions vs sessions + minutes.** Open. Now that "X min this week" is qualifying-only, the question of whether to expose a minutes target alongside the session count becomes more answerable — revisit after some real-use weeks.
- **Per-cardio-type detail view + cardio history page.** Same as v1.7.
- **Edit / delete a cardio_log.** Same as v1.7.
- **Distance unit (mi vs km).** Same as v1.7.
- **Save-confirmation accessibility (Settings).** Same as v1.7.
- **Bucket-boundary user override (cardio).** Same as v1.7.
- **Drag affordance on touch devices.** HTML5 DnD works on touch in modern WebKit, but the spec is desktop-first. If a touch user reports the drag feels unresponsive, the fallback would be a long-press-to-grab gesture or moving to a pointer-events library. Not blocking — current pass is fine for the target device's WebKit.

### Current state

- **Schema**: Dexie v7. Twelve tables, all `user_id`-keyed. `session_exercises.notes` added (null backfill).
- **Dev experience**: `npm run dev` boots clean, every Build 2.2 commit type-checks, `npm run build` succeeds.
- **Tree clean**, 10 new commits descriptive (including this docs commit), Vercel-safe author email throughout.

---

## Build 2.3 session log — May 19, 2026

End-of-session checkpoint for the no-delivery streak tracker. Five commits, single-feature: a dedicated dashboard card lets the user mark each day as clean (no delivery) or ordered (delivery happened) and surfaces both the current streak and an all-time best. The feature is its own Nutrition-pillar card — sibling to, not subordinate of, the existing nutrition shell. Eating out socially does not count as a slip; the friction this targets is the at-home tap-an-app habit.

### Commits (chronological)

| # | Hash | Message |
|---|---|---|
| 1 | `9100af6` | feat(db): schema v8 — delivery_days table |
| 2 | `f04bdf9` | feat(delivery): helpers for week query, three-state toggle, streak math |
| 3 | `8afca06` | feat(delivery): DeliveryStreakCard with weekly grid + three-state taps |
| 4 | `fba21ef` | feat(dashboard): mount DeliveryStreakCard below nutrition |
| 5 | _(this commit)_ | docs: v1.9 Build 2.3 session log |

### Schema delta (Dexie v8)

| Change | Detail |
|---|---|
| New store: `delivery_days` | `id, user_id, date, status, created_at, updated_at`. Indexed on `user_id` and `date`. Status is `'clean' \| 'ordered'`. No upgrade backfill — new store, every existing store byte-identical at the index layer. |

Thirteen tables now (`delivery_days` is the new addition); all rows still carry `user_id = LOCAL_USER_ID` for clean Phase 6 sync migration.

### Decisions made (and why)

- **Own card, not a row inside the nutrition shell.** The nutrition shell is dedicated to macros + supplements — a domain of *measurement* (grams, glasses, servings). The delivery streak is a domain of *behavior* (a daily yes/no habit). Mashing them into one panel would muddy both. Two cards under the same Nutrition pillar reads cleanly and lets each surface evolve at its own pace.
- **Slip definition is delivery-only.** Eating out socially (restaurants, dinner with friends) is explicitly NOT a slip. The friction the user is targeting is the at-home tap-an-app loop, not the social-meal behavior. This is a hard product decision — if it ever expands, it goes in via a separate dimension (e.g. an `eat_out` status, NOT by widening "ordered").
- **Three-state daily toggle (unmarked / clean / ordered).** Two-state (toggle clean) would force a row for every day the user wanted to register a slip, and "ordered" would have to live somewhere else. Three-state on one tap target keeps the model tight and the UI single-purpose: every square represents exactly one day, and the tap cycle is `unmarked → clean → ordered → unmarked`.
- **Absence of a row IS the unmarked state.** The table holds only marked days, not 365 rows per year. The streak math reads "no row" as "decision not made," which is the same in-memory shape as "today not yet logged" — so the today-forgiveness rule applies for free.
- **Today forgiveness.** A still-unmarked today doesn't count as a streak break. The walk-backward starts from `today` if it has a row, otherwise from `today - 1`. Mirrors the existing `computeStreak` (workouts) so the two streaks behave consistently for the user. An 'ordered' day still breaks the streak, including today — only the *unmarked today* gets the pass.
- **Best streak counted from the same data, not a separate "max" field.** A scan over the clean rows finds the longest historical run; the current run is compared against it so a live streak surfaces as the best while it's still in progress. No denormalized counter to drift out of sync.
- **Live record alongside best.** Surfaces both numbers always — the current streak headline and a "Best: Y days" tail. Reasoning: when the user just broke a 12-day run, seeing "0 days · Best: 12 days" is more honest than just "0 days." Personal-OS principle — honest metrics, not flattering ones.
- **Mint border on today (when unmarked), no animation.** A passive nudge that today's square is the one the user might want to tap. Animation would feel like a notification; the goal is a visual hint, not pressure. The border lives on the grey background only — clean/ordered states don't get it (already decided).
- **Day initials in the grid AND below.** Each unmarked square shows its day initial (S/M/T/W/T/F/S) on the grey fill itself, and the same initials repeat below the row in 9px. Some redundancy, but it lets the user identify a day without counting positions when the grid has mixed clean/ordered/unmarked squares.
- **44×44 tap target.** Matches every other tappable affordance in the app. Below 44px, the spec calls it inaccessible; above it, the row gets crowded on a phone-width container. Equal squares on a 7-column grid with gap-1.5 fit comfortably inside the standard card padding.

### What shipped

**Schema:**
- Dexie v8 adds `delivery_days` (id, user_id, date, status, created_at, updated_at). Indexed on user_id + date. No upgrade backfill (new store).

**Helpers (`src/lib/deliveryHelpers.ts`):**
- `getDeliveryWeek(startOfWeek)` — bulk-loads the seven dates of the user's week via `.anyOf` and returns a Map keyed by date string. (DeliveryStreakCard currently uses `db.delivery_days.toArray()` directly so the streak + grid share a single subscription, but this helper is in place for a future history page.)
- `toggleDeliveryDay(date)` — cycles a row through unmarked → clean → ordered → unmarked via the synced* wrappers. Creates on the first tap, updates on the second, deletes on the third.
- `computeDeliveryStreak()` — returns `{ currentStreak, longestStreak }`. Current walks backward from today (with today-forgiveness); longest scans all clean rows sorted by date, run-length-encoded.

**DeliveryStreakCard:**
- Mounted at `<DeliveryStreakCard />` in `src/pages/Dashboard.tsx`, directly below `<NutritionSection />`.
- Top row: large streak number ("X days", 28px ink) + "Best: Y days" tail right-aligned (12px #777).
- 7-column grid (Sun→Sat), 44px squares, gap-1.5. Visual states: clean = #0F6E56 fill + white ✓; ordered = #E24B4A fill + white ✗; unmarked = #3a3a3a fill + day initial (12px #777); today-when-unmarked adds a 2px mint (#5DCAA5) border.
- Day-initial label row below the grid (9px #777, tracked).
- Empty state (no rows yet): "Tap each day you skipped delivery" centered, 12px #777.
- `aria-label` on each cell narrates the current state and the action the next tap will take.

### Known follow-ups carried into next build

- **Slip cause tagging.** Tap-and-hold or a separate detail surface to capture "why" (late night, hungover, no groceries, etc.) — useful for the Phase 5 pattern surface but not blocking the streak mechanic.
- **Restaurant / social-meal counter.** Currently invisible to the data. If a future read tells us the user wants to see how often they're eating out (independent of delivery), a second status or a parallel table is the right shape — NOT a third state on `delivery_days`.
- **Delivery history page.** No deeper surface yet. The week grid covers the immediate use case. A Phase 3+ "month / year heatmap" view ports cleanly when the volume of marked days makes a longer-range view interesting. `getDeliveryWeek` is shaped so a `getDeliveryRange(start, end)` is a one-line swap.
- **Prompt trigger on a long live streak.** Possible Phase 5 hook — "you're 7 days clean, want to log a win?" — but only after the user has actually built a meaningful run. Premature to bake in now.
- **Settings tile for slip definition.** If the user ever wants to widen the definition (e.g. include takeout pickup), Settings is the right home. Locked to delivery-only for now per the product decision; revisit only on explicit request.

### Current state

- **Schema**: Dexie v8. Thirteen tables, all `user_id`-keyed. `delivery_days` added.
- **Dev experience**: `npm run dev` boots clean, every Build 2.3 commit type-checks, `npm run build` succeeds.
- **Tree clean**, 5 new commits descriptive (including this docs commit), Vercel-safe author email throughout.

---

## Build 2.4 session log — May 23, 2026

End-of-session checkpoint for the daily bundle (calisthenics) tracker. Six commits, single-feature: a second Nutrition-pillar dashboard card lets the user log push-ups, ab rolls, and calf raises each day and tracks a "weeks on target" streak. The three exercises are tracked independently — any reps of anything makes the day qualifying, and a week with ≥ 4 qualifying days advances the streak. The card sits directly below the no-delivery streak card; both are siblings under the Nutrition pillar.

### Commits (chronological)

| # | Hash | Message |
|---|---|---|
| 1 | `e15d5b5` | feat(db): schema v9 — bundle_logs table + bundle prefs fields |
| 2 | `bdfd13f` | feat(bundle): helpers for week query, upsert, intensity + streak math |
| 3 | `86e12ae` | feat(bundle): DailyBundleCard — weekly grid, progress bars, today logger |
| 4 | `9aa940f` | feat(settings): Daily Bundle targets + increments |
| 5 | `bc2534a` | feat(dashboard): mount DailyBundleCard below delivery streak |
| 6 | _(this commit)_ | docs: v2.0 Build 2.4 session log |

### Schema delta (Dexie v9)

| Change | Detail |
|---|---|
| New store: `bundle_logs` | `id, user_id, date, pushups, ab_rolls, calf_raises, created_at, updated_at`. Indexed on `user_id` and `date`. One row per user per day, created lazily the first time any exercise is logged that date; rep fields default 0. No upgrade backfill on the store (new, empty on upgrade). |
| `user_preferences` +6 fields | `bundle_pushup_target` (100), `bundle_abroll_target` (60), `bundle_calfraise_target` (120), `bundle_pushup_increment` (25), `bundle_abroll_increment` (15), `bundle_calfraise_increment` (30). Backfilled on the existing single prefs row via the v9 upgrade hook; fresh installs seed them in `buildDefaultPreferences`. |

Fourteen tables now (`bundle_logs` is the new addition); all rows still carry `user_id = LOCAL_USER_ID` for clean Phase 6 sync migration.

### Decisions made (and why)

- **Per-exercise independent logging, not a bundle requirement.** The three exercises live as three columns on one row and are summed/displayed independently. A day with only push-ups still qualifies. "Bundle" names the typical superset grouping, not a completion gate — forcing all three would punish the partial-effort days the user actually has.
- **Any reps = a qualifying day.** The qualifying test is `pushups + ab_rolls + calf_raises > 0`. The habit is daily consistency, not a rep count — Personal-OS "attempts and time, not just outcomes." Hitting full targets is surfaced as grid *intensity*, deliberately decoupled from the *qualifying* threshold so the streak rewards showing up.
- **Streak measured in weeks, not days.** Unlike the delivery streak (consecutive days), this counts consecutive weeks with ≥ 4 qualifying days. This matches the user's real cadence (most days, not every day) and lets a rest day pass without breaking the run. Four is the floor; the weekly progress bars target `daily × 4` to make the same number visible across both surfaces.
- **Current week is open — never breaks, never counts until it closes.** The week containing today is in progress; it can't break the streak and doesn't add to the count until it rolls into the past. Both `computeBundleStreak`'s backward walk and its longest-run scan operate only on closed weeks, so a slow Monday never costs a streak and a strong-but-unfinished week never inflates it early.
- **Four intensity bands, "full" reserved for all-three-hit.** `none / low (<50% combined) / medium (50%+ combined) / full (every individual target met)`. Independent tracking means a day could clear the combined total while skipping an exercise — that reads as medium, not full, because "full" should mean a complete day, not just a high-volume one. Guards against divide-by-zero if a target is ever set to 0.
- **Absence of a row IS "nothing logged."** Same shape as the delivery card — the table holds only days the user touched, not 365 rows/year. A missing day contributes 0 to totals and is non-qualifying, which is the correct default.
- **Superset-sized increments (default 25 / 15 / 30), editable.** A +1 button would be absurd for someone doing sets of 25 — each tap logs one superset. Increments and daily targets both live in a "Daily bundle" Settings section using the existing `NumberRow` (save-on-blur, inline ✓). Targets floor at 1 (a 0 target breaks the intensity math); increments floor at 1 (a 0 increment makes ± a no-op).
- **Tap-to-type for exact entry.** Tapping the today count swaps the number for a dark-block numeric input (same pattern as the cardio duration field), so an odd count (e.g. 40 after a long set) is one tap away without spamming the + button.
- **Today-only logging.** The log section edits today's row; the grid is a read-only week view. Unlike cardio (discrete past sessions worth backdating), the bundle is a same-day habit check — retroactive editing isn't a need yet.

### What shipped

**Schema:**
- Dexie v9 adds `bundle_logs` (id, user_id, date, pushups, ab_rolls, calf_raises, created_at, updated_at), indexed on user_id + date. Six `user_preferences` bundle fields backfilled via the v9 upgrade hook.

**Helpers (`src/lib/bundleHelpers.ts`):**
- `getTodayBundleLog()` / `getBundleWeek(startOfWeek)` — today's row (or null) and the week's seven rows via indexed `.anyOf` lookups.
- `upsertBundleLog(date, field, value)` — create-or-update one rep-field per write, floor 0, through the synced* wrappers.
- `isDayQualifying(log)` — any reps at all.
- `getDayIntensity(log, prefs)` — `none / low / medium / full` from combined progress vs daily targets, with `full` gated on all three individual targets.
- `getWeeklyTotals(weekLogs)` — per-exercise sums across the week.
- `computeBundleStreak(allLogs)` — `{ currentStreak, longestStreak }`; consecutive closed weeks with ≥ 4 qualifying days, current week excluded.

**DailyBundleCard:**
- Mounted at `<DailyBundleCard />` in `src/pages/Dashboard.tsx`, directly below `<DeliveryStreakCard />`, separated by the standard #3a3a3a divider.
- Header: mint "DAILY BUNDLE" micro-label left; "N weeks on target" (14px #f0f0f0) + "Best: Nwk" (11px #777) right.
- Sun→Sat intensity grid (44px squares, color ramp by intensity, day initial colored per band, 2px mint border nudge on an unlogged today) + 9px day-initial label row below.
- Three weekly progress bars (deep-green fill on #3a3a3a track, total vs daily×4, number shows true total past the visual cap).
- "N of 4 days this week" line, flipping to mint "✓ Week on track" at 4+.
- Today-only log section: three rows, each with the exercise name, a tap-to-type count, and 44×44 −/+ buttons stepping by the configured increment.

**Settings:**
- New "Daily bundle" section with six `NumberRow` fields (three targets, three increments). Increment fields carry the "Amount added per tap on the bundle card." hint.

### Known follow-ups carried into next build

- **Bundle history surface.** Only the current week is visible. `getBundleWeek` is shaped so a `getBundleRange(start, end)` is a one-line swap when a month/year heatmap becomes interesting.
- **Per-exercise streaks / PRs.** The data supports "longest push-up streak" or "most reps in a day" — not surfaced yet; revisit if the user asks for per-exercise depth.
- **Custom bundle exercises.** Three exercises are hard-coded as columns. If the user adds a fourth movement, a child `bundle_exercises` table (like `cardio_types`) is the right reshape — flagged, not built.
- **Configurable weekly day target.** The "≥ 4 days/week" threshold is a constant. If the user's cadence shifts, it moves to Settings; locked at 4 for now per the brief.
- **Retroactive day editing.** Today-only for now. A long-press on a past grid square could open that day for editing if the need appears.

### Current state

- **Schema**: Dexie v9. Fourteen tables, all `user_id`-keyed. `bundle_logs` added; `user_preferences` gains six bundle fields.
- **Dev experience**: `npm run dev` boots clean, every Build 2.4 commit type-checks, `npm run build` succeeds.
- **Tree clean**, 6 new commits descriptive (including this docs commit), Vercel-safe author email throughout.

---

## Build 2.5 session log — May 24, 2026

End-of-session checkpoint for dashboard reorder + section customization. The user can now drag dashboard sections into any order, rename them inline, and show/hide them — from a reorder mode entered via a header "Reorder" pill or a bottom "Reorder sections" button. Layout persists per-user on `user_preferences`.

### Commits (chronological)

| # | Hash | Message |
|---|---|---|
| 1 | `b0481b9` | feat(db): schema v10 — dashboard section order + config on user_preferences |
| 2 | `8665ffd` | feat(hooks): useDashboardConfig — parse/serialize section order + config |
| 3 | `3b0c994` | feat(dashboard): reorder mode — drag, rename, show/hide sections |
| 4 | _(this commit)_ | docs: v2.2 Build 2.5 session log |

### Schema delta (Dexie v10)

| Change | Detail |
|---|---|
| `user_preferences` +2 columns | `dashboard_section_order` (JSON `string[]` of section keys) and `dashboard_section_config` (JSON `{ key: { label, visible } }`). Defaults: canonical order `['lifting','cardio','nutrition','delivery_streak','daily_bundle','apple_watch']`, all visible, Title-Case labels. Backfilled on the existing prefs row via the v10 upgrade hook; fresh installs seed them in `buildDefaultPreferences`. No index change. |

Still fourteen tables; no new stores. JSON-on-prefs was chosen over a `dashboard_sections` table because the data is a single small per-user blob with no query needs — a table would be six rows of ceremony for something read all-at-once.

### Decisions made (and why)

- **JSON strings on the existing prefs row, not a new table.** The layout is one small per-user object read in full every render; there's nothing to index or join. Two scalar JSON columns keep the schema flat and the read a single `get`. `useDashboardConfig` owns parse/serialize so no other code touches the raw strings.
- **Defensive parse — defaults merged in, unknown keys dropped.** The hook rebuilds config/order over the *known* key set each read: missing keys backfill from defaults (a future section appears automatically), unknown/stale keys are ignored, malformed JSON falls back. The persisted blob can never wedge the dashboard.
- **Labels render from config, not hardcoded.** Each section component takes a `label` prop sourced from the stored config, so a rename shows on the live dashboard instantly. SectionLabel still uppercases, so default casing only matters on the reorder card.
- **Reorder mode is local React state.** No route, no modal — the dashboard swaps content in place. Lower friction, and the back button doesn't become an accidental "cancel."
- **Persist-on-action, not persist-on-Done.** Every drag/rename/toggle writes immediately via `updateOrder` / `updateSection`; Done (✓) only exits. A phone user can't lose edits by forgetting to save, and the reorder view doubles as the editor.
- **At least one section must stay visible.** Hiding the final visible section is refused with an inline message — an empty dashboard is never valid. Enforced in the UI (the hook stays a pure writer).
- **Drag reuses the active-session DnD pattern.** HTML5 drag-and-drop with an optimistic local order during the drag, persisted on drop, then cleared once the live query catches up. One proven pattern, two surfaces. **(Reverted same day — see follow-up below.)**

### What shipped

**Schema:** Dexie v10 adds `dashboard_section_order` + `dashboard_section_config` to `user_preferences` (JSON strings), backfilled on upgrade.

**Hook (`src/hooks/useDashboardConfig.ts`):** `orderedSections` (visible, in order), `allSections` (incl. hidden), merged `config`, `updateOrder`, `updateSection`, `loading` — with defensive parsing and loading defaults.

**UI:** `DashboardReorder` (banner + Done, draggable cards with ☰ / eye / pencil, min-visible guard); `DashboardHeader` gains a "Reorder" pill; each section component takes a `label`; `Dashboard` renders `orderedSections` via a key→component registry and hosts the reorder state + bottom "Reorder sections" button. New `green-mid` (#1a6b4a) token and `shadow-card` elevation.

### Known follow-ups carried into next build

- **Reorder affordance discoverability.** Two entry points today; if the header pill feels noisy, the bottom button alone may suffice — revisit after real use.
- **Per-section settings depth.** Rename + show/hide is the current surface. If sections grow options (e.g. per-section targets inline), the pencil could open a small sheet rather than an inline input.
- **Reset to defaults.** No one-tap "restore default layout" yet — easy to add to Settings if the user reorders into a corner.

### Current state

- **Schema**: Dexie v10. Fourteen tables, all `user_id`-keyed. `user_preferences` gains `dashboard_section_order` + `dashboard_section_config`.
- **Dev experience**: `npm run dev` boots clean, every Build 2.5 commit type-checks, `npm run build` succeeds. Reorder verified end-to-end (move cards, hide persists to normal view, min-visible guard fires).
- **Tree clean**, 4 new commits descriptive (including this docs commit), pushed to origin/main, Vercel-safe author email throughout.

### Follow-up — drag-and-drop → arrow buttons (same day)

The drag-and-drop reorder shipped above was replaced with **up/down arrow buttons** the same day: HTML5 DnD is unreliable on iOS Safari (the app's primary target), and arrows are a more honest fit for a touch list. Each reorder card now shows a stacked ↑/↓ pair (44×44, green-mid) in place of the ☰ handle — ↑ disabled + `text-dim` on the first card, ↓ disabled on the last; a tap swaps the section with its neighbor and persists via `updateOrder`. All drag code (draggable attrs, dragstart/over/end handlers, the optimistic `orderOverride`/ghost styling) was removed. Eye toggle, pencil rename, banner, Done, and the min-visible guard are unchanged. New `dim` (#b8c2bc) token for the disabled-arrow color.

---

## Build 2.6 session log — May 24, 2026

End-of-session checkpoint for the mobility tracker plus three smaller fixes. Mobility joins the daily bundle as a fourth component (minutes, not reps, with saved follow-along links); the cardio card becomes a direct entry point; the app respects iOS safe areas; and calf raises inherit the session's squat load. Six commits.

### Commits (chronological)

| # | Hash | Message |
|---|---|---|
| 1 | `1494f4b` | feat(db): schema v11 — mobility fields on user_preferences + bundle_logs |
| 2 | `d6e796c` | feat(bundle): mobility / flexibility tracking on the daily bundle card |
| 3 | `16dae06` | feat(dashboard): cardio tap-to-route + iOS safe-area insets |
| 4 | `44e8a8a` | feat(strength): cross-populate calf raises from the session's squats |
| 5 | `dbdea97` | fix(pwa): bump service worker cache v2 → v3 |
| 6 | _(this commit)_ | docs: v2.3 Build 2.6 session log |

### Schema delta (Dexie v11)

| Change | Detail |
|---|---|
| `bundle_logs` +1 column | `mobility_minutes: number \| null` (null = not logged). Backfilled null on upgrade. |
| `user_preferences` +3 columns | `bundle_mobility_target` (4), `bundle_mobility_min_minutes` (5), `bundle_mobility_youtube_links` (`'[]'` JSON of `{ id, label, url }`). Backfilled on the existing row; fresh installs seed via `buildDefaultPreferences`. |

Still fourteen tables; no new stores. Index lists unchanged.

### Decisions made (and why)

- **Mobility tracks minutes, with a qualifying threshold rather than a hard target.** A session "counts" at `bundle_mobility_min_minutes` (5); minutes beyond that don't push the bar further. Mobility is about showing up and holding the stretch, not maximizing a number — so credit is binary-ish (full once you clear the floor), capped so a 60-min session doesn't dwarf the rep components in the combined-intensity math.
- **Any mobility minutes make the day qualifying.** Same "any work counts" rule as the three rep components — consistent mental model across the bundle, and the streak (`computeBundleStreak`) picks up mobility-only days for free through the shared `isDayQualifying`.
- **Links live in a prefs JSON string, opened in a new tab.** Saved follow-along videos are a tiny per-user list with no query needs — JSON on `user_preferences` (like the dashboard layout), parsed defensively. `window.open(url, '_blank')` hands off to Safari / the YouTube app on iOS rather than trying to embed.
- **Cardio card becomes a direct entry, not an expander.** The lifting tiles already route on tap (Build 2.2); cardio now matches. The expand-in-place session list was low-value next to one-tap logging, so it (and its `SessionList`/`ShortBadge` helpers) was removed.
- **Safe area via a header that re-bleeds into the inset.** Body carries `env(safe-area-inset-top/bottom)` so every page clears the notch and home indicator; the dashboard's green header cancels the top inset with a negative margin and re-pads its content, so the band fills behind the status bar while the text stays below it. One pattern, works for the colored header and the plain pages alike.
- **Calf-raise cross-populate is session-scoped and name-loose.** Adding a calf-raise movement seeds its first set from the session's latest completed squat set — purely within the current session (never prior sessions). Names are matched by substring (`"calf raise"` / `"squat"`, case-insensitive) because the seeded library uses "Calf Raise" and squat *variants* ("Back Squat", "Front Squat", …) rather than the literal "Calf Raises" / "Squats" — substring matching makes the feature actually fire on real data while still catching the exact names.

### What shipped

- **Schema:** Dexie v11 (mobility_minutes + three mobility prefs, backfilled).
- **Helpers (`bundleHelpers`):** mobility in `upsertBundleLog` / `isDayQualifying` / `getDayIntensity` / `getWeeklyTotals`; `parseMobilityLinks` + `MobilityLink`.
- **Card:** "Flex / Mobility" row (±5-min stepper, tap-to-type, qualifying check), "Mobility: X / N days" weekly line, collapsible Links (open / add / delete).
- **Cardio:** `CardioSection` routes to `/log/cardio` on tap; expand-in-place removed.
- **Safe area:** body insets in `index.css`; `DashboardHeader` green bleed; bottom nav inset already present.
- **Strength:** `addExerciseToSession` cross-populates calf raises from session squats.
- **PWA:** service worker `CACHE_NAME` → `physical-health-v3`.

### Verification

`npm run build` clean. Driven headless at 390px: mobility row logs (+5 → check at 5 min, "Mobility: 1/4 days"), links add/persist/render, cardio card routes to `/log/cardio`, and cross-populate confirmed end-to-end (squat 95×8 → newly-added calf raise's first set = 95×8, read back from Dexie). Safe-area insets resolve to 0 in headless (no notch to simulate) — the CSS follows the standard `env()` + negative-margin pattern; worth a glance on a real device.

### Current state

- **Schema**: Dexie v11. Fourteen tables, all `user_id`-keyed. Mobility fields added to `bundle_logs` + `user_preferences`.
- **Dev experience**: `npm run dev` boots clean, every Build 2.6 commit type-checks, `npm run build` succeeds.
- **Tree clean**, 6 new commits descriptive (including this docs commit), pushed to origin/main, Vercel-safe author email throughout.
