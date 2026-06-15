# Body App — Design Session, June 5, 2026

Append this to `PHYSICAL_HEALTH_APP_DESIGN_DOC_v1.md`. Captures decisions from a design conversation working through real-use notes. Two big designs (pillar color/fill system, Fitness Score + hype narrative) plus seven smaller note resolutions. Some items remain to design next session (flagged at the end).

---

## Pillar color + progress-fill system (DESIGNED — build ready)

The Fitness page is visually dense (all-green) and hard to scan. Fix: give each pillar its own color, ordered warm→cool down the page, and let each card fill left-to-right with its color proportional to weekly progress.

### Palette (each pillar: fill color / text color)
| Pillar | Fill | Text | Feeling |
|---|---|---|---|
| Daily Bundle | `#e0742f` | `#c25a1d` | warm orange — fundamentals / the pump |
| Cardio | `#e8b520` | `#a8810e` | gold — energy, heart, fat loss |
| Lower Body | `#1a6b4a` | `#1a6b4a` | mid-green — foundation |
| Upper Body | `#2a7d6f` | `#216358` | pine/blue-green — chisel |
| Mobility | `#378ADD` | `#2a6db5` | cool blue — serenity |

- Default card order top→bottom: **Daily Bundle → Cardio → Lower → Upper → Mobility** (warm→cool thermal gradient).
- `#0f3d2e` (deep green) is RESERVED for app chrome (hero bands, icon) — no pillar may claim it. (This is why Upper Body got pine, not deep green.)
- Apple Watch row is a data source, not a pillar — neutral/slate, no fill.

### Fill behavior
- Each card fills left-to-right with a soft tint of its color, width = `min(progress/target, 1) * 100%`.
- Fill opacity stays subtle (~0.10–0.18) so the page reads calm. A near-full week looks rich; an empty card is plain white.
- **Complete** (progress ≥ target): full tint + colored border + ✓ (extends the existing mint-stripe celebration).
- Overshoot (e.g. 6/5 cardio): fill clamps at 100%, show real count / "+N over" per existing cardio-card pattern.
- Target 0 (e.g. Full Body when unused): never fills, never celebrates (existing guard).

### Caveat
The thermal gradient is a *default order*. The Build 2.5 section-reorder lets the user move sections, which breaks the gradient — that's fine; per-card colors still carry meaning individually. Gradient is a default-state nicety, not enforced.

---

## Fitness Score (DESIGNED — build ready)

Answers "did I hit my marks this week?" Honest scorecard, not a flattering single grade. Lives on **Home**. Shows this-week primary; last-week comparison is a later nicety (not required v1).

### Layout: dial + bars + daily-average strip
- **Dial (left):** one big % = the week's overall fullness. Formula: average of each mark's fill fraction, **each clamped at 100%**, divided by the number of participating marks. Target-0 marks drop out entirely. Mid-week it climbs as bars fill (feels alive). NOT a marks-hit count — that was rejected as redundant/confusing.
- **Bars (right):** one horizontal fill bar per mark, in pillar color, `actual/target` label. The honest breakdown.
- **Daily-average strip (below divider):** Calories burned, Exercise minutes, Steps — shown as **avg/day** (a week-total of calories is meaningless).

### The seven marks
Bundle /target · Cardio /target · Lower /target · Upper /target · Mobility /target · Calories (daily avg vs daily target) · Exercise minutes (daily avg vs daily target).

### Weighting decision
**Equal-weighted to start.** Simulations showed the known tension: a cardio-heavy / skipped-lifts week can score HIGHER than a strong-lifting / light-everything-else week, even though lifting is the stated priority. We accept equal weighting for v1 because the **narrative layer** (below) carries the priority-awareness the flat number can't. Revisit weighting only if real use shows the number consistently disagreeing with what mattered.

### CRITICAL CONSTRAINT — everything reads live from `user_preferences`
All fills, the dial, and the narrative must reason about **fill FRACTIONS against live targets**, never raw counts or hardcoded targets. If the user changes a weekly threshold in Settings, the score and narrative must adjust automatically. "Hit 2" means 100% at a target of 2, but 50% at a target of 4 — the narrative keys off the fraction, never the count. Also needs to know **days elapsed this week** to soften early-week judgments.

### Settings additions needed
- Daily exercise-minutes target (new). Daily steps + daily calories targets already exist from the dashboard; reuse them.
- (Confirm whether cardio/calorie targets need a weekly vs daily distinction — daily avg is the model, so daily targets suffice.)

---

## Pillar hype narrative (DESIGNED — build ready)

Each pillar has its OWN voice and its own *why* — not a generic week-shape summary. Tone: **hype-man, confident, body-aesthetic-forward, swagger** (matches the Flying/Cruising/Crawling spirit). Never scolding even when lagging.

### Placement: BOTH
- **On each pillar card:** a callout under the card (left-border in pillar color), always present, contextual to that card's progress.
- **In the Fitness Score summary:** surfaces a rotating **win + nudge** pair (see summary logic).

### Mechanics
- Each pillar picks a TIER from its live fill fraction: **Crushing** (≥0.8), **On track** (~0.3–0.8), **Lagging** (≤0.3) — all relative to live `user_preferences` targets.
- Rotate randomly within the chosen tier so phrases stay fresh.
- Target-0 pillars stay silent.

### Summary callout logic (four states)
1. **Mostly good, something behind** → show a **win** (strongest pillar) + a **nudge** (most-behind pillar).
2. **All caught up** → win + win (or win + "firing on all cylinders" all-clear).
3. **All lagging BUT early in the week** → gentle "early days, plenty of week left" (the early-week guard prevents grim Monday scores).
4. **All lagging AND week is slipping by** → drop individual callouts, show one unified kick (the "all-low" tier below).

### Phrase bank (starter — expand over time; structure takes unlimited phrases/tier)

**LOWER BODY** — wheels / foundation / power
- Crushing: "Your legs are gonna look UNREAL if you keep this up." · "Tree trunks in progress. The foundation is being built." · "Leg day royalty. The squats are paying off." · "Wheels of steel. Nobody's skipping you on leg day." · "Quads, hams, glutes — all eating this week." · "Building a base most people never touch. Respect."
- On track: "Wheels coming along nicely. Keep stacking sessions." · "Foundation's solid this week — legs are working." · "Legs are putting in honest work. Stay on it." · "Good leg volume. The trunks are listening."
- Lagging: "Don't skip leg day — the whole house sits on this foundation." · "Legs are quiet this week. One session and you're back." · "No foundation, no gains up top. Hit the squat rack." · "The wheels need a turn. Get under the bar."

**UPPER BODY** — chisel / boulder shoulders
- Crushing: "Boulder shoulders incoming. Arms getting CHISELED." · "Upper body's on fire — the chisel is real." · "Delts popping, chest filling out. Keep hammering." · "Sleeves are getting tighter. That's the goal." · "T-shirt's about to fit different. Keep pressing." · "Cannons for arms. The work shows."
- On track: "Arms are coming in. Stay on the press." · "Shoulders building nicely this week." · "Upper body's trending right. Keep the volume." · "Chest and back getting their reps. Solid."
- Lagging: "Those boulder shoulders won't build themselves — get a press in." · "Upper body's lagging. Time to pump the chisel." · "Arms are hungry. Feed 'em a session." · "The chisel needs the hammer. Hit upper soon."

**CARDIO** — fat loss / heart health / the engine
- Crushing: "You've REALLY been moving. Heart's getting stronger, leaning right out." · "Engine's humming. Fat's on the run this week." · "Cardio king. The heart thanks you." · "Conditioning on point — wind for days." · "Burning clean this week. The leanout is real." · "Ticker's getting tougher every session."
- On track: "Good movement this week — keep the engine warm." · "Heart's getting its work. Stay on it." · "Cardio's ticking along. Keep the sweat coming." · "Steady conditioning. The engine likes routine."
- Lagging: "Engine's been idle — a session or two melts fat and feeds the heart." · "Cardio's low. Get the blood pumping." · "The heart wants a workout too. Lace up." · "Leanout stalls without the engine. Get moving."

**DAILY BUNDLE** — fundamentals / the daily pump (pushups, core, calves)
- Crushing: "Locked IN. Pushups, core, calves — the basics are dialed." · "Vanity muscles firing daily. Chest, abs, calves — pumped." · "Discipline on lock. The little things add up huge." · "Every day a little pump. That's how it compounds." · "Core tight, calves popping. The details matter." · "The basics never miss with you. Elite habit."
- On track: "Basics are happening. Keep the daily pump going." · "Core and calves getting their reps. Stay consistent." · "Fundamentals ticking over. Don't break the chain." · "Daily pump's alive. Keep showing up."
- Lagging: "The bundle's the easy win — drop and give me some pushups." · "Fundamentals slipped. Five minutes locks it back in." · "Pushups, core, calves. Two minutes, no excuses." · "The daily pump misses you. Knock it out."

**MOBILITY** — serenity / longevity / stay loose
- Crushing: "Limber and pain-free. Future you is grateful." · "Mobility on point — moving like silk." · "Staying loose. This is the longevity play." · "Joints happy, body open. The smart money move." · "Moving like water this week. Beautiful." · "Recovery game strong. This is how you last."
- On track: "Good stretch work this week. Keep the body open." · "Mobility's ticking along. Stay limber." · "Loose and ready. Keep the routine." · "Body's thanking you for the stretch. Continue."
- Lagging: "Don't forget to stretch — tight muscles, no gains." · "Mobility's at zero. Five minutes keeps you moving free." · "Tight today, sore tomorrow. Roll it out." · "The longevity play needs you. Get loose."

**ALL-LOW unified tier** (state 4 — everything lagging, week slipping)
- "Get up and do SOMETHING. Your body and mind need it."
- "The week's slipping. One move changes the momentum — go."
- "Nothing logged worth bragging about yet. Let's fix that right now."
- "Your body's waiting. Your mind too. Just start."

---

## Smaller note resolutions (DESIGNED)

**1. Apple Watch short-workout misclassification (BUG).** Short Watch strength sessions (the daily bundle, logged as "strength training" on the Watch) are landing as CARDIO in History (confirmed via screenshot: many 9–24 min sessions all tagged cardio). Root cause likely: classifier keys on duration and/or the HealthKit type isn't matching the bundle branch, so everything short falls through to the `everything else → cardio` fallback.
- **Fix:** split bundle vs cardio on **HealthKit workoutActivityType, NOT duration**. Strength types → bundle (≤30 min) or strength session (>30 min); everything else → cardio. Duration only decides bundle-vs-session *within* strength types.
- **Diagnose first:** log the actual `workoutActivityType` of the misclassified short rows before finalizing the rule — they may be coming in as a type not currently mapped.
- User confirmed: he never logs real cardio as a strength workout on the Watch (would be extremely rare), so type is a reliable signal.
- **Escape hatch:** a row should be manually reclassifiable for the rare misfire — rides along with the per-pillar day-detail edit surface (note 4/9), not this fix.

**2. Flex/Mobility links + Fitness header notch.**
- 2a. Fitness page hero header collides with the notch ("This Week" overlapping). Add safe-area top padding (same fix class as Build 2.6).
- 2b. Flex/Mobility "Links" disclosure: keep manual add, ADD a default YouTube search link ("5 min men's mobility / flexibility stretch"), and let Watch-detected mobility (yoga/stretch/mindAndBody/pilates already route to mobility) populate the row too.

**4 + 9. Tappable day-dots → per-pillar day detail (INTERACTION DESIGN).** The 7-day dot rows become tappable. Tapping a dot opens a small surface for **that pillar, on that day**: shows what was logged (incl. Watch imports) AND lets you add/edit. Empty dot → "nothing logged" + add affordance. Scope: per-pillar/per-day (NOT whole-day — that overlaps History).

**5. Daily bundle save confirmation (FEEDBACK, not a bug).** Bundle logging auto-persists fine; it just doesn't *feel* committed. Add confirmation feedback via the existing `useToast()` (and/or a checkmark flash on the row) on each logging action. No save button needed.

**6. Reorder mode for the ACTIVE STRENGTH SESSION (replaces clunky drag-and-drop).** The active lifting session screen (exercises + their sets) currently has clunky drag-and-drop. Replace with a **reorder mode**: tap to enter → exercises collapse to compact name-only rows (sets hidden) → **up/down arrows** move rows → exit → sets expand back. Arrows for reliability (per the documented "arrows over drag on iOS" principle); compact rows keep the whole list in view so movement is short/precise. NOTE: this targets the active session ONLY — the Exercise Library page has no reorder and isn't getting one.

**7. Stale in-progress session / "wrong date" (LIFECYCLE, not a date-math bug).** Starting a session and not finishing it (or starting by accident / to test) leaves an orphan; coming back lands on that stale session stuck on its original date. This is the never-built "resume in-progress session" follow-up from Phase 1.
- **Fix:** on entry to Log Session, detect an unfinished session and surface it: "You have an unfinished [Lower Body] session from [date]" — **with a way to VIEW its contents before deciding**. Three actions: **Resume** (as-is) / **Resume + change date** (correct to today or any date) / **Discard** (hard-delete, sync-aware via `syncedDelete`/`bulkDelete` so it clears from Supabase too).
- Also: make the active session's date editable (extends Build 2.2 editable dates).
- User must see the session before discarding — no blind delete (truth-honoring / full-agency).

---

## TO DESIGN NEXT SESSION (not yet built)

- **Fitness-page per-day breakdown.** Calories / exercise minutes / steps shown day-by-day (S–S) so the week's *shape* is visible (vs the Home daily-average strip). Likely three small per-metric bar/dot rows. Placement (top vs below cards) TBD.
- **History page redesign — OPEN QUESTION.** User is unsure whether History should be broadly editable; leaning toward "edit/fix a specific session" rather than full backfill-anything. Decide scope at design time.
- **#10 Periodic weigh-in updates.** New body-composition data type (recurring). New schema (`weigh_ins` table). Ties to the "decrease/maintain low body fat %" goal.
- **#11 Periodic progress photos.** New data type. Image storage question: local IndexedDB blobs bloat + complicate sync — likely want Supabase Storage, not a table column. Needs a deliberate design pass.
- **Summary callout tie-breaking** (which exact win/nudge to surface) — finalize at build time; lean "celebrate when mostly good, nudge the most-behind pillar when something's clearly lagging," and always pair win + nudge per the four-state logic.
