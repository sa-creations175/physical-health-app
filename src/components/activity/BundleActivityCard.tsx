import { Watch } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import { useToast } from '../ui/Toast';
import SharedActivityCard from './SharedActivityCard';
import { BundleIcon } from './activityIcons';
import { ProgressBar } from '../ui/primitives';
import { ExerciseLogRow } from './bundleLogging';
import { getUserPreferences } from '../../lib/userPreferences';
import { DEFAULT_BUNDLE_CONFIG } from '../../lib/defaults';
import {
  isDayQualifying,
  getDayIntensity,
  getWeeklyTotals,
  upsertBundleLog,
  type DayIntensity,
} from '../../lib/bundleHelpers';
import { bundleDots } from '../../lib/dotHelpers';
import { fillFraction } from '../../lib/progress';
import { pillarCallout } from '../../lib/pillarNarrative';
import {
  startOfWeekISODate,
  addDaysISO,
  todayISODate,
} from '../../lib/dateHelpers';
import type { BundleLog } from '../../db/types';
import { COLOR } from '../../lib/brand';

const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const INTENSITY_FILL: Record<DayIntensity, string> = {
  none: COLOR.stone,
  low: COLOR.green100,
  medium: COLOR.green300,
  full: COLOR.green700,
};
const INTENSITY_INITIAL: Record<DayIntensity, string> = {
  none: COLOR.muted,
  low: COLOR.green700,
  medium: COLOR.green900,
  full: COLOR.white,
};

export default function BundleActivityCard({
  expanded,
  onToggle,
}: {
  expanded: boolean;
  onToggle: () => void;
}) {
  const rows = useLiveQuery(() => db.bundle_logs.toArray(), [], []);
  const prefs = useLiveQuery(() => getUserPreferences(), []);
  const { showToast } = useToast();
  const today = todayISODate();

  // Log a bundle field and confirm the auto-save with a toast. Bundle logging
  // already persists on every tap; this just makes the save visible.
  const logBundle = (
    field: 'pushups' | 'ab_rolls' | 'calf_raises' | 'mobility_minutes',
    value: number,
    confirm: string,
  ) => upsertBundleLog(today, field, value).then(() => showToast(confirm));
  const weekStart = startOfWeekISODate();
  const weekDates = Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i));

  const byDate = new Map<string, BundleLog>(rows.map((r) => [r.date, r]));
  const weekLogs = weekDates
    .map((d) => byDate.get(d))
    .filter((r): r is BundleLog => r !== undefined);

  const bundleTarget = prefs?.bundle_target ?? DEFAULT_BUNDLE_CONFIG.weekly_target;
  const mobilityMin =
    prefs?.bundle_mobility_min_minutes ?? DEFAULT_BUNDLE_CONFIG.mobility_min_minutes;
  const pushupTarget =
    prefs?.bundle_pushup_target ?? DEFAULT_BUNDLE_CONFIG.pushup_target;
  const abrollTarget =
    prefs?.bundle_abroll_target ?? DEFAULT_BUNDLE_CONFIG.abroll_target;
  const calfTarget =
    prefs?.bundle_calfraise_target ?? DEFAULT_BUNDLE_CONFIG.calfraise_target;
  const pushupInc =
    prefs?.bundle_pushup_increment ?? DEFAULT_BUNDLE_CONFIG.pushup_increment;
  const abrollInc =
    prefs?.bundle_abroll_increment ?? DEFAULT_BUNDLE_CONFIG.abroll_increment;
  const calfInc =
    prefs?.bundle_calfraise_increment ?? DEFAULT_BUNDLE_CONFIG.calfraise_increment;

  const totals = getWeeklyTotals(weekLogs, mobilityMin);
  const qualifyingDays = weekLogs.filter(isDayQualifying).length;
  const weekOnTrack = bundleTarget > 0 && qualifyingDays >= bundleTarget;
  const callout =
    bundleTarget > 0
      ? pillarCallout(
            'bundle',
            fillFraction(qualifyingDays, bundleTarget),
            today,
          )
      : undefined;
  const dots = bundleDots(byDate, prefs);
  const todayLog = byDate.get(today) ?? null;

  return (
    <SharedActivityCard
      label="Daily Bundle"
      badge={
        <>
          {qualifyingDays} / {bundleTarget}
          {weekOnTrack && <span className="text-green-700"> ✓</span>}
        </>
      }
      dots={dots}
      expanded={expanded}
      onToggle={onToggle}
      icon={<BundleIcon />}
      pillar="bundle"
      callout={callout}
    >
      {/* Weekly intensity grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {weekDates.map((date, i) => {
          const log = byDate.get(date);
          const intensity: DayIntensity =
            log && prefs ? getDayIntensity(log, prefs) : 'none';
          const showNudge = intensity === 'none' && date === today;
          const hasWatch = (log?.watch_duration_minutes ?? 0) > 0;
          return (
            <div
              key={date}
              className="relative w-full h-9 rounded-md flex items-center justify-center"
              style={{
                background: INTENSITY_FILL[intensity],
                border: showNudge ? `2px solid ${COLOR.green700}` : undefined,
              }}
            >
              <span
                className="text-label font-medium"
                style={{ color: INTENSITY_INITIAL[intensity] }}
              >
                {DAY_INITIALS[i]}
              </span>
              {hasWatch && (
                <span
                  className="absolute top-0.5 right-0.5 text-micro leading-none"
                  style={{ color: INTENSITY_INITIAL[intensity] }}
                  title={`Apple Watch · ${log?.watch_duration_minutes} min`}
                >
                  <Watch aria-hidden="true" size={10} strokeWidth={2.5} />
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Weekly progress bars */}
      <div className="mt-3 space-y-2.5">
        <WeeklyBar label="Push-ups" total={totals.pushups} weeklyTarget={pushupTarget * bundleTarget} />
        <WeeklyBar label="Ab rolls" total={totals.ab_rolls} weeklyTarget={abrollTarget * bundleTarget} />
        <WeeklyBar label="Calf raises" total={totals.calf_raises} weeklyTarget={calfTarget * bundleTarget} />
      </div>

      <p
        className={`mt-2 text-label text-center ${
          weekOnTrack ? 'text-green-700' : 'text-muted'
        }`}
      >
        {weekOnTrack ? '✓ Week on track' : `${qualifyingDays} of ${bundleTarget} days this week`}
      </p>

      {/* Today's log */}
      <div className="mt-3 pt-3 border-t border-hairline">
        <p className="eyebrow">
          Log today
        </p>
        {(todayLog?.watch_duration_minutes ?? 0) > 0 && (
          <p className="mt-1 text-label text-green-700">
            <Watch aria-hidden="true" size={12} strokeWidth={2} className="inline -mt-0.5" /> Apple Watch · {todayLog?.watch_duration_minutes} min strength
          </p>
        )}
        <div className="mt-1 space-y-1">
          <ExerciseLogRow
            label="Push-ups"
            value={todayLog?.pushups ?? 0}
            increment={pushupInc}
            onChange={(next) => logBundle('pushups', next, `Push-ups: ${next}`)}
          />
          <ExerciseLogRow
            label="Ab rolls"
            value={todayLog?.ab_rolls ?? 0}
            increment={abrollInc}
            onChange={(next) => logBundle('ab_rolls', next, `Ab rolls: ${next}`)}
          />
          <ExerciseLogRow
            label="Calf raises"
            value={todayLog?.calf_raises ?? 0}
            increment={calfInc}
            onChange={(next) => logBundle('calf_raises', next, `Calf raises: ${next}`)}
          />
        </div>
      </div>
    </SharedActivityCard>
  );
}

function WeeklyBar({
  label,
  total,
  weeklyTarget,
}: {
  label: string;
  total: number;
  weeklyTarget: number;
}) {
  return (
    <div>
      <div className="flex justify-between items-baseline">
        <span className="eyebrow">
          {label}
        </span>
        <span className="text-label text-ink">
          {total.toLocaleString()} / {weeklyTarget.toLocaleString()}
        </span>
      </div>
      <div className="mt-1">
        <ProgressBar value={total} max={weeklyTarget} />
      </div>
    </div>
  );
}
