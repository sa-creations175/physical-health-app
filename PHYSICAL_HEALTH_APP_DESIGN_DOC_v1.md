# Physical Health App — Design Decisions v1

A living document capturing the design philosophy, architecture, and feature decisions for the Physical Health app — part of Silas's Personal OS suite.

Last updated: April 28, 2026 (v1.2)

**What changed in v1.2 (April 28, 2026):** Dashboard lifting card display label changed from `LEGS` to `LOWER` to match the `UPPER` and `FULL BODY` naming pattern. Data layer enum stays `lower`. Updated §Dashboard design and the v1.1 changelog reference below to reflect the new label.

**What changed in v1.1 (April 27, 2026):** Phase 1 scope locked after design review. Resolutions baked into the doc:
- Repo: `git init` + scaffold now, first commit before any feature code; no GitHub remote until Phase 6.
- Display label `LOWER` maps to schema enum `lower`. UI uses display labels, data layer always uses the enum. (Was `LEGS` in v1.1; renamed in v1.2.)
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
- LOWER — `x / target` sessions
- UPPER — `x / target` sessions
- FULL BODY — `x / target` (labeled "optional")

The display label `LOWER` maps to the schema enum value `lower`. UI surfaces always render display labels; the data layer always uses the enum (`upper | lower | full_body | cardio | mobility`).

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
