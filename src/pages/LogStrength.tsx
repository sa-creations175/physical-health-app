import { ChevronDown, ChevronUp } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  createSession,
  discardSession,
  getDraftSessionByType,
  getDraftSessions,
  suggestNextLiftingType,
  updateSessionDate,
  type DraftSessionDetail,
  type DraftSessionSummary,
} from '../lib/strengthHelpers';
import {
  shortDateLabel,
  timeOfDayLabel,
  todayISODate,
} from '../lib/dateHelpers';
import { formatSetMagnitude } from '../lib/setFormat';
import DateBlock from '../components/ui/DateBlock';
import type { SessionType } from '../db/types';
import HeaderStrip from '../components/ui/HeaderStrip';

const STRENGTH_TYPE_LABEL: Record<'upper' | 'lower' | 'full_body', string> = {
  upper: 'Upper Body',
  lower: 'Lower Body',
  full_body: 'Full Body',
};

// Strength tiles: a tap resumes that type's unfinished session if there is
// one, otherwise starts a new instance, which opens as a copy of the type's
// standing exercise list. Cardio bypasses the session model and routes
// immediately.
type StrengthValue = 'upper' | 'lower' | 'full_body';
type TypeValue = StrengthValue | 'cardio';

const TYPE_OPTIONS: { value: TypeValue; label: string }[] = [
  { value: 'lower', label: 'Lower Body' },
  { value: 'upper', label: 'Upper Body' },
  { value: 'full_body', label: 'Full Body' },
  { value: 'cardio', label: 'Cardio' },
];

const STRENGTH_VALUES: StrengthValue[] = ['upper', 'lower', 'full_body'];

export default function LogStrength() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Suggestion math is strength-only (cross-pillar logic deferred). Cardio
  // never receives a "Due Next" badge.
  const [suggested, setSuggested] = useState<SessionType | null>(null);
  const [routing, setRouting] = useState<TypeValue | null>(null);
  // null when no panel; otherwise the strength type currently expanded.
  const [draftByType, setDraftByType] = useState<
    Record<StrengthValue, DraftSessionSummary | null>
  >({ upper: null, lower: null, full_body: null });
  const [sessionDate, setSessionDate] = useState(() => todayISODate());
  // Full unfinished-session detail (with contents) for the stale-session
  // banner. Loaded on mount; locally pruned when one is discarded so the
  // banner updates without a refetch.
  const [drafts, setDrafts] = useState<DraftSessionDetail[]>([]);

  // Gates the ?type=X auto-tap so it doesn't fire before draftByType is known.
  const [draftLoaded, setDraftLoaded] = useState(false);
  const autoTappedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    suggestNextLiftingType()
      .then((s) => {
        if (cancelled) return;
        setSuggested(s);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to suggest type:', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Draft (in-progress) sessions per type. Tapping a tile with a draft
  // jumps straight to /active/:id — no new row created. Refires on
  // mount so returning from a discard / completion sees fresh state.
  useEffect(() => {
    let cancelled = false;
    Promise.all(STRENGTH_VALUES.map((t) => getDraftSessionByType(t)))
      .then(([upper, lower, full_body]) => {
        if (cancelled) return;
        setDraftByType({ upper, lower, full_body });
        setDraftLoaded(true);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to load draft sessions:', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Stale (unfinished) sessions with their contents, for the banner.
  useEffect(() => {
    let cancelled = false;
    getDraftSessions()
      .then((d) => {
        if (!cancelled) setDrafts(d);
      })
      .catch((err) => {
        if (!cancelled) console.error('Failed to load draft sessions:', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Dashboard tiles route here with ?type=lower|upper|full_body so a tap
  // on the dashboard feels like one motion. Once both async sets have
  // loaded we auto-fire handleTap for that type — preserves the same
  // resume / repeat-panel / new-session decision tree the user would
  // get tapping the tile by hand. Fires exactly once per mount.
  useEffect(() => {
    if (autoTappedRef.current) return;
    if (!draftLoaded) return;
    const param = searchParams.get('type');
    if (param !== 'upper' && param !== 'lower' && param !== 'full_body') return;
    autoTappedRef.current = true;
    void handleTap(param);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftLoaded, searchParams]);

  async function handleTap(value: TypeValue) {
    if (routing) return;

    if (value === 'cardio') {
      setRouting(value);
      navigate('/log/cardio');
      return;
    }

    // Resume takes priority over a fresh session — a half-finished workout
    // should never get silently shadowed by a new row.
    const draft = draftByType[value];
    if (draft) {
      setRouting(value);
      navigate(`/log/strength/active/${draft.sessionId}`);
      return;
    }

    setRouting(value);
    try {
      const id = await createSession(value, sessionDate);
      navigate(`/log/strength/active/${id}`);
    } catch (err) {
      console.error('Failed to start session:', err);
      setRouting(null);
    }
  }

  return (
    <div className="pb-8">
      <HeaderStrip
        eyebrow="Log Session"
        title="What Kind of Session?"
        subtitle="Tap to start logging."
      />
      <div className="px-4">

      {drafts.length > 0 && (
        <div className="mt-4 space-y-2">
          {drafts.map((d) => (
            <StaleDraftCard
              key={d.sessionId}
              draft={d}
              busy={routing !== null}
              onResume={(date) => {
                if (routing) return;
                setRouting(d.type);
                const go = () =>
                  navigate(`/log/strength/active/${d.sessionId}`);
                if (date && date !== d.date) {
                  updateSessionDate(d.sessionId, date)
                    .then(go)
                    .catch((err) => {
                      console.error('Failed to update session date:', err);
                      setRouting(null);
                    });
                } else {
                  go();
                }
              }}
              onDiscard={() =>
                discardSession(d.sessionId)
                  .then(() =>
                    setDrafts((cur) =>
                      cur.filter((x) => x.sessionId !== d.sessionId),
                    ),
                  )
                  .catch((err) =>
                    console.error('Failed to discard session:', err),
                  )
              }
            />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 mt-4">
        {TYPE_OPTIONS.map((opt) => {
          const isInFlight = routing === opt.value;
          // Dim the other tiles while one is routing.
          const muted = routing !== null && routing !== opt.value;
          const accented = isInFlight;
          const isStrength =
            opt.value === 'upper' ||
            opt.value === 'lower' ||
            opt.value === 'full_body';

          const draft = isStrength
            ? draftByType[opt.value as StrengthValue]
            : null;

          return (
            <div key={opt.value} className="contents">
              <button
                type="button"
                onClick={() => handleTap(opt.value)}
                disabled={routing !== null}
                className={`card p-4 text-left min-h-[64px] transition-colors flex items-center justify-between ${
                  accented ? 'border-green-700 bg-green-100' : ''
                } ${muted ? 'opacity-50' : ''}`}
              >
                <span className="text-heading text-ink">{opt.label}</span>
                {/* Resume badge takes priority over "Due Next" — surfacing
                    both would be redundant, and the unfinished work is the
                    more actionable signal. */}
                {draft ? (
                  <span className="eyebrow text-right leading-tight">
                    Resume
                    <span className="block text-muted normal-case tracking-normal font-normal mt-0.5">
                      started {timeOfDayLabel(draft.created_at)}
                    </span>
                  </span>
                ) : (
                  opt.value !== 'cardio' && suggested === opt.value && (
                    <span className="eyebrow">
                      Due Next
                    </span>
                  )
                )}
              </button>

            </div>
          );
        })}
      </div>

      {/* Session date — defaults to today, editable for retroactive
          logging. Threaded into createSession so
          the chosen date lands on the row when it's created. A tapped
          tile with an existing draft ignores this field — the draft's
          original date persists; edit it on the completion screen. */}
      <div className="mt-4">
        <DateBlock
          value={sessionDate}
          onChange={setSessionDate}
          label="Session Date"
          ariaLabel="Session date"
        />
      </div>
      </div>
    </div>
  );
}

// Stale-session banner card. Surfaces an unfinished session up front with a
// VIEW of its contents (exercises + sets) and three actions: Resume as-is,
// Resume + change date, or Discard. Discard is never one-tap — it routes
// through a confirm that also force-reveals the contents, so the user always
// sees what they're deleting first.
function StaleDraftCard({
  draft,
  busy,
  onResume,
  onDiscard,
}: {
  draft: DraftSessionDetail;
  busy: boolean;
  onResume: (date?: string) => void;
  onDiscard: () => void;
}) {
  const [viewing, setViewing] = useState(false);
  const [mode, setMode] = useState<'idle' | 'date' | 'discard'>('idle');
  const [date, setDate] = useState(() => todayISODate());

  const totalSets = draft.exercises.reduce((n, e) => n + e.sets.length, 0);
  const label = STRENGTH_TYPE_LABEL[draft.type];

  return (
    <div className="card p-4">
      <p className="eyebrow">
        Unfinished Session
      </p>
      <p className="text-body text-ink mt-1 leading-snug">
        You have an unfinished <span className="font-semibold">{label}</span>{' '}
        session from {shortDateLabel(draft.date)}.
      </p>
      <p className="text-label text-muted mt-0.5">
        {draft.exercises.length} exercise
        {draft.exercises.length === 1 ? '' : 's'} · {totalSets} set
        {totalSets === 1 ? '' : 's'}
      </p>

      <button
        type="button"
        onClick={() => setViewing((v) => !v)}
        className="mt-2 text-green-700 text-label font-medium"
      >
        {viewing ? 'Hide contents' : 'View contents'}{' '}
        {viewing ? (
          <ChevronUp aria-hidden="true" size={14} strokeWidth={2} className="inline" />
        ) : (
          <ChevronDown aria-hidden="true" size={14} strokeWidth={2} className="inline" />
        )}
      </button>

      {viewing && (
        <div className="tile mt-2 p-3 space-y-2">
          {draft.exercises.length === 0 ? (
            <p className="text-label text-muted">No exercises logged yet.</p>
          ) : (
            draft.exercises.map((ex, i) => (
              <div key={i}>
                <p className="text-label text-ink font-medium">{ex.name}</p>
                {ex.sets.length === 0 ? (
                  <p className="text-label text-muted">No sets</p>
                ) : (
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                    {ex.sets.map((s) => (
                      <span key={s.id} className="text-label">
                        <span className="text-ink font-medium">
                          {s.weight}
                        </span>
                        <span className="text-muted">
                          ×{formatSetMagnitude(s)}
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {mode === 'idle' && (
        <div className="grid grid-cols-1 gap-2 mt-3">
          <button
            type="button"
            onClick={() => onResume()}
            disabled={busy}
            className="btn-primary"
          >
            Resume
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode('date')}
              disabled={busy}
              className="btn-secondary disabled:opacity-50"
            >
              Resume + change date
            </button>
            <button
              type="button"
              onClick={() => {
                setViewing(true);
                setMode('discard');
              }}
              disabled={busy}
              className="btn-secondary disabled:opacity-50"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {mode === 'date' && (
        <div className="mt-3">
          <DateBlock
            value={date}
            onChange={setDate}
            label="Resume on Date"
            ariaLabel="Resume on date"
          />
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={() => onResume(date)}
              disabled={busy}
              className="btn-primary flex-1"
            >
              Resume on this date
            </button>
            <button
              type="button"
              onClick={() => setMode('idle')}
              disabled={busy}
              className="btn-secondary flex-1 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {mode === 'discard' && (
        <div className="mt-3">
          <p className="text-label text-ink leading-snug">
            Discard this {label} session and all {totalSets} set
            {totalSets === 1 ? '' : 's'} above? This can't be undone.
          </p>
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={() => setMode('idle')}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onDiscard}
              className="btn-secondary flex-1"
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
