# Body Health — Nutrition System Design Spec
June 14, 2026

To be appended to PHYSICAL_HEALTH_APP_DESIGN_DOC_v1.md before the next build session.

---

## Overview

Nutrition in the Body app is not obsessive logging. It's a smart, connected system that knows your body, knows your goals, and tells you whether you're on track — with as little friction as possible. The system has three layers that talk to each other continuously.

---

## Layer 1 — Body Profile (the foundation)

Set once at onboarding, updated as your body changes.

### Stable inputs
- Height, age, biological sex

### Recurring inputs
- **Weight:** weekly weigh-in (primary)
- **Body fat %:** bi-weekly Navy Method measurements (circumferences: neck, waist, hips + height). Feeds lean mass calculation automatically.
- **DEXA scan:** manual entry when done. Overrides all other BF% sources as the gold standard. *[TO-DO: book DEXA scan for baseline]*

### BF% source priority
1. DEXA scan (most accurate, infrequent)
2. Navy Method (good accuracy, bi-weekly)
3. AI photo estimate (onboarding shortcut only — see below)

### Lean mass
Calculated automatically: `lean mass = weight × (1 - BF%)`. This is the number macro targets are built from, not total weight. Updates every time a new weigh-in or BF% measurement is logged.

### Onboarding BF% flow
Two options shown side by side:
- **Visual reference chart** — body fat % reference images for men, user picks the closest range
- **AI photo estimate** — user uploads a photo, AI returns a range (e.g. "roughly 15–20%") not a false precise number. Labeled clearly: "rough estimate — do the tape measure bi-weekly for real tracking"

Both options produce a starting range. User confirms or adjusts before it's saved.

---

## Layer 2 — Season + Targets (the engine)

The macro calculator. Changes deliberately 2–4x per year when goals shift.

### Season selection — goal-first, not label-first

Don't ask "Cut / Maintain / Build?" directly. Ask questions:
1. "How do you want your body to look and feel?" — options: Leaner / Bigger / Both (lean + muscular) / Just maintain what I've built
2. "What's your timeline feeling like?" — options: Slow and sustainable / Moderately urgent / As fast as responsibly possible
3. "Where are you most focused right now?" — options: Overall leanness / Upper body size / Lower body strength / Athletic conditioning / Balanced

Answers map to a season recommendation with visible reasoning:
> "Based on your goals, we recommend a **moderate cut**. Here's what that means: ~350 calorie daily deficit, protein stays high to protect your muscle, carbs reduced on rest days. You'll see the difference in about 8–10 weeks at this pace."

User sees the full before/after target change and confirms. Never a blind switch.

### Season types and their math
| Season | Calorie adjustment | Protein | Carbs | Fat |
|---|---|---|---|---|
| Cut (aggressive) | −500 cal/day | 1.0–1.1g/lb lean mass | Lower | Moderate |
| Cut (moderate) | −300–350 cal/day | 1.0g/lb lean mass | Moderate | Moderate |
| Maintain | At TDEE | 0.8–1.0g/lb lean mass | Higher | Moderate |
| Build (lean) | +250 cal/day | 1.0g/lb lean mass | Higher | Moderate |
| Build (aggressive) | +400–500 cal/day | 0.9g/lb lean mass | High | Moderate |

### TDEE calculation — uses real Watch data, not generic multipliers

```
BMR (Harris-Benedict from height / weight / age / sex)
+
Rolling 90-day average active calories (from HealthKit)
= Personalized TDEE

TDEE + season adjustment = Daily calorie target
→ Macro split applied
→ All targets generated
```

The 90-day window is rolling — updates automatically as new Watch data comes in. No manual refresh needed. If less than 90 days of data exists, uses available history with a note.

### Generated targets
**Primary macros (hard targets):**
- Daily calories
- Protein (grams)
- Carbohydrates (grams)
- Fat (grams)

**Secondary nutrients (awareness guidelines — stay under/over):**
- Fiber: stay above X grams (guideline, not a hard target)
- Sodium: stay under X mg
- Sugar: stay under X grams

**Hydration:**
- Water target in **1000ml bottles** (your unit). Target derived from lean mass + activity level. Typical range: 3–4 bottles/day. One tap = one bottle logged.

### Season switching UI
- Accessible from Nutrition tab (prominent) AND Settings
- Re-runs the goal questions → generates new targets → shows before/after comparison → user confirms
- Full history of past seasons preserved (when you were cutting, what your targets were)

---

## Layer 3 — Daily Logging (the habit)

Four input methods, all feeding the same daily totals. Use whichever is fastest for that meal.

### Method 1: Tap to log (meal service meals)
Saved meals library. Add your Clean Eatz / Fuel Meals meals once with their exact macros. Tap to log — all macros update instantly. No thinking required for known meals.

### Method 2: Pick from saved meals
Personal library of meals you eat regularly (home-cooked, restaurant orders you repeat). Add once, tap forever. Macros stored exactly.

### Method 3: AI description
Describe a meal in plain language: "grilled chicken breast, brown rice, broccoli with olive oil." AI estimates all macros including fiber/sodium/sugar. Returns a range when uncertain ("~45–55g protein"). User confirms before logging.

### Method 4: Barcode scan
For packaged food. Scan → macros pulled from product database → confirm → logged.

---

## Apple Watch Recovery Intelligence

Surfaces data, never decides for you.

### What gets surfaced
- **HRV trend** (heart rate variability — lower = more stressed/fatigued)
- **Resting HR trend** (elevated = under-recovered)
- **VO2 max trend** (improving cardio fitness over time)
- **Sleep** (if Watch worn to bed — affects recovery and TDEE)

### How it surfaces
A recovery card on the Nutrition tab (or Home) showing current signals with plain-language interpretation:

> "Your HRV has been lower than your baseline for 4 days and resting HR is up 6 BPM. Your body may be under more stress than usual. Some people find this is a good week to eat at maintenance rather than a deficit — your call."

Never prescriptive. Always shows the data behind the interpretation. User decides.

### What it does NOT do
- Never automatically changes your targets
- Never tells you what to do
- Never fires this as a prompt during an active session

---

## AI Body Goal Visualization

### What it does
User uploads a current photo. AI generates 2–3 variants showing what their body could look like at different body composition targets — leaner, more muscular, or both — based on THEIR actual body, not a generic reference.

### Framing (critical)
- Labeled explicitly as "directional and approximate — not a prediction or promise"
- Presented as inspiration, not obligation
- Tied to the selected season goal: "Here's roughly what a moderate cut over 12 weeks could look like on your frame"
- User controls whether this is shown or skipped

### Privacy
- Photo processing happens via AI API call
- Photo is not stored server-side beyond the API call
- User gives explicit consent before upload
- Generated variants stored locally only (not synced to Supabase unless user opts in)

### When it appears
- During initial nutrition setup (optional step)
- When switching seasons (optional — "want to visualize this goal?")
- Accessible from Body Profile at any time

---

## UI Layout

### Home tab — Nutrition summary card
- Calorie ring or bar: X / target (primary)
- Protein bar: X / target (most important macro at a glance)
- Water: X bottles / target (tap to add a bottle directly from Home)
- Recovery signal dot: green (recovered) / amber (monitor) / red (stressed) — tappable for detail

### Nutrition tab — full detail

**Top: Season context strip**
Current season pill (e.g. "MODERATE CUT") + days in season + quick-switch button

**Section: Today's macros**
Four primary bars: Calories / Protein / Carbs / Fat
Each shows: logged / target, fill bar in pillar color
Below a divider: Fiber / Sodium / Sugar as smaller awareness rows (no fill bar — just number vs guideline, color coded green/amber/red)

**Section: Water**
Bottle row — filled bottles (tapped) + empty bottles (remaining). One tap adds a bottle. Long-press to remove.

**Section: Today's meals**
Chronological log. Each entry shows meal name + top-line macros. Tap to expand full macro breakdown. "+ Log meal" button opens method picker (tap saved / describe / scan).

**Section: Recovery signals**
HRV, resting HR, sleep (if available). Plain-language summary. "See full trend" links to a detail view.

**Section: Body stats**
Current weight (last weigh-in) + BF% (last measurement) + lean mass (calculated). "Log weigh-in" and "Log measurements" buttons. DEXA entry option.

---

## Schema additions needed

```
body_stats
  id, user_id, recorded_at
  weight_lbs, height_inches, age, biological_sex

body_measurements
  id, user_id, recorded_at
  neck_inches, waist_inches, hips_inches
  bf_percentage (calculated from Navy Method)
  source: 'navy_method' | 'dexa' | 'ai_photo_estimate' | 'visual_estimate'
  notes

nutrition_seasons
  id, user_id, started_at, ended_at
  season_type: 'cut_aggressive' | 'cut_moderate' | 'maintain' | 'build_lean' | 'build_aggressive'
  goal_answers (json — the question responses)
  daily_calories_target
  protein_target_g, carbs_target_g, fat_target_g
  fiber_guideline_g, sodium_guideline_mg, sugar_guideline_g
  water_target_bottles

saved_meals
  id, user_id, name, source: 'manual' | 'meal_service' | 'ai_estimated' | 'barcode'
  calories, protein_g, carbs_g, fat_g
  fiber_g, sodium_mg, sugar_g
  last_used_at

nutrition_logs (reshape existing)
  id, user_id, logged_at
  meal_entries (json array of saved_meal refs + macro snapshots)
  water_bottles_logged
  daily totals computed at query time from entries

recovery_signals (if not already captured)
  id, user_id, recorded_at
  hrv_ms, resting_hr_bpm, vo2_max, sleep_hours
  source: 'healthkit'
```

---

## Build phasing

### Phase 3a — Body profile + macro calculator
- Body stats input (height/weight/age/sex)
- BF% onboarding (visual chart + AI photo estimate)
- Navy Method measurement flow (bi-weekly)
- Season setup (goal questions → targets generated)
- Nutrition tab shell wired to live targets
- Water logging (bottle unit)

### Phase 3b — Daily macro logging
- Saved meals library
- AI description logging
- Barcode scan
- Nutrition tab full detail view
- Home summary card wired

### Phase 3c — Intelligence layer
- HealthKit recovery signals (HRV, resting HR, VO2 max)
- Recovery card on Nutrition tab
- Rolling TDEE recalibration from Watch data
- AI body goal visualization

### Phase 3d — Meal service integration
- Dedicated "Meal service meals" section in saved meals library
- Pre-loaded macro data for Clean Eatz Kitchen / Fuel Meals common meals
- One-tap logging flow

---

## Key principles carried through

- **Deduce from signals** — TDEE comes from real Watch data, not a self-reported dropdown
- **User agency always** — recovery signals inform, never decide
- **Honest metrics** — AI photo estimate is a range, not a false precise number
- **Season-aware** — every target knows the current goal and adjusts automatically
- **Lean mass, not total weight** — all macro math built on the number that actually matters
- **One tap for known meals** — friction lives in setup, not in daily use
