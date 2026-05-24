import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import { Card, SectionLabel, ProgressBar } from '../ui/primitives';
import { BoltIcon } from './PillarIcons';
import {
  getUserPreferences,
  updateUserPreferences,
} from '../../lib/userPreferences';
import { DEFAULT_BUNDLE_CONFIG } from '../../lib/defaults';
import {
  isDayQualifying,
  getDayIntensity,
  getWeeklyTotals,
  computeBundleStreak,
  upsertBundleLog,
  parseMobilityLinks,
  type DayIntensity,
  type MobilityLink,
} from '../../lib/bundleHelpers';
import {
  startOfWeekISODate,
  addDaysISO,
  todayISODate,
} from '../../lib/dateHelpers';
import type { BundleLog } from '../../db/types';

// Sunday-first weekday initials — matches the rest of the app's week math.
// Duplicate letters (S, T) are fine: position in the 7-square grid carries
// the meaning, the initial is just a hint.
const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// Streak needs 4 qualifying days in a week, so the weekly rep target for
// each exercise is the daily target × 4.
const WEEKLY_TARGET_FACTOR = 4;

// Grid square fill + day-initial color per intensity band. Kept as plain
// objects (not Tailwind classes) because the dark-green ramp here is
// bundle-specific and not in the shared palette tokens.
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

export default function DailyBundleCard({
  label = 'Daily Bundle',
}: {
  label?: string;
}) {
  const weekStart = startOfWeekISODate();
  const today = todayISODate();
  const weekDates = Array.from({ length: 7 }, (_, i) =>
    addDaysISO(weekStart, i),
  );

  // One subscription over the whole table feeds the streak, the week grid,
  // and the totals — same approach as the delivery card. At ~365 rows/year
  // the full scan is cheap and keeps everything refreshing off a single tap.
  const rows = useLiveQuery(() => db.bundle_logs.toArray(), [], []);
  const prefs = useLiveQuery(() => getUserPreferences(), []);

  const byDate = new Map<string, BundleLog>(rows.map((r) => [r.date, r]));
  const weekLogs = weekDates
    .map((d) => byDate.get(d))
    .filter((r): r is BundleLog => r !== undefined);

  const mobilityMin =
    prefs?.bundle_mobility_min_minutes ?? DEFAULT_BUNDLE_CONFIG.mobility_min_minutes;
  const mobilityTarget =
    prefs?.bundle_mobility_target ?? DEFAULT_BUNDLE_CONFIG.mobility_target;
  const mobilityLinks = parseMobilityLinks(prefs?.bundle_mobility_youtube_links);

  const totals = getWeeklyTotals(weekLogs, mobilityMin);
  const qualifyingDays = weekLogs.filter(isDayQualifying).length;
  const { currentStreak, longestStreak } = computeBundleStreak(rows);
  const mobilityWeekMet = totals.mobilityQualifyingDays >= mobilityTarget;

  // Targets + increments fall back to the shipped defaults for the one frame
  // before prefs resolve, so the card never flashes empty bars.
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

  const todayLog = byDate.get(today) ?? null;
  const weekOnTrack = qualifyingDays >= WEEKLY_TARGET_FACTOR;

  return (
    <section className="px-5 mt-6">
      {/* Standard divider separating the bundle card from the delivery
          streak card above it. */}
      <div aria-hidden="true" className="h-px w-full" style={{ background: '#e3e8e4' }} />

      <Card className="mt-4 p-4">
        {/* Header: mint micro-label left, streak + best mid-right, accent
            glyph pinned to the top-right corner. */}
        <div className="flex items-start justify-between gap-3">
          <SectionLabel>{label}</SectionLabel>
          <div className="flex items-start gap-2">
            <div className="text-right leading-tight">
              <p className="text-[14px] text-[#0d1f18]">
                {currentStreak} {currentStreak === 1 ? 'week' : 'weeks'} on target
              </p>
              <p className="text-[11px] text-[#6b756e] mt-0.5">Best: {longestStreak}wk</p>
            </div>
            <BoltIcon />
          </div>
        </div>

        {/* Weekly intensity grid. */}
        <div className="mt-4 grid grid-cols-7 gap-1.5">
          {weekDates.map((date, i) => {
            const log = byDate.get(date);
            const intensity: DayIntensity =
              log && prefs ? getDayIntensity(log, prefs) : 'none';
            const isToday = date === today;
            const showNudge = intensity === 'none' && isToday;
            return (
              <div
                key={date}
                className="w-full h-11 rounded-md flex items-center justify-center"
                style={{
                  background: INTENSITY_FILL[intensity],
                  border: showNudge ? '2px solid #0F6E56' : undefined,
                }}
              >
                <span
                  className="text-[12px] font-medium"
                  style={{ color: INTENSITY_INITIAL[intensity] }}
                >
                  {DAY_INITIALS[i]}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-1.5 grid grid-cols-7 gap-1.5">
          {DAY_INITIALS.map((letter, i) => (
            <div
              key={i}
              className="text-[9px] text-[#6b756e] text-center tracking-micro"
            >
              {letter}
            </div>
          ))}
        </div>

        {/* Weekly progress bars — one per exercise, total vs daily×4. */}
        <div className="mt-4 space-y-3">
          <WeeklyBar
            label="Push-ups"
            total={totals.pushups}
            weeklyTarget={pushupTarget * WEEKLY_TARGET_FACTOR}
          />
          <WeeklyBar
            label="Ab rolls"
            total={totals.ab_rolls}
            weeklyTarget={abrollTarget * WEEKLY_TARGET_FACTOR}
          />
          <WeeklyBar
            label="Calf raises"
            total={totals.calf_raises}
            weeklyTarget={calfTarget * WEEKLY_TARGET_FACTOR}
          />
        </div>

        {/* Weekly day count. */}
        <p
          className={`mt-3 text-[12px] text-center ${
            weekOnTrack ? 'text-green-mint' : 'text-[#5f6b65]'
          }`}
        >
          {weekOnTrack
            ? '✓ Week on track'
            : `${qualifyingDays} of ${WEEKLY_TARGET_FACTOR} days this week`}
        </p>

        {/* Log section — today only. */}
        <div
          aria-hidden="true"
          className="h-px w-full bg-[#e3e8e4] mt-4"
          style={{ transform: 'scaleY(0.5)' }}
        />
        <div className="mt-3">
          <SectionLabel>Log today</SectionLabel>
          <div className="mt-2 space-y-1">
            <ExerciseLogRow
              label="Push-ups"
              value={todayLog?.pushups ?? 0}
              increment={pushupInc}
              onChange={(next) => upsertBundleLog(today, 'pushups', next)}
            />
            <ExerciseLogRow
              label="Ab rolls"
              value={todayLog?.ab_rolls ?? 0}
              increment={abrollInc}
              onChange={(next) => upsertBundleLog(today, 'ab_rolls', next)}
            />
            <ExerciseLogRow
              label="Calf raises"
              value={todayLog?.calf_raises ?? 0}
              increment={calfInc}
              onChange={(next) => upsertBundleLog(today, 'calf_raises', next)}
            />
            <MobilityRow
              minutes={todayLog?.mobility_minutes ?? 0}
              minMinutes={mobilityMin}
              links={mobilityLinks}
              onChange={(next) => upsertBundleLog(today, 'mobility_minutes', next)}
              onAddLink={(linkLabel, url) => {
                const next: MobilityLink[] = [
                  ...mobilityLinks,
                  { id: Date.now().toString(), label: linkLabel, url },
                ];
                return updateUserPreferences({
                  bundle_mobility_youtube_links: JSON.stringify(next),
                });
              }}
              onDeleteLink={(id) => {
                const next = mobilityLinks.filter((l) => l.id !== id);
                return updateUserPreferences({
                  bundle_mobility_youtube_links: JSON.stringify(next),
                });
              }}
            />
          </div>

          {/* Mobility weekly day-count — separate from the overall
              qualifying-day line above the log section. */}
          <p
            className={`mt-3 text-[11px] text-center ${
              mobilityWeekMet ? 'text-green-mid' : 'text-[#5f6b65]'
            }`}
          >
            Mobility: {totals.mobilityQualifyingDays} / {mobilityTarget} days
            {mobilityWeekMet ? ' ✓' : ''}
          </p>
        </div>
      </Card>
    </section>
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
        <SectionLabel>{label}</SectionLabel>
        <span className="text-[11px] text-[#0d1f18]">
          {total} / {weeklyTarget}
        </span>
      </div>
      <div className="mt-1">
        {/* Bar caps at 100% visually (ProgressBar clamps); the number above
            shows the true total so an overflow week still reads honestly. */}
        <ProgressBar
          value={total}
          max={weeklyTarget}
          color="green-deep"
          trackColor="#e7ece8"
        />
      </div>
    </div>
  );
}

function ExerciseLogRow({
  label,
  value,
  increment,
  onChange,
}: {
  label: string;
  value: number;
  increment: number;
  onChange: (next: number) => void | Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(String(value));

  // Mirror the live value into the field whenever it changes from outside
  // (a ± tap, or another surface writing the same day) — but not while the
  // user is mid-edit, so their in-progress text isn't yanked out from under
  // them by the live query echoing the previous value.
  useEffect(() => {
    if (!editing) setText(String(value));
  }, [value, editing]);

  function commit() {
    const trimmed = text.trim();
    const parsed = trimmed === '' ? 0 : parseInt(trimmed, 10);
    const next = Number.isNaN(parsed) ? value : Math.max(0, parsed);
    setEditing(false);
    setText(String(next));
    if (next !== value) void onChange(next);
  }

  function bump(delta: number) {
    void onChange(Math.max(0, value + delta));
  }

  return (
    <div className="flex items-center gap-2 min-h-[44px]">
      <span className="text-[12px] text-[#5f6b65] flex-1">{label}</span>

      {editing ? (
        <input
          type="number"
          inputMode="numeric"
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          aria-label={`${label} reps today`}
          className="bg-[#eef1ef] text-[#0d1f18] text-[16px] font-semibold text-center rounded-md w-[64px] h-11 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none focus:outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`${label}: ${value} reps today — tap to type`}
          className="text-[#0d1f18] text-[16px] font-bold w-[64px] h-11 text-center"
        >
          {value}
        </button>
      )}

      <button
        type="button"
        onClick={() => bump(-increment)}
        aria-label={`Subtract ${increment} ${label}`}
        className="text-ink text-[18px] font-medium rounded-md flex items-center justify-center border border-card-edge"
        style={{ width: '44px', height: '44px', background: '#eef1ef' }}
      >
        −
      </button>
      <button
        type="button"
        onClick={() => bump(increment)}
        aria-label={`Add ${increment} ${label}`}
        className="text-white text-[18px] font-medium rounded-md flex items-center justify-center"
        style={{ width: '44px', height: '44px', background: '#0F6E56' }}
      >
        +
      </button>
    </div>
  );
}

// Mobility / flexibility row. Two lines (label + qualifying check, then the
// ±5-minute stepper with tap-to-type) plus a collapsible Links section.
function MobilityRow({
  minutes,
  minMinutes,
  links,
  onChange,
  onAddLink,
  onDeleteLink,
}: {
  minutes: number;
  minMinutes: number;
  links: MobilityLink[];
  onChange: (next: number) => void | Promise<void>;
  onAddLink: (label: string, url: string) => void | Promise<void>;
  onDeleteLink: (id: string) => void | Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(String(minutes));

  useEffect(() => {
    if (!editing) setText(String(minutes));
  }, [minutes, editing]);

  const qualifying = minutes >= minMinutes;

  function commit() {
    const trimmed = text.trim();
    const parsed = trimmed === '' ? 0 : parseInt(trimmed, 10);
    const next = Number.isNaN(parsed) ? minutes : Math.max(0, parsed);
    setEditing(false);
    setText(String(next));
    if (next !== minutes) void onChange(next);
  }

  function bump(delta: number) {
    void onChange(Math.max(0, minutes + delta));
  }

  return (
    <div className="pt-1">
      <div className="flex items-center justify-between min-h-[28px]">
        <span className="text-[12px] text-[#5f6b65]">Flex / Mobility</span>
        {qualifying ? (
          <span
            aria-label="mobility target met today"
            className="text-green-deep text-[16px] leading-none"
          >
            ✓
          </span>
        ) : (
          <span
            aria-hidden="true"
            className="block w-4 h-4 rounded-full border"
            style={{ borderColor: '#cdd5cf' }}
          />
        )}
      </div>

      <div className="flex items-center gap-2 mt-1">
        <button
          type="button"
          onClick={() => bump(-5)}
          aria-label="Subtract 5 mobility minutes"
          className="text-ink text-[15px] font-medium rounded-md flex items-center justify-center border border-card-edge"
          style={{ width: '44px', height: '44px', background: '#eef1ef' }}
        >
          −5
        </button>

        <div className="flex-1 flex items-center justify-center gap-1">
          {editing ? (
            <input
              type="number"
              inputMode="numeric"
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
              aria-label="Mobility minutes today"
              className="bg-[#eef1ef] text-[#0d1f18] text-[16px] font-semibold text-center rounded-md w-[64px] h-11 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none focus:outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label={`Mobility: ${minutes} minutes today — tap to type`}
              className="text-[#0d1f18] text-[16px] font-bold h-11"
            >
              {minutes}
            </button>
          )}
          <span className="text-[12px] text-[#5f6b65]">min</span>
        </div>

        <button
          type="button"
          onClick={() => bump(5)}
          aria-label="Add 5 mobility minutes"
          className="text-white text-[15px] font-medium rounded-md flex items-center justify-center"
          style={{ width: '44px', height: '44px', background: '#0F6E56' }}
        >
          +5
        </button>
      </div>

      <MobilityLinks
        links={links}
        onAdd={onAddLink}
        onDelete={onDeleteLink}
      />
    </div>
  );
}

// Collapsible list of follow-along links. Tapping a link opens it in a new
// tab (Safari / YouTube on iOS). Add appends to the prefs JSON array; × removes.
function MobilityLinks({
  links,
  onAdd,
  onDelete,
}: {
  links: MobilityLink[];
  onAdd: (label: string, url: string) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');

  function save() {
    const l = label.trim();
    const u = url.trim();
    if (!l || !u) return;
    void onAdd(l, u);
    setLabel('');
    setUrl('');
    setAdding(false);
  }

  function cancel() {
    setLabel('');
    setUrl('');
    setAdding(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 text-green-mid text-[12px] font-medium"
      >
        Links ▾
      </button>
    );
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-green-mid text-[12px] font-medium"
      >
        Links ▴
      </button>

      <div className="mt-1.5 space-y-1.5">
        {links.map((link) => (
          <div key={link.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.open(link.url, '_blank')}
              className="flex-1 flex items-center justify-between gap-2 bg-[#eef1ef] rounded-md px-3 py-2 text-left min-h-[40px]"
            >
              <span className="text-[13px] text-ink truncate">{link.label}</span>
              <ExternalLinkIcon />
            </button>
            <button
              type="button"
              onClick={() => void onDelete(link.id)}
              aria-label={`Delete ${link.label}`}
              className="text-card-mute text-[18px] w-9 h-9 flex items-center justify-center shrink-0"
            >
              ×
            </button>
          </div>
        ))}

        {adding ? (
          <div className="space-y-1.5 pt-1">
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. 5 min stretch"
              autoFocus
              aria-label="Link label"
              className="w-full bg-[#eef1ef] text-[#0d1f18] rounded-md px-3 h-10 text-[16px] placeholder:text-[#9aa39d] focus:outline-none"
            />
            <input
              type="url"
              inputMode="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="YouTube URL"
              aria-label="Link URL"
              className="w-full bg-[#eef1ef] text-[#0d1f18] rounded-md px-3 h-10 text-[16px] placeholder:text-[#9aa39d] focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={save}
                disabled={!label.trim() || !url.trim()}
                aria-label="Save link"
                className="flex-1 bg-green-deep text-white rounded-md h-10 text-[14px] font-medium disabled:opacity-50"
              >
                ✓ Save
              </button>
              <button
                type="button"
                onClick={cancel}
                aria-label="Cancel"
                className="flex-1 bg-[#eef1ef] text-ink border border-card-edge rounded-md h-10 text-[14px] font-medium"
              >
                × Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-green-mid text-[12px] font-medium py-1"
          >
            + Add link
          </button>
        )}
      </div>
    </div>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#1a6b4a"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}
