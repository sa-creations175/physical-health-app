import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { SectionLabel } from '../components/ui/primitives';
import {
  getUserPreferences,
  updateUserPreferences,
  TARGET_RANGES,
} from '../lib/userPreferences';
import NutritionSetupModal from '../components/nutrition/NutritionSetupModal';
import { getActiveSeason, seasonLabel } from '../lib/nutritionSeason';
import HeaderStrip from '../components/ui/HeaderStrip';
import Switch from '../components/ui/Switch';

export default function Settings() {
  const prefs = useLiveQuery(() => getUserPreferences(), []);
  const season = useLiveQuery(() => getActiveSeason(), []);
  const [seasonSetup, setSeasonSetup] = useState(false);

  if (!prefs) {
    return (
      <div className="px-4 pt-8 text-muted text-label">Loading…</div>
    );
  }

  return (
    <div className="pb-8">
      <HeaderStrip
        eyebrow="Settings"
        title="Settings"
        subtitle="Targets save automatically when you tap away from the field."
      />
      <div className="px-4">

      <section className="mt-6">
        <SectionLabel>Nutrition Season</SectionLabel>
        <p className="text-label text-muted mt-1">
          {season
            ? `Current: ${seasonLabel(season.season_type)}. Re-runs the goal questions and shows a before/after before switching.`
            : 'Set up your macro targets from your body and goals.'}
        </p>
        <button
          type="button"
          onClick={() => setSeasonSetup(true)}
          className="btn-primary mt-2"
        >
          {season ? 'Change season' : 'Set up nutrition'}
        </button>
      </section>

      <section className="mt-6">
        <SectionLabel>Goals</SectionLabel>
        <Link to="/" className="card px-4 py-3 mt-2 flex items-center justify-between gap-3">
          <span className="min-w-0">
            <span className="block text-body text-ink">Weekly and daily goals</span>
            <span className="block text-label text-muted mt-0.5">
              Set on Home: tap Edit goals on the Fitness Score or on the daily averages.
            </span>
          </span>
          <span className="text-label font-bold text-green-700 shrink-0">Home →</span>
        </Link>
      </section>

      <section className="mt-6">
        <SectionLabel>Daily Nutrition</SectionLabel>
        <p className="text-label text-muted mt-1">
          Saved now — Phase 3 lights up dashboard tracking.
        </p>

        <NumberRow
          label="Protein"
          hint="grams per day"
          value={prefs.protein_grams_daily}
          min={TARGET_RANGES.protein_grams.min}
          max={TARGET_RANGES.protein_grams.max}
          onCommit={(v) =>
            updateUserPreferences({ protein_grams_daily: v })
          }
        />
        <NumberRow
          label="Water"
          hint="glasses per day"
          value={prefs.water_glasses_daily}
          min={TARGET_RANGES.water_glasses.min}
          max={TARGET_RANGES.water_glasses.max}
          onCommit={(v) =>
            updateUserPreferences({ water_glasses_daily: v })
          }
        />
        <NumberRow
          label="Vegetables"
          hint="servings per day"
          value={prefs.veg_servings_daily}
          min={TARGET_RANGES.veg_servings.min}
          max={TARGET_RANGES.veg_servings.max}
          onCommit={(v) =>
            updateUserPreferences({ veg_servings_daily: v })
          }
        />
      </section>

      <section className="mt-6">
        <SectionLabel>Daily Bundle</SectionLabel>
        <p className="text-label text-muted mt-1">
          Daily rep targets, and the amount each tap adds on the dashboard card.
        </p>

        <NumberRow
          label="Push-up target"
          hint="reps per day"
          value={prefs.bundle_pushup_target}
          min={TARGET_RANGES.bundle_target.min}
          max={TARGET_RANGES.bundle_target.max}
          onCommit={(v) =>
            updateUserPreferences({ bundle_pushup_target: v })
          }
        />
        <NumberRow
          label="Ab roll target"
          hint="reps per day"
          value={prefs.bundle_abroll_target}
          min={TARGET_RANGES.bundle_target.min}
          max={TARGET_RANGES.bundle_target.max}
          onCommit={(v) =>
            updateUserPreferences({ bundle_abroll_target: v })
          }
        />
        <NumberRow
          label="Calf raise target"
          hint="reps per day"
          value={prefs.bundle_calfraise_target}
          min={TARGET_RANGES.bundle_target.min}
          max={TARGET_RANGES.bundle_target.max}
          onCommit={(v) =>
            updateUserPreferences({ bundle_calfraise_target: v })
          }
        />
        <NumberRow
          label="Push-up increment"
          hint="Amount added per tap on the bundle card."
          value={prefs.bundle_pushup_increment}
          min={TARGET_RANGES.bundle_increment.min}
          max={TARGET_RANGES.bundle_increment.max}
          onCommit={(v) =>
            updateUserPreferences({ bundle_pushup_increment: v })
          }
        />
        <NumberRow
          label="Ab roll increment"
          hint="Amount added per tap on the bundle card."
          value={prefs.bundle_abroll_increment}
          min={TARGET_RANGES.bundle_increment.min}
          max={TARGET_RANGES.bundle_increment.max}
          onCommit={(v) =>
            updateUserPreferences({ bundle_abroll_increment: v })
          }
        />
        <NumberRow
          label="Calf raise increment"
          hint="Amount added per tap on the bundle card."
          value={prefs.bundle_calfraise_increment}
          min={TARGET_RANGES.bundle_increment.min}
          max={TARGET_RANGES.bundle_increment.max}
          onCommit={(v) =>
            updateUserPreferences({ bundle_calfraise_increment: v })
          }
        />
      </section>

      <section className="mt-6">
        <SectionLabel>Thresholds</SectionLabel>
        <p className="text-label text-muted mt-1">
          What counts as a qualifying session.
        </p>

        <NumberRow
          label="Cardio minimum duration"
          hint="Sessions below this are marked short on the dashboard."
          value={prefs.cardio_threshold_minutes}
          min={TARGET_RANGES.cardio_min_minutes.min}
          max={TARGET_RANGES.cardio_min_minutes.max}
          onCommit={(v) =>
            updateUserPreferences({ cardio_threshold_minutes: v })
          }
        />
        <NumberRow
          label="Mobility minimum duration"
          hint="Minimum minutes for a mobility session to count as complete."
          value={prefs.bundle_mobility_min_minutes}
          min={TARGET_RANGES.mobility_min_minutes.min}
          max={TARGET_RANGES.mobility_min_minutes.max}
          onCommit={(v) =>
            updateUserPreferences({ bundle_mobility_min_minutes: v })
          }
        />
      </section>

      <section className="mt-6">
        <SectionLabel>Workout Sessions</SectionLabel>
        <button
          type="button"
          role="switch"
          aria-checked={prefs.one_tap_repeat !== false}
          onClick={() => updateUserPreferences({ one_tap_repeat: prefs.one_tap_repeat === false })}
          className="card w-full px-4 py-3 mt-2 flex items-center justify-between gap-3 text-left"
        >
          <span className="min-w-0">
            <span className="block text-body text-ink">Repeat a set with one tap</span>
            <span className="block text-label text-muted mt-0.5">
              Tap the circle on a set you haven't typed to log it as the same as
              last time. Off: type the set first.
            </span>
          </span>
          <Switch on={prefs.one_tap_repeat !== false} />
        </button>
      </section>

      {seasonSetup && (
        <NutritionSetupModal
          onClose={() => setSeasonSetup(false)}
          onComplete={() => setSeasonSetup(false)}
        />
      )}
      </div>
    </div>
  );
}

function NumberRow({
  label,
  hint,
  value,
  min,
  max,
  onCommit,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  onCommit: (next: number) => Promise<void> | void;
}) {
  const [text, setText] = useState(String(value));
  // Inline save confirmation. The mint ✓ next to the label fades in
  // when the synced-write resolves and fades out ~2s later. Holding a
  // timer ref instead of a Date.now() comparison so a quick re-edit
  // (within the visible window) can clear the previous timeout
  // cleanly and start a fresh 2s window from the new save.
  const [showCheck, setShowCheck] = useState(false);
  const checkTimerRef = useRef<number | null>(null);

  // Mirror the underlying value back into the local input when it changes
  // (e.g., another tab saved, or the value was clamped on the previous commit).
  useEffect(() => {
    setText(String(value));
  }, [value]);

  // Clear any pending fade-out on unmount so a stale timer can't fire
  // setShowCheck on a torn-down component.
  useEffect(() => {
    return () => {
      if (checkTimerRef.current !== null) {
        window.clearTimeout(checkTimerRef.current);
        checkTimerRef.current = null;
      }
    };
  }, []);

  async function commit() {
    const trimmed = text.trim();
    const parsed = trimmed === '' ? 0 : parseInt(trimmed, 10);
    if (Number.isNaN(parsed)) {
      setText(String(value));
      return;
    }
    const clamped = Math.max(min, Math.min(max, parsed));
    if (clamped !== value) {
      // Await the synced-write before flipping the check on — the
      // confirmation is for *save success*, not blur. If onCommit
      // throws, control never reaches the lines below and the check
      // stays hidden, which is the right signal.
      await onCommit(clamped);
      if (checkTimerRef.current !== null) {
        window.clearTimeout(checkTimerRef.current);
      }
      setShowCheck(true);
      checkTimerRef.current = window.setTimeout(() => {
        setShowCheck(false);
        checkTimerRef.current = null;
      }, 2000);
    }
    setText(String(clamped));
  }

  return (
    <div
      className="card px-4 py-3 mt-2 flex items-center justify-between gap-3"
    >
      <div className="min-w-0">
        <p className="text-body text-ink">{label}</p>
        {hint && (
          <p className="text-label text-muted mt-0.5">{hint}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <input
          type="number"
          inputMode="numeric"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          aria-label={label}
          className="input px-2 w-[72px] h-11 text-center"
        />
        <span
          aria-hidden={!showCheck}
          className="text-green-700 w-4 transition-opacity duration-500"
          style={{ opacity: showCheck ? 1 : 0 }}
        >
          <Check size={16} strokeWidth={2.5} />
        </span>
      </div>
    </div>
  );
}
