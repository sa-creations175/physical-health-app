import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import DeliveryActivityCard from '../components/activity/DeliveryActivityCard';
import BundleActivityCard from '../components/activity/BundleActivityCard';
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
import { SectionLabel } from '../components/ui/primitives';
import type { NutritionSeason } from '../db/types';

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
    <div className="pt-8 pb-4">
      <h1 className="px-5 text-[22px] font-medium text-ink">Nutrition</h1>

      <div className="px-5 mt-4 space-y-3">
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

      <div className="px-5 mt-4 space-y-2">
        <DeliveryActivityCard expanded={open === 'delivery'} onToggle={() => toggle('delivery')} />
        <BundleActivityCard expanded={open === 'bundle'} onToggle={() => toggle('bundle')} />
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
    <div className="bg-card shadow-card rounded-2xl p-5">
      <SectionLabel>Nutrition</SectionLabel>
      <p className="mt-2 text-[15px] font-medium text-ink">Set up your plan</p>
      <p className="mt-1 text-[13px] text-ink-body leading-snug">
        A few questions about your body and goals generates your daily calorie
        and macro targets — built on your lean mass and real activity, not a
        generic formula.
      </p>
      <button
        type="button"
        onClick={onStart}
        className="mt-3 w-full rounded-xl py-3 text-[14px] font-medium text-white bg-green-deep min-h-[48px]"
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
    <div className="bg-card shadow-card rounded-2xl px-4 py-3 flex items-center justify-between">
      <div>
        <span className="inline-block text-[10px] tracking-micro uppercase font-semibold text-white bg-green-deep rounded-full px-2.5 py-1">
          {seasonLabel(season.season_type)}
        </span>
        <p className="mt-1.5 text-[12px] text-card-mute">
          Day {daysInSeason(season)} of this season
        </p>
      </div>
      <button
        type="button"
        onClick={onChange}
        className="text-[12px] font-medium text-green-mint min-h-[44px] px-1"
      >
        Change season
      </button>
    </div>
  );
}

// ---- Today's macros --------------------------------------------------------

const MACRO_COLORS = {
  calories: '#0F6E56',
  protein: '#c25a1d',
  carbs: '#e8b520',
  fat: '#378ADD',
};

function MacrosCard({ season }: { season: NutritionSeason }) {
  // Logged intake is 0 until meal logging lands (Phase 3b); the bars show live
  // targets so the shell is already wired to the season.
  const bars = [
    { key: 'calories', label: 'Calories', logged: 0, target: season.daily_calories_target, color: MACRO_COLORS.calories, unit: '' },
    { key: 'protein', label: 'Protein', logged: 0, target: season.protein_target_g, color: MACRO_COLORS.protein, unit: 'g' },
    { key: 'carbs', label: 'Carbs', logged: 0, target: season.carbs_target_g, color: MACRO_COLORS.carbs, unit: 'g' },
    { key: 'fat', label: 'Fat', logged: 0, target: season.fat_target_g, color: MACRO_COLORS.fat, unit: 'g' },
  ];

  return (
    <div className="bg-card shadow-card rounded-2xl p-5">
      <SectionLabel>Today — Macros</SectionLabel>
      <div className="mt-3 space-y-3">
        {bars.map((b) => (
          <div key={b.key}>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-ink-body">{b.label}</span>
              <span className="text-ink">
                <span className="font-medium">{b.logged.toLocaleString()}</span>
                <span className="text-card-mute"> / {b.target.toLocaleString()}{b.unit}</span>
              </span>
            </div>
            <div className="mt-1 h-2 rounded-full overflow-hidden" style={{ background: '#e7ece8' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, b.target > 0 ? (b.logged / b.target) * 100 : 0)}%`,
                  background: b.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-divider space-y-1.5">
        <AwarenessRow label="Fiber" guideline={`aim ≥ ${season.fiber_guideline_g}g`} />
        <AwarenessRow label="Sodium" guideline={`stay under ${season.sodium_guideline_mg.toLocaleString()}mg`} />
        <AwarenessRow label="Sugar" guideline={`stay under ${season.sugar_guideline_g}g`} />
      </div>

      <p className="mt-3 text-[11px] text-card-mute leading-snug">
        Meal logging arrives next — your targets above are live now.
      </p>
    </div>
  );
}

function AwarenessRow({ label, guideline }: { label: string; guideline: string }) {
  return (
    <div className="flex items-center justify-between text-[12px]">
      <span className="text-ink-body">{label}</span>
      <span className="text-card-mute">{guideline}</span>
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
    <div className="bg-card shadow-card rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <SectionLabel>Water</SectionLabel>
        <span className="text-[12px] text-card-mute">
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
      <p className="mt-3 text-[11px] text-card-mute">
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
      className="w-9 h-12 rounded-md border flex items-center justify-center"
      style={{
        background: filled ? '#185FA5' : '#eef3f6',
        borderColor: filled ? '#185FA5' : '#d8ded9',
      }}
    >
      <span className="text-[16px]" style={{ opacity: filled ? 1 : 0.35 }}>
        💧
      </span>
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
    <div className="bg-card shadow-card rounded-2xl p-5">
      <SectionLabel>Body stats</SectionLabel>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat label="Weight" value={weight !== null ? `${weight}` : '—'} unit="lbs" />
        <Stat label="Body fat" value={bf !== null ? `${bf}` : '—'} unit="%" />
        <Stat label="Lean mass" value={leanMass !== null ? `${leanMass}` : '—'} unit="lbs" />
      </div>
      {bf !== null && bfSource && (
        <p className="mt-2 text-[11px] text-card-mute">
          Body fat from {SOURCE_LABEL[bfSource] ?? bfSource}.
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onWeigh}
          className="flex-1 rounded-xl py-2.5 text-[13px] font-medium text-ink-body bg-charcoal border border-card-edge min-h-[44px]"
        >
          Log weigh-in
        </button>
        <button
          type="button"
          onClick={onMeasure}
          className="flex-1 rounded-xl py-2.5 text-[13px] font-medium text-ink-body bg-charcoal border border-card-edge min-h-[44px]"
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
    <div className="bg-charcoal border border-card-edge rounded-xl px-3 py-2.5">
      <span className="block text-[11px] text-card-mute">{label}</span>
      <span className="text-[19px] font-medium text-ink">{value}</span>
      <span className="text-[12px] text-card-mute"> {unit}</span>
    </div>
  );
}
