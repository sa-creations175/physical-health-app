import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import { useToast } from '../ui/Toast';
import SharedActivityCard from './SharedActivityCard';
import { BundleIcon } from './activityIcons';
import { ProgressBar } from '../ui/primitives';
import { ExerciseLogRow, MobilityRow } from './bundleLogging';
import {
  getUserPreferences,
  updateUserPreferences,
} from '../../lib/userPreferences';
import { DEFAULT_BUNDLE_CONFIG } from '../../lib/defaults';
import {
  isDayQualifying,
  getDayIntensity,
  getWeeklyTotals,
  upsertBundleLog,
  parseMobilityLinks,
  type DayIntensity,
  type MobilityLink,
} from '../../lib/bundleHelpers';
import { bundleDots } from '../../lib/dotHelpers';
import { PILLAR_COLORS, fillFraction } from '../../lib/pillarColors';
import {
  startOfWeekISODate,
  addDaysISO,
  todayISODate,
} from '../../lib/dateHelpers';
import type { BundleLog } from '../../db/types';

const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const INTENSITY_FILL: Record<DayIntensity, string> = {
  none: '#eef1ef',
  low: '#d3eee2',
  medium: '#79caa9',
  full: '#0F6E56',
};
const INTENSITY_INITIAL: Record<DayIntensity, string> = {
  none: '#6b756e',
  low: '#0F6E56',
  medium: '#0d3a2c',
  full: '#ffffff',
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
  const pillar = PILLAR_COLORS.bundle;
  const dots = bundleDots(byDate, prefs);
  const links = parseMobilityLinks(prefs?.bundle_mobility_youtube_links);
  const todayLog = byDate.get(today) ?? null;

  return (
    <SharedActivityCard
      label="Daily Bundle"
      badge={
        <>
          {qualifyingDays} / {bundleTarget}
          {weekOnTrack && <span style={{ color: pillar.text }}> ✓</span>}
        </>
      }
      dots={dots}
      expanded={expanded}
      onToggle={onToggle}
      icon={<BundleIcon />}
      fill={{
        color: pillar.fill,
        fraction: fillFraction(qualifyingDays, bundleTarget),
        complete: weekOnTrack,
        accent: pillar.text,
      }}
      pillar={{ key: 'bundle', color: pillar.fill }}
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
                border: showNudge ? '2px solid #0F6E56' : undefined,
              }}
            >
              <span
                className="text-[11px] font-medium"
                style={{ color: INTENSITY_INITIAL[intensity] }}
              >
                {DAY_INITIALS[i]}
              </span>
              {hasWatch && (
                <span
                  className="absolute top-0.5 right-0.5 text-[8px] leading-none"
                  style={{ color: INTENSITY_INITIAL[intensity] }}
                  title={`Apple Watch · ${log?.watch_duration_minutes} min`}
                >
                  ⌚
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
        className={`mt-2 text-[12px] text-center ${
          weekOnTrack ? 'text-green-mid' : 'text-[#5f6b65]'
        }`}
      >
        {weekOnTrack ? '✓ Week on track' : `${qualifyingDays} of ${bundleTarget} days this week`}
      </p>

      {/* Today's log */}
      <div className="mt-3 pt-3 border-t" style={{ borderColor: '#f0f2f0' }}>
        <p className="text-[9px] tracking-micro uppercase font-semibold text-green-mint">
          Log today
        </p>
        {(todayLog?.watch_duration_minutes ?? 0) > 0 && (
          <p className="mt-1 text-[12px] text-[#0F6E56]">
            ⌚ Apple Watch · {todayLog?.watch_duration_minutes} min strength
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
          <MobilityRow
            minutes={todayLog?.mobility_minutes ?? 0}
            minMinutes={mobilityMin}
            links={links}
            onChange={(next) =>
              logBundle('mobility_minutes', next, `Mobility: ${next} min`)
            }
            onAddLink={(label, url) => {
              const next: MobilityLink[] = [
                ...links,
                { id: Date.now().toString(), label, url },
              ];
              return updateUserPreferences({
                bundle_mobility_youtube_links: JSON.stringify(next),
              });
            }}
            onDeleteLink={(id) => {
              const next = links.filter((l) => l.id !== id);
              return updateUserPreferences({
                bundle_mobility_youtube_links: JSON.stringify(next),
              });
            }}
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
        <span className="text-[9px] tracking-micro uppercase font-semibold text-green-mint">
          {label}
        </span>
        <span className="text-[11px] text-[#0d1f18]">
          {total} / {weeklyTarget}
        </span>
      </div>
      <div className="mt-1">
        <ProgressBar value={total} max={weeklyTarget} color="green-deep" trackColor="#e7ece8" />
      </div>
    </div>
  );
}
