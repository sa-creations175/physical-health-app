import { Droplet } from 'lucide-react';
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import DeliveryActivityCard from '../components/activity/DeliveryActivityCard';
import NutritionSetupModal from '../components/nutrition/NutritionSetupModal';
import BodyLogSheet, { type BodyLogMode } from '../components/nutrition/BodyLogSheet';
import {
  getActiveSeason,
  seasonLabel,
  daysInSeason,
} from '../lib/nutritionSeason';
import {
  getLatestBodyStats,
  getLatestMeasurement,
  getCurrentLeanMass,
} from '../lib/bodyComposition';
import {
  getNutritionLogForDate,
  bottlesFromLog,
  setWaterBottles,
} from '../lib/nutritionWater';
import { todayISODate } from '../lib/dateHelpers';
import { SectionLabel, ProgressBar } from '../components/ui/primitives';
import type { NutritionSeason } from '../db/types';
import HeaderStrip from '../components/ui/HeaderStrip';

export default function Nutrition() {
  const today = todayISODate();
  const [setupOpen, setSetupOpen] = useState(false);
  const [bodyLog, setBodyLog] = useState<BodyLogMode | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const toggle = (key: string) => setOpen((cur) => (cur === key ? null : key));

  // Live reads — re-render automatically as rows are written.
  const season = useLiveQuery(() => getActiveSeason(), []);
  const stats = useLiveQuery(() => getLatestBodyStats(), []);
  const measurement = useLiveQuery(() => getLatestMeasurement(), []);
  const leanMass = useLiveQuery(() => getCurrentLeanMass(), []);
  const waterLog = useLiveQuery(() => getNutritionLogForDate(today), [today]);
  const bottles = bottlesFromLog(waterLog);

  return (
    <div className="pb-4">
      <HeaderStrip eyebrow="Body · Nutrition" title="Nutrition" />

      <div className="px-4 mt-4 space-y-3">
        {season === undefined ? null : season === null ? (
          <SetupCard onStart={() => setSetupOpen(true)} />
        ) : (
          <>
            <SeasonStrip season={season} onChange={() => setSetupOpen(true)} />
            <MacrosCard season={season} />
            <WaterCard
              bottles={bottles}
              target={season.water_target_bottles}
              onSet={(n) => void setWaterBottles(today, n)}
            />
          </>
        )}

        <BodyStatsCard
          weight={stats?.weight_lbs ?? null}
          bf={measurement?.bf_percentage ?? null}
          bfSource={measurement?.source ?? null}
          leanMass={leanMass ?? null}
          onWeigh={() => setBodyLog('weigh')}
          onMeasure={() => setBodyLog('measure')}
        />
      </div>

      <div className="px-4 mt-3 space-y-3">
        <DeliveryActivityCard expanded={open === 'delivery'} onToggle={() => toggle('delivery')} />
      </div>

      {setupOpen && (
        <NutritionSetupModal
          onClose={() => setSetupOpen(false)}
          onComplete={() => setSetupOpen(false)}
        />
      )}
      {bodyLog && (
        <BodyLogSheet
          mode={bodyLog}
          onClose={() => setBodyLog(null)}
          onSaved={() => setBodyLog(null)}
        />
      )}
    </div>
  );
}

// ---- Setup CTA (no active season) ------------------------------------------

function SetupCard({ onStart }: { onStart: () => void }) {
  return (
    <div className="card p-4">
      <SectionLabel>Nutrition</SectionLabel>
      <p className="mt-2 text-heading text-ink">Set up your plan</p>
      <p className="mt-1 text-label text-ink leading-snug">
        A few questions about your body and goals generates your daily calorie
        and macro targets, built on your lean mass and real activity, not a
        generic formula.
      </p>
      <button
        type="button"
        onClick={onStart}
        className="btn-primary mt-3 w-full"
      >
        Set up nutrition
      </button>
    </div>
  );
}

// ---- Season context strip --------------------------------------------------

function SeasonStrip({
  season,
  onChange,
}: {
  season: NutritionSeason;
  onChange: () => void;
}) {
  return (
    <div className="card px-4 py-3 flex items-center justify-between">
      <div>
        <span className="pill pill-on">
          {seasonLabel(season.season_type)}
        </span>
        <p className="mt-1.5 text-label text-muted">
          Day {daysInSeason(season)} of this season
        </p>
      </div>
      <button
        type="button"
        onClick={onChange}
        className="pill min-h-[44px]"
      >
        Change season
      </button>
    </div>
  );
}

// ---- Today's macros --------------------------------------------------------

function MacrosCard({ season }: { season: NutritionSeason }) {
  // Logged intake is 0 until meal logging lands (Phase 3b); the bars show live
  // targets so the shell is already wired to the season.
  const bars = [
    { key: 'calories', label: 'Calories', logged: 0, target: season.daily_calories_target, unit: '' },
    { key: 'protein', label: 'Protein', logged: 0, target: season.protein_target_g, unit: 'g' },
    { key: 'carbs', label: 'Carbs', logged: 0, target: season.carbs_target_g, unit: 'g' },
    { key: 'fat', label: 'Fat', logged: 0, target: season.fat_target_g, unit: 'g' },
  ];

  return (
    <div className="card p-4">
      <SectionLabel>Today: Macros</SectionLabel>
      <div className="mt-3 space-y-3">
        {bars.map((b) => (
          <div key={b.key}>
            <div className="flex items-center justify-between text-label">
              <span className="text-ink">{b.label}</span>
              <span className="text-ink">
                <span className="font-medium">{b.logged.toLocaleString()}</span>
                <span className="text-muted"> / {b.target.toLocaleString()}{b.unit}</span>
              </span>
            </div>
            <div className="mt-1">
              <ProgressBar value={b.logged} max={b.target} height={8} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-hairline space-y-1.5">
        <AwarenessRow label="Fiber" guideline={`aim ≥ ${season.fiber_guideline_g}g`} />
        <AwarenessRow label="Sodium" guideline={`stay under ${season.sodium_guideline_mg.toLocaleString()}mg`} />
        <AwarenessRow label="Sugar" guideline={`stay under ${season.sugar_guideline_g}g`} />
      </div>

      <p className="mt-3 text-label text-muted leading-snug">
        Meal logging arrives next. Your targets above are live now.
      </p>
    </div>
  );
}

function AwarenessRow({ label, guideline }: { label: string; guideline: string }) {
  return (
    <div className="flex items-center justify-between text-label">
      <span className="text-ink">{label}</span>
      <span className="text-muted">{guideline}</span>
    </div>
  );
}

// ---- Water -----------------------------------------------------------------

function WaterCard({
  bottles,
  target,
  onSet,
}: {
  bottles: number;
  target: number;
  onSet: (n: number) => void;
}) {
  // Render at least the target's worth of slots, plus any overflow already
  // logged. Tap the next empty bottle to add one; long-press a filled bottle
  // to remove one.
  const slots = Math.max(target, bottles);
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <SectionLabel>Water</SectionLabel>
        <span className="text-label text-muted">
          <span className="text-ink font-medium">{bottles}</span> / {target} bottles
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {Array.from({ length: slots }, (_, i) => {
          const filled = i < bottles;
          return (
            <BottleButton
              key={i}
              filled={filled}
              onAdd={() => onSet(i + 1)}
              onRemove={() => onSet(bottles - 1)}
            />
          );
        })}
      </div>
      <p className="mt-3 text-label text-muted">
        Tap to add a bottle (1000ml). Long-press a full bottle to remove.
      </p>
    </div>
  );
}

function BottleButton({
  filled,
  onAdd,
  onRemove,
}: {
  filled: boolean;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const [held, setHeld] = useState(false);

  function startHold() {
    if (!filled) return;
    const t = window.setTimeout(() => {
      setHeld(true);
      onRemove();
    }, 450);
    const clear = () => {
      window.clearTimeout(t);
      window.removeEventListener('pointerup', clear);
      window.removeEventListener('pointercancel', clear);
    };
    window.addEventListener('pointerup', clear);
    window.addEventListener('pointercancel', clear);
  }

  return (
    <button
      type="button"
      aria-label={filled ? 'Bottle (long-press to remove)' : 'Add bottle'}
      onPointerDown={startHold}
      onClick={() => {
        // A long-press already removed; swallow the trailing click.
        if (held) {
          setHeld(false);
          return;
        }
        if (!filled) onAdd();
      }}
      className={`w-9 h-12 rounded-md border flex items-center justify-center ${
        filled
          ? 'bg-green-700 border-green-700 text-white'
          : 'bg-white border-hairline text-hint'
      }`}
    >
      <Droplet aria-hidden="true" size={18} strokeWidth={2} fill={filled ? 'currentColor' : 'none'} />
    </button>
  );
}

// ---- Body stats ------------------------------------------------------------

function BodyStatsCard({
  weight,
  bf,
  bfSource,
  leanMass,
  onWeigh,
  onMeasure,
}: {
  weight: number | null;
  bf: number | null;
  bfSource: string | null;
  leanMass: number | null;
  onWeigh: () => void;
  onMeasure: () => void;
}) {
  return (
    <div className="card p-4">
      <SectionLabel>Body Stats</SectionLabel>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat label="Weight" value={weight !== null ? `${weight}` : '—'} unit="lbs" />
        <Stat label="Body fat" value={bf !== null ? `${bf}` : '—'} unit="%" />
        <Stat label="Lean mass" value={leanMass !== null ? `${leanMass}` : '—'} unit="lbs" />
      </div>
      {bf !== null && bfSource && (
        <p className="mt-2 text-label text-muted">
          Body fat from {SOURCE_LABEL[bfSource] ?? bfSource}.
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onWeigh}
          className="btn-secondary flex-1"
        >
          Log weigh-in
        </button>
        <button
          type="button"
          onClick={onMeasure}
          className="btn-secondary flex-1"
        >
          Log measurements
        </button>
      </div>
    </div>
  );
}

const SOURCE_LABEL: Record<string, string> = {
  navy_method: 'Navy Method',
  dexa: 'DEXA scan',
  ai_photo_estimate: 'AI estimate',
  visual_estimate: 'visual chart',
};

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="tile px-3 py-2.5">
      <span className="block text-label text-muted">{label}</span>
      <span className="text-title text-ink tabular-nums">{value}</span>
      <span className="text-label text-muted"> {unit}</span>
    </div>
  );
}
