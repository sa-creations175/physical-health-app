import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SectionLabel } from '../components/ui/primitives';
import {
  createSession,
  discardSession,
  getDraftSessionByType,
  getDraftSessions,
  getLastSessionSummaryByType,
  repeatLastSession,
  suggestNextLiftingType,
  updateSessionDate,
  type DraftSessionDetail,
  type DraftSessionSummary,
  type LastSessionSummary,
} from '../lib/strengthHelpers';
import {
  shortDateLabel,
  timeOfDayLabel,
  todayISODate,
} from '../lib/dateHelpers';
import { formatSetMagnitude } from '../lib/setFormat';
import DateBlock from '../components/ui/DateBlock';
import type { SessionType } from '../db/types';

const STRENGTH_TYPE_LABEL: Record<'upper' | 'lower' | 'full_body', string> = {
  upper: 'Upper Body',
  lower: 'Lower Body',
  full_body: 'Full Body',
};

// Strength tiles: tap-to-route by default. When a completed session of the
// tapped type exists, the tap instead opens an inline panel beneath the
// tile offering "Repeat last session" or "Start fresh". Cardio is
// unaffected — it bypasses the session model and routes immediately.
type StrengthValue = 'upper' | 'lower' | 'full_body';
type TypeValue = StrengthValue | 'cardio';

const TYPE_OPTIONS: { value: TypeValue; label: string }[] = [
  { value: 'lower', label: 'Lower Body' },
  { value: 'upper', label: 'Upper Body' },
  { value: 'full_body', label: 'Full Body' },
  { value: 'cardio', label: 'Cardio' },
];

const STRENGTH_VALUES: StrengthValue[] = ['upper', 'lower', 'full_body'];

// Friendly label for the panel context line — matches the tile label so
// the user reads "Last Lower Body · …" not "Last lower · …".
const STRENGTH_LABEL: Record<StrengthValue, string> = {
  lower: 'Lower Body',
  upper: 'Upper Body',
  full_body: 'Full Body',
};

export default function LogStrength() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Suggestion math is strength-only (cross-pillar logic deferred). Cardio
  // never receives a "Due next" badge.
  const [suggested, setSuggested] = useState<SessionType | null>(null);
  const [routing, setRouting] = useState<TypeValue | null>(null);
  // null when no panel; otherwise the strength type currently expanded.
  const [panelType, setPanelType] = useState<StrengthValue | null>(null);
  const [lastByType, setLastByType] = useState<
    Record<StrengthValue, LastSessionSummary | null>
  >({ upper: null, lower: null, full_body: null });
  const [draftByType, setDraftByType] = useState<
    Record<StrengthValue, DraftSessionSummary | null>
  >({ upper: null, lower: null, full_body: null });
  const [sessionDate, setSessionDate] = useState(() => todayISODate());
  // Full unfinished-session detail (with contents) for the stale-session
  // banner. Loaded on mount; locally pruned when one is discarded so the
  // banner updates without a refetch.
  const [drafts, setDrafts] = useState<DraftSessionDetail[]>([]);

  const tileRefs = useRef<Partial<Record<StrengthValue, HTMLButtonElement>>>({});
  const panelRef = useRef<HTMLDivElement | null>(null);
  // Loaded flags for the two async sets — gate the ?type=X auto-tap so
  // we don't fire before lastByType / draftByType know what they are.
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [lastLoaded, setLastLoaded] = useState(false);
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

  // Load "last completed session" summary per strength type so the panel
  // can decide whether to open + render the context line. Refreshes when
  // we return to this screen (e.g. after a session completes); the
  // dependency-free effect refires on mount.
  useEffect(() => {
    let cancelled = false;
    Promise.all(STRENGTH_VALUES.map((t) => getLastSessionSummaryByType(t)))
      .then(([upper, lower, full_body]) => {
        if (cancelled) return;
        setLastByType({ upper, lower, full_body });
        setLastLoaded(true);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to load last sessions:', err);
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
    if (!draftLoaded || !lastLoaded) return;
    const param = searchParams.get('type');
    if (param !== 'upper' && param !== 'lower' && param !== 'full_body') return;
    autoTappedRef.current = true;
    void handleTap(param);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftLoaded, lastLoaded, searchParams]);

  // Outside-click closes the panel. We also dismiss on Escape so keyboard
  // users aren't trapped.
  useEffect(() => {
    if (panelType === null) return;
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      const tile = tileRefs.current[panelType];
      if (panelRef.current?.contains(target)) return;
      if (tile?.contains(target)) return;
      setPanelType(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPanelType(null);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [panelType]);

  async function handleTap(value: TypeValue) {
    if (routing) return;

    if (value === 'cardio') {
      setPanelType(null);
      setRouting(value);
      navigate('/log/cardio');
      return;
    }

    // Resume takes priority over both the repeat panel and a fresh
    // session — a half-finished workout should never get silently
    // shadowed by a new row.
    const draft = draftByType[value];
    if (draft) {
      setPanelType(null);
      setRouting(value);
      navigate(`/log/strength/active/${draft.sessionId}`);
      return;
    }

    // Strength tile — open panel iff a completed session of this type
    // exists. Otherwise route directly with the existing flow.
    const summary = lastByType[value];
    if (summary) {
      setPanelType(value);
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

  async function handleStartFresh(value: StrengthValue) {
    if (routing) return;
    setRouting(value);
    try {
      const id = await createSession(value, sessionDate);
      navigate(`/log/strength/active/${id}`);
    } catch (err) {
      console.error('Failed to start fresh session:', err);
      setRouting(null);
    }
  }

  async function handleRepeat(value: StrengthValue) {
    if (routing) return;
    setRouting(value);
    try {
      const id = await repeatLastSession(value, sessionDate);
      navigate(`/log/strength/active/${id}`);
    } catch (err) {
      console.error('Failed to repeat last session:', err);
      setRouting(null);
    }
  }

  return (
    <div className="px-5 pt-8 pb-8">
      <SectionLabel>Log Session</SectionLabel>
      <h1 className="text-[22px] font-medium text-ink mt-1">
        What kind of session?
      </h1>
      <p className="text-[12px] text-ink-soft mt-1">
        Tap to start logging.
      </p>

      {drafts.length > 0 && (
        <div className="mt-6 space-y-2">
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

      <div className="grid grid-cols-1 gap-2 mt-6">
        {TYPE_OPTIONS.map((opt) => {
          const isInFlight = routing === opt.value;
          const isPanelOpen = panelType === opt.value;
          // Dim a tile when ANOTHER tile is in-flight, OR when the panel
          // is open on a different tile. Both states are "we're focused
          // somewhere else; this tile is muted background".
          const muted =
            (routing !== null && routing !== opt.value) ||
            (panelType !== null && panelType !== opt.value);
          // The selected-for-panel tile gets the same mint border treatment
          // as the in-flight feedback so the user sees a single visual
          // affordance for "you tapped this one".
          const accented = isInFlight || isPanelOpen;
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
                ref={(el) => {
                  if (isStrength) {
                    tileRefs.current[opt.value as StrengthValue] = el ?? undefined;
                  }
                }}
                type="button"
                onClick={() => handleTap(opt.value)}
                disabled={routing !== null}
                style={{ borderLeftWidth: '2px', borderLeftColor: '#0F6E56' }}
                className={`bg-card border rounded-xl p-4 text-left min-h-[64px] transition-colors flex items-center justify-between ${
                  accented ? 'border-green-mint' : 'border-card-edge'
                } ${muted ? 'opacity-50' : ''}`}
              >
                <span className="text-[15px] font-medium text-ink">{opt.label}</span>
                {/* Resume badge takes priority over "Due next" — surfacing
                    both would be redundant, and the unfinished work is the
                    more actionable signal. */}
                {draft ? (
                  <span className="text-[10px] tracking-micro uppercase font-semibold text-green-mint text-right leading-tight">
                    Resume
                    <span className="block text-card-mute normal-case tracking-normal font-normal mt-0.5">
                      started {timeOfDayLabel(draft.created_at)}
                    </span>
                  </span>
                ) : (
                  opt.value !== 'cardio' && suggested === opt.value && (
                    <span className="text-[10px] tracking-micro uppercase font-semibold text-green-mint">
                      Due next
                    </span>
                  )
                )}
              </button>

              {isStrength && (
                <RepeatPanel
                  open={isPanelOpen}
                  ref={isPanelOpen ? panelRef : null}
                  summary={lastByType[opt.value as StrengthValue]}
                  type={opt.value as StrengthValue}
                  onRepeat={() => handleRepeat(opt.value as StrengthValue)}
                  onStartFresh={() => handleStartFresh(opt.value as StrengthValue)}
                  disabled={routing !== null}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Session date — defaults to today, editable for retroactive
          logging. Threaded into createSession / repeatLastSession so
          the chosen date lands on the row when it's created. A tapped
          tile with an existing draft ignores this field — the draft's
          original date persists; edit it on the completion screen. */}
      <div className="mt-4">
        <DateBlock
          value={sessionDate}
          onChange={setSessionDate}
          label="Session date"
          ariaLabel="Session date"
        />
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
    <div
      className="bg-card border border-card-edge rounded-xl p-4"
      style={{ borderLeftWidth: '3px', borderLeftColor: '#d98a2b' }}
    >
      <p className="text-[10px] tracking-micro uppercase font-semibold text-[#b56f1d]">
        Unfinished session
      </p>
      <p className="text-[14px] text-ink mt-1 leading-snug">
        You have an unfinished <span className="font-semibold">{label}</span>{' '}
        session from {shortDateLabel(draft.date)}.
      </p>
      <p className="text-[12px] text-card-mute mt-0.5">
        {draft.exercises.length} exercise
        {draft.exercises.length === 1 ? '' : 's'} · {totalSets} set
        {totalSets === 1 ? '' : 's'}
      </p>

      <button
        type="button"
        onClick={() => setViewing((v) => !v)}
        className="mt-2 text-green-mid text-[12px] font-medium"
      >
        {viewing ? 'Hide contents ▴' : 'View contents ▾'}
      </button>

      {viewing && (
        <div className="mt-2 bg-charcoal border border-card-edge rounded-lg p-3 space-y-2">
          {draft.exercises.length === 0 ? (
            <p className="text-[12px] text-card-mute">No exercises logged yet.</p>
          ) : (
            draft.exercises.map((ex, i) => (
              <div key={i}>
                <p className="text-[13px] text-ink font-medium">{ex.name}</p>
                {ex.sets.length === 0 ? (
                  <p className="text-[11px] text-card-mute">No sets</p>
                ) : (
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                    {ex.sets.map((s) => (
                      <span key={s.id} className="text-[12px]">
                        <span className="text-ink-body font-medium">
                          {s.weight}
                        </span>
                        <span className="text-card-mute">
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
            style={{ backgroundColor: '#0F6E56' }}
            className="rounded-xl p-3 text-[14px] font-medium text-white disabled:opacity-50"
          >
            Resume
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode('date')}
              disabled={busy}
              className="rounded-xl p-3 text-[13px] font-medium text-ink bg-[#eef1ef] border border-card-edge disabled:opacity-50"
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
              className="rounded-xl p-3 text-[13px] font-medium text-[#7a2222] bg-[#eef1ef] border border-card-edge disabled:opacity-50"
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
            label="Resume on date"
            ariaLabel="Resume on date"
          />
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={() => onResume(date)}
              disabled={busy}
              style={{ backgroundColor: '#0F6E56' }}
              className="flex-1 rounded-xl p-3 text-[13px] font-medium text-white disabled:opacity-50"
            >
              Resume on this date
            </button>
            <button
              type="button"
              onClick={() => setMode('idle')}
              disabled={busy}
              className="flex-1 rounded-xl p-3 text-[13px] font-medium text-ink bg-[#eef1ef] border border-card-edge disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {mode === 'discard' && (
        <div className="mt-3">
          <p className="text-[13px] text-ink leading-snug">
            Discard this {label} session and all {totalSets} set
            {totalSets === 1 ? '' : 's'} above? This can't be undone.
          </p>
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={() => setMode('idle')}
              className="flex-1 rounded-xl p-3 text-[13px] font-medium text-ink bg-[#eef1ef] border border-card-edge"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onDiscard}
              style={{ background: '#7a2222' }}
              className="flex-1 rounded-xl p-3 text-[13px] font-medium text-white"
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface RepeatPanelProps {
  open: boolean;
  summary: LastSessionSummary | null;
  type: StrengthValue;
  onRepeat: () => void;
  onStartFresh: () => void;
  disabled: boolean;
  ref: React.Ref<HTMLDivElement> | null;
}

// Slide-down + fade panel that sits inline beneath the tapped tile. Mounts
// only when open so the empty state never renders. Animation uses opacity
// + transform — no spring, no bounce; consistent with the app's flat
// no-glow aesthetic.
function RepeatPanel({
  open,
  summary,
  type,
  onRepeat,
  onStartFresh,
  disabled,
  ref,
}: RepeatPanelProps) {
  // Drive the visible state through a one-tick delay so the entrance
  // transition runs from initial → open. Without this the panel pops in
  // because the initial render already has the open styles applied.
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!open) {
      setVisible(false);
      return;
    }
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  if (!open || !summary) return null;

  return (
    <div
      ref={ref}
      className={`bg-card border border-card-edge rounded-xl p-4 transition-[opacity,transform] duration-100 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'
      }`}
    >
      <div
        className="text-[12px] mb-3"
        style={{ color: '#6b756e' }}
      >
        Last {STRENGTH_LABEL[type]} · {shortDateLabel(summary.date)} ·{' '}
        {summary.exerciseCount} exercise{summary.exerciseCount === 1 ? '' : 's'}
      </div>
      <div className="grid grid-cols-1 gap-2">
        <button
          type="button"
          onClick={onRepeat}
          disabled={disabled}
          style={{ backgroundColor: '#0F6E56' }}
          className="rounded-xl p-3 text-[14px] font-medium text-white"
        >
          Repeat last session
        </button>
        <button
          type="button"
          onClick={onStartFresh}
          disabled={disabled}
          style={{ backgroundColor: '#eef1ef' }}
          className="rounded-xl p-3 text-[14px] font-medium text-ink border border-card-edge"
        >
          Start fresh
        </button>
      </div>
    </div>
  );
}
