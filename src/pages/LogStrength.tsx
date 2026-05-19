import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SectionLabel } from '../components/ui/primitives';
import {
  createSession,
  getDraftSessionByType,
  getLastSessionSummaryByType,
  repeatLastSession,
  suggestNextLiftingType,
  type DraftSessionSummary,
  type LastSessionSummary,
} from '../lib/strengthHelpers';
import {
  shortDateLabel,
  timeOfDayLabel,
  todayISODate,
} from '../lib/dateHelpers';
import DateBlock from '../components/ui/DateBlock';
import type { SessionType } from '../db/types';

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

  const tileRefs = useRef<Partial<Record<StrengthValue, HTMLButtonElement>>>({});
  const panelRef = useRef<HTMLDivElement | null>(null);

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
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to load draft sessions:', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
        style={{ color: '#777' }}
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
          style={{ backgroundColor: '#686868' }}
          className="rounded-xl p-3 text-[14px] font-medium text-white"
        >
          Start fresh
        </button>
      </div>
    </div>
  );
}
