import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import { ExerciseLogRow, MobilityRow } from './bundleLogging';
import {
  getUserPreferences,
  updateUserPreferences,
} from '../../lib/userPreferences';
import { DEFAULT_BUNDLE_CONFIG } from '../../lib/defaults';
import {
  upsertBundleLog,
  parseMobilityLinks,
  type MobilityLink,
} from '../../lib/bundleHelpers';
import { createSession } from '../../lib/strengthHelpers';
import { todayISODate } from '../../lib/dateHelpers';
import { syncedDelete } from '../../db/syncedWrite';
import {
  PILLAR_LABEL,
  reclassifyTo,
  type DetailPillar,
  type ReclassifySource,
} from '../../lib/dayDetailHelpers';

const ALL_PILLARS: DetailPillar[] = [
  'bundle',
  'cardio',
  'lower',
  'upper',
  'full_body',
  'mobility',
];

// A per-pillar / per-day surface. Opened by tapping a day-dot. Scoped to one
// pillar on one day — view what was logged (incl. Watch), add/edit, and
// reclassify a misfiled Watch item. Bottom sheet over a dimmed backdrop.
export default function DayDetailSheet({
  pillar,
  color,
  date,
  onClose,
}: {
  pillar: DetailPillar;
  color: string;
  date: string;
  onClose: () => void;
}) {
  const dayLabel = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
  // Future days are view-only — you can't log/add activity that hasn't
  // happened yet. Today and past days keep the full logging affordances.
  const isFuture = date > todayISODate();

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <div
        className="bg-card w-full max-w-md rounded-t-2xl p-5 max-h-[80vh] overflow-auto"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{ borderTop: `3px solid ${color}` }}
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <p
              className="text-[11px] font-display uppercase tracking-micro"
              style={{ color }}
            >
              {PILLAR_LABEL[pillar]}
            </p>
            <p className="text-[15px] font-medium text-ink mt-0.5">{dayLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-card-mute text-[22px] w-9 h-9 flex items-center justify-center -mr-1"
          >
            ×
          </button>
        </div>

        <div className="mt-4">
          {pillar === 'bundle' && (
            <BundleDay date={date} readOnly={isFuture} />
          )}
          {pillar === 'mobility' && (
            <MobilityDay date={date} readOnly={isFuture} />
          )}
          {pillar === 'cardio' && (
            <CardioDay date={date} onClose={onClose} canLog={!isFuture} />
          )}
          {(pillar === 'lower' ||
            pillar === 'upper' ||
            pillar === 'full_body') && (
            <SessionDay
              pillar={pillar}
              date={date}
              onClose={onClose}
              canLog={!isFuture}
            />
          )}
          {isFuture && (
            <p className="mt-3 text-[11px] text-card-mute text-center">
              Future day — view only.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Reclassify control --------------------------------------------------

function ReclassifyControl({
  source,
  current,
}: {
  source: ReclassifySource;
  current: DetailPillar;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const targets = ALL_PILLARS.filter((p) => p !== current);

  async function pick(target: DetailPillar) {
    if (busy) return;
    setBusy(true);
    try {
      await reclassifyTo(source, target);
      setOpen(false);
    } catch (e) {
      console.error('Reclassify failed:', e);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[11px] text-green-mid font-medium mt-1"
      >
        Reclassify ▾
      </button>
    );
  }

  return (
    <div className="mt-1.5">
      <p className="text-[11px] text-card-mute mb-1">Move to:</p>
      <div className="flex flex-wrap gap-1.5">
        {targets.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => pick(t)}
            disabled={busy}
            className="text-[12px] px-2.5 h-8 rounded-lg bg-charcoal border border-card-edge text-ink disabled:opacity-50"
          >
            {PILLAR_LABEL[t]}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[12px] px-2.5 h-8 rounded-lg text-card-mute"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

const WATCH_BADGE = (
  <span className="text-[11px] text-dim" title="From Apple Watch">
    {' '}
    ⌚
  </span>
);

// ---- Bundle ---------------------------------------------------------------

function BundleDay({ date, readOnly }: { date: string; readOnly: boolean }) {
  const row = useLiveQuery(
    () => db.bundle_logs.where('date').equals(date).first(),
    [date],
  );
  const prefs = useLiveQuery(() => getUserPreferences(), []);
  const inc = {
    pushups: prefs?.bundle_pushup_increment ?? DEFAULT_BUNDLE_CONFIG.pushup_increment,
    ab_rolls: prefs?.bundle_abroll_increment ?? DEFAULT_BUNDLE_CONFIG.abroll_increment,
    calf_raises:
      prefs?.bundle_calfraise_increment ?? DEFAULT_BUNDLE_CONFIG.calfraise_increment,
  };
  const watchMin = row?.watch_duration_minutes ?? 0;

  if (readOnly) {
    const lines: string[] = [];
    if (row?.pushups) lines.push(`Push-ups: ${row.pushups}`);
    if (row?.ab_rolls) lines.push(`Ab rolls: ${row.ab_rolls}`);
    if (row?.calf_raises) lines.push(`Calf raises: ${row.calf_raises}`);
    if (watchMin > 0) lines.push(`⌚ ${watchMin} min strength`);
    return lines.length === 0 ? (
      <p className="text-[13px] text-card-mute">Nothing logged this day.</p>
    ) : (
      <div className="space-y-1">
        {lines.map((l) => (
          <p key={l} className="text-[14px] text-ink">
            {l}
          </p>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <ExerciseLogRow
        label="Push-ups"
        value={row?.pushups ?? 0}
        increment={inc.pushups}
        onChange={(n) => upsertBundleLog(date, 'pushups', n)}
      />
      <ExerciseLogRow
        label="Ab rolls"
        value={row?.ab_rolls ?? 0}
        increment={inc.ab_rolls}
        onChange={(n) => upsertBundleLog(date, 'ab_rolls', n)}
      />
      <ExerciseLogRow
        label="Calf raises"
        value={row?.calf_raises ?? 0}
        increment={inc.calf_raises}
        onChange={(n) => upsertBundleLog(date, 'calf_raises', n)}
      />
      {watchMin > 0 && row && (
        <div className="pt-2">
          <p className="text-[12px] text-[#0F6E56]">
            ⌚ Apple Watch · {watchMin} min strength
          </p>
          <ReclassifyControl
            current="bundle"
            source={{
              kind: 'bundleWatch',
              id: row.id,
              date,
              minutes: watchMin,
            }}
          />
        </div>
      )}
    </div>
  );
}

// ---- Mobility -------------------------------------------------------------

function MobilityDay({ date, readOnly }: { date: string; readOnly: boolean }) {
  const row = useLiveQuery(
    () => db.bundle_logs.where('date').equals(date).first(),
    [date],
  );
  const prefs = useLiveQuery(() => getUserPreferences(), []);
  const minMinutes =
    prefs?.bundle_mobility_min_minutes ?? DEFAULT_BUNDLE_CONFIG.mobility_min_minutes;
  const links = parseMobilityLinks(prefs?.bundle_mobility_youtube_links);

  if (readOnly) {
    const mins = row?.mobility_minutes ?? 0;
    return mins > 0 ? (
      <p className="text-[14px] text-ink">Mobility: {mins} min</p>
    ) : (
      <p className="text-[13px] text-card-mute">Nothing logged this day.</p>
    );
  }

  return (
    <MobilityRow
      minutes={row?.mobility_minutes ?? 0}
      minMinutes={minMinutes}
      links={links}
      onChange={(n) => upsertBundleLog(date, 'mobility_minutes', n)}
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
  );
}

// ---- Cardio ---------------------------------------------------------------

function CardioDay({
  date,
  onClose,
  canLog,
}: {
  date: string;
  onClose: () => void;
  canLog: boolean;
}) {
  const navigate = useNavigate();
  const logs = useLiveQuery(
    async () => {
      const [all, types] = await Promise.all([
        db.cardio_logs.toArray(),
        db.cardio_types.toArray(),
      ]);
      const name = new Map(types.map((t) => [t.id, t.name]));
      return all
        .filter(
          (l) =>
            new Date(l.started_at).toLocaleDateString('en-CA') === date,
        )
        .map((l) => ({
          id: l.id,
          name: name.get(l.cardio_type_id) ?? 'Cardio',
          minutes: l.duration_minutes,
          source: l.source,
        }));
    },
    [date],
    [],
  );

  return (
    <div>
      {logs.length === 0 ? (
        <p className="text-[13px] text-card-mute">Nothing logged this day.</p>
      ) : (
        <div className="space-y-2">
          {logs.map((l) => (
            <div
              key={l.id}
              className="bg-charcoal border border-card-edge rounded-lg px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[14px] text-ink">
                  {l.name} · {l.minutes} min
                  {l.source === 'watch' && WATCH_BADGE}
                </span>
                <button
                  type="button"
                  onClick={() => void syncedDelete(db.cardio_logs, l.id)}
                  aria-label={`Delete ${l.name}`}
                  className="text-card-mute text-[18px] w-8 h-8 flex items-center justify-center -mr-1"
                >
                  ×
                </button>
              </div>
              {l.source === 'watch' && (
                <ReclassifyControl
                  current="cardio"
                  source={{
                    kind: 'cardio',
                    id: l.id,
                    date,
                    minutes: l.minutes,
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}
      {canLog && (
        <button
          type="button"
          onClick={() => {
            onClose();
            navigate('/log/cardio');
          }}
          className="mt-3 w-full bg-green-deep text-white rounded-xl py-3 text-[13px] font-medium uppercase tracking-micro min-h-[44px]"
        >
          Log cardio →
        </button>
      )}
    </div>
  );
}

// ---- Strength (lower / upper / full_body) --------------------------------

function SessionDay({
  pillar,
  date,
  onClose,
  canLog,
}: {
  pillar: 'lower' | 'upper' | 'full_body';
  date: string;
  onClose: () => void;
  canLog: boolean;
}) {
  const navigate = useNavigate();
  const sessions = useLiveQuery(
    async () => {
      const ss = await db.sessions
        .where('date')
        .equals(date)
        .filter((s) => s.type === pillar)
        .toArray();
      return Promise.all(
        ss.map(async (s) => ({
          id: s.id,
          status:
            s.feel_rating !== null
              ? ('done' as const)
              : s.source === 'watch'
                ? ('watch' as const)
                : ('draft' as const),
          exerciseCount: await db.session_exercises
            .where('session_id')
            .equals(s.id)
            .count(),
          minutes: s.duration_minutes ?? 0,
        })),
      );
    },
    [date, pillar],
    [],
  );

  async function start() {
    const id = await createSession(pillar, date);
    onClose();
    navigate(`/log/strength/active/${id}`);
  }

  return (
    <div>
      {sessions.length === 0 ? (
        <p className="text-[13px] text-card-mute">Nothing logged this day.</p>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="bg-charcoal border border-card-edge rounded-lg px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[14px] text-ink">
                  {s.status === 'done'
                    ? `Completed · ${s.exerciseCount} exercise${s.exerciseCount === 1 ? '' : 's'}`
                    : s.status === 'watch'
                      ? `Apple Watch · ${s.minutes} min`
                      : `In progress · ${s.exerciseCount} exercise${s.exerciseCount === 1 ? '' : 's'}`}
                  {s.status === 'watch' && WATCH_BADGE}
                </span>
                {s.status !== 'done' && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate(`/log/strength/active/${s.id}`);
                    }}
                    className="text-[12px] text-green-mid font-medium"
                  >
                    {s.status === 'watch' ? 'Open' : 'Resume'}
                  </button>
                )}
              </div>
              {s.status === 'watch' && (
                <ReclassifyControl
                  current={pillar}
                  source={{ kind: 'session', id: s.id, date, minutes: s.minutes }}
                />
              )}
            </div>
          ))}
        </div>
      )}
      {canLog && (
        <button
          type="button"
          onClick={start}
          className="mt-3 w-full bg-green-deep text-white rounded-xl py-3 text-[13px] font-medium uppercase tracking-micro min-h-[44px]"
        >
          Start session on this day →
        </button>
      )}
    </div>
  );
}
