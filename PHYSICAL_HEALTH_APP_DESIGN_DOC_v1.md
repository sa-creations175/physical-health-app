# Physical Health App — Design Decisions v1

A living document capturing the design philosophy, architecture, and feature decisions for the Physical Health app — part of Silas's Personal OS suite.

Last updated: May 2, 2026 (v1.6)

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

| Role | Value | Usage |
|---|---|---|
| Background | `#2a2a2a` | App base — true charcoal, no blue cast |
| Card surface | `#686868` | All cards, panels, expandable sections |
| Card border | `#555` | Subtle separation between cards |
| Primary text | `#f0f0f0` | All primary numbers and headings on cards |
| Secondary text | `#aaa` | Labels, sublabels inside cards |
| Hint text | `#777` | Date, week number, section micro-labels |
| Dividers | `#3a3a3a` | Horizontal rules between sections |
| Green primary | `#0F6E56` | CTA buttons, supplement done pills, progress bars |
| Green label | `#5DCAA5` | Section labels on grey cards (readable mint) |
| Green text light | `#9FE1CB` | Text on green backgrounds |
| Green dark | `#3B6D11` | Progress bar fills, sparkline dots |
| Blue accent | `#185FA5` | Water tracking bar |
| Red / alert | `#E24B4A` | Stale indicators, missed targets |

### Typography

All text is system sans-serif (SF Pro on iOS, Inter fallback). No custom fonts in Phase 1.

- Day / header: 22px, weight 500, `#f0f0f0`
- Date subheader: 12px, weight 400, `#777`
- Section micro-label: 9px, weight 500, letter-spacing 0.06em, `#5DCAA5` (on cards) or `#777` (on background)
- Stat number: 19–22px, weight 500, `#f0f0f0`
- Stat denominator: 12px, weight 400, `#777`
- Body / row label: 12–13px, weight 400, `#aaa` or `#ddd`
- Body value: 12–13px, weight 500, `#f0f0f0`

### Key aesthetic rules

- Charcoal base, grey card surfaces — never pure black, never white
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
- Day name (large, white)
- Date + week number (small, muted)
- Streak pill (green background, mint text) — top right. Counts consecutive days with at least one strength OR cardio session logged. Mobility, nutrition, and supplements alone do not contribute to the streak.

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
```

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
- Register prompt triggers (mobility stale, progressive overload, supplement missed, weekly cardio, health overdue, week review) into the orchestrator built in step 8.
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
