import { ChevronDown, Watch, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomSheet from '../ui/BottomSheet';
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
import { isSessionComplete } from '../../lib/sessionPlans';

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
  date,
  onClose,
}: {
  pillar: DetailPillar;
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
    <BottomSheet onClose={onClose} label={`${PILLAR_LABEL[pillar]}, ${dayLabel}`}>
        <div className="pr-10">
          <p className="eyebrow">{PILLAR_LABEL[pillar]}</p>
          <p className="text-heading text-ink mt-0.5">{dayLabel}</p>
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
            <p className="mt-3 text-label text-muted text-center">
              Future day, view only.
            </p>
          )}
        </div>
    </BottomSheet>
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
        className="text-label text-green-700 font-bold mt-1 min-h-[44px]"
      >
        Reclassify <ChevronDown aria-hidden="true" size={14} strokeWidth={2} className="inline" />
      </button>
    );
  }

  return (
    <div className="mt-1.5">
      <p className="text-label text-muted mb-1">Move to:</p>
      <div className="flex flex-wrap gap-1.5">
        {targets.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => pick(t)}
            disabled={busy}
            className="pill"
          >
            {PILLAR_LABEL[t]}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="pill border-transparent bg-transparent text-muted"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

const WATCH_BADGE = (
  <span className="text-label text-hint" title="From Apple Watch">
    {' '}
    <Watch size={12} strokeWidth={2} className="inline -mt-0.5" />
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
    const lines: { key: string; node: React.ReactNode }[] = [];
    if (row?.pushups) lines.push({ key: 'p', node: `Push-ups: ${row.pushups}` });
    if (row?.ab_rolls) lines.push({ key: 'a', node: `Ab rolls: ${row.ab_rolls}` });
    if (row?.calf_raises) lines.push({ key: 'c', node: `Calf raises: ${row.calf_raises}` });
    if (watchMin > 0)
      lines.push({ key: 'w', node: <><Watch aria-hidden="true" size={12} strokeWidth={2} className="inline -mt-0.5" /> {watchMin} min strength</> });
    return lines.length === 0 ? (
      <p className="text-label text-muted">Nothing logged this day.</p>
    ) : (
      <div className="space-y-1">
        {lines.map((l) => (
          <p key={l.key} className="text-body text-ink">
            {l.node}
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
          <p className="text-label text-green-700">
            <Watch aria-hidden="true" size={12} strokeWidth={2} className="inline -mt-0.5" /> Apple Watch · {watchMin} min strength
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
      <p className="text-body text-ink">Mobility: {mins} min</p>
    ) : (
      <p className="text-label text-muted">Nothing logged this day.</p>
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
        <p className="text-label text-muted">Nothing logged this day.</p>
      ) : (
        <div className="space-y-2">
          {logs.map((l) => (
            <div
              key={l.id}
              className="card px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-body text-ink">
                  {l.name} · {l.minutes} min
                  {l.source === 'watch' && WATCH_BADGE}
                </span>
                <button
                  type="button"
                  onClick={() => void syncedDelete(db.cardio_logs, l.id)}
                  aria-label={`Delete ${l.name}`}
                  className="text-hint w-11 h-11 flex items-center justify-center -mr-2"
                >
                  <X size={18} strokeWidth={2} />
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
          className="btn-primary mt-3 w-full"
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
            isSessionComplete(s)
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
        <p className="text-label text-muted">Nothing logged this day.</p>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="card px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-body text-ink">
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
                    className="text-label text-green-700 font-bold min-h-[44px]"
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
          className="btn-primary mt-3 w-full"
        >
          Start session on this day →
        </button>
      )}
    </div>
  );
}
