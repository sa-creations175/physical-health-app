import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { useToast } from '../components/ui/Toast';
import { SectionLabel } from '../components/ui/primitives';
import {
  createCardioLog,
  createCardioType,
  getMostUsedCardioTypes,
  getLastLogOfType,
  isRetroactive,
} from '../lib/cardioHelpers';
import {
  cardioDateLabel,
  clockLabel,
  timeBucketLabel,
} from '../lib/timeBucket';
import {
  DEFAULT_CARDIO_THRESHOLD_MINUTES,
} from '../lib/defaults';
import { getUserPreferences } from '../lib/userPreferences';
import type { Intensity } from '../db/types';

// Semantic colors when a pill is selected. Low = blue (calm / Zone 2),
// Moderate = deep green (the app's primary accent), High = amber
// (exertion). Unselected pills are filled grey (#686868) — never outline-
// only against the dark intensity block, which would render the affordance
// invisible.
interface IntensityVisual {
  bg: string;
}
const INTENSITY_VISUAL: Record<Intensity, IntensityVisual> = {
  low: { bg: '#378ADD' },
  moderate: { bg: '#0F6E56' },
  high: { bg: '#BA7517' },
};
const INTENSITY_OPTIONS: { value: Intensity; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'high', label: 'High' },
];

// Inline lucide-style "Activity" path — heart-pulse line. Mint to match
// the SectionLabel family. Pure SVG (no icon-lib dep) so it tree-shakes
// cleanly and stays predictable across themes.
function CardioGlyph() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#5DCAA5"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

// Compose user-picked date (YYYY-MM-DD local) + time (HH:MM local) into
// an ISO datetime that represents the intended local moment.
function composeStartedAt(dateISO: string, timeHHMM: string): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  const [h, mm] = timeHHMM.split(':').map(Number);
  return new Date(y, m - 1, d, h, mm, 0, 0).toISOString();
}

function startedAtFromDate(d: Date): { date: string; time: string } {
  const date = d.toLocaleDateString('en-CA');
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return { date, time };
}

export default function LogCardio() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const initial = useMemo(() => startedAtFromDate(new Date()), []);
  const [dateISO, setDateISO] = useState(initial.date);
  const [timeHHMM, setTimeHHMM] = useState(initial.time);
  const [cardioTypeId, setCardioTypeId] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(DEFAULT_CARDIO_THRESHOLD_MINUTES);
  const [durationText, setDurationText] = useState<string>(
    String(DEFAULT_CARDIO_THRESHOLD_MINUTES),
  );
  const [intensity, setIntensity] = useState<Intensity>('moderate');
  const [notes, setNotes] = useState('');
  const [picking, setPicking] = useState(false);
  const [retroPrompt, setRetroPrompt] = useState<{ daysAgo: number } | null>(null);
  const [saving, setSaving] = useState(false);

  const dateInputRef = useRef<HTMLInputElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);
  // Tracks which native picker is currently open so we can render a
  // fullscreen dismiss overlay behind it. The previous mousedown-on-
  // document approach didn't fire reliably (Chrome desktop's date popup
  // intercepts outside clicks before they bubble to document); the
  // overlay approach is more reliable because clicks that miss the
  // browser's picker UI hit our overlay directly.
  const [openNativePicker, setOpenNativePicker] = useState<
    'date' | 'time' | null
  >(null);

  // Pull threshold from prefs so the duration default matches what the
  // dashboard uses to decide qualifying vs short. Falls back to the
  // module constant for the brief first-render frame before prefs
  // resolve. Adopted exactly once (first prefs result) so a user who
  // manually types "20" can't get yanked to a different value when
  // the live query re-resolves.
  const prefs = useLiveQuery(() => getUserPreferences(), []);
  const adoptedPrefsRef = useRef(false);
  useEffect(() => {
    if (!prefs || adoptedPrefsRef.current) return;
    adoptedPrefsRef.current = true;
    const next = prefs.cardio_threshold_minutes;
    setDuration(next);
    setDurationText(String(next));
  }, [prefs]);

  const mostUsed = useLiveQuery(() => getMostUsedCardioTypes(5), []);
  const allTypes = useLiveQuery(
    () => db.cardio_types.orderBy('name').toArray(),
    [],
    [],
  );

  const selectedType = useMemo(
    () => allTypes.find((t) => t.id === cardioTypeId) ?? null,
    [allTypes, cardioTypeId],
  );

  const [lastLog, setLastLog] = useState<{
    duration_minutes: number;
    intensity: Intensity;
    daysAgo: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!cardioTypeId) {
      setLastLog(null);
      return;
    }
    getLastLogOfType(cardioTypeId)
      .then((res) => {
        if (cancelled) return;
        setLastLog(res);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to load last log:', err);
        setLastLog(null);
      });
    return () => {
      cancelled = true;
    };
  }, [cardioTypeId]);

  function bumpDuration(delta: number) {
    const next = Math.max(1, duration + delta);
    setDuration(next);
    setDurationText(String(next));
  }

  function commitDuration() {
    const trimmed = durationText.trim();
    const parsed = trimmed === '' ? 0 : parseInt(trimmed, 10);
    if (Number.isNaN(parsed) || parsed < 1) {
      setDuration(1);
      setDurationText('1');
      return;
    }
    const clamped = Math.min(600, parsed); // sanity ceiling, 10h
    setDuration(clamped);
    setDurationText(String(clamped));
  }

  function openPicker() {
    setPicking(true);
  }

  function pickType(id: string) {
    setCardioTypeId(id);
    setPicking(false);
  }

  function dismissNativePicker() {
    if (openNativePicker === 'date') dateInputRef.current?.blur();
    if (openNativePicker === 'time') timeInputRef.current?.blur();
    setOpenNativePicker(null);
  }

  async function performSave() {
    if (!cardioTypeId || saving) return;
    setSaving(true);
    try {
      const startedAt = composeStartedAt(dateISO, timeHHMM);
      await createCardioLog({
        cardio_type_id: cardioTypeId,
        duration_minutes: duration,
        intensity,
        started_at: startedAt,
        notes: notes.trim() === '' ? null : notes.trim(),
      });
      const typeName = selectedType?.name ?? 'session';
      showToast(`Cardio logged — ${typeName}, ${duration} min`);
      navigate('/');
    } catch (err) {
      console.error('Failed to save cardio log:', err);
      setSaving(false);
    }
  }

  function handleSaveTap() {
    if (!cardioTypeId || saving) return;
    const startedAt = composeStartedAt(dateISO, timeHHMM);
    const { isRetro, daysAgo } = isRetroactive(startedAt);
    if (isRetro) {
      setRetroPrompt({ daysAgo });
      return;
    }
    void performSave();
  }

  const startedAtRendered = useMemo(
    () => new Date(composeStartedAt(dateISO, timeHHMM)),
    [dateISO, timeHHMM],
  );
  const bucket = timeBucketLabel(startedAtRendered);
  const dateText = cardioDateLabel(dateISO);
  const timeText = clockLabel(startedAtRendered);

  const canSave = Boolean(cardioTypeId) && duration >= 1;

  return (
    <div className="px-5 pt-8 pb-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CardioGlyph />
          <h1 className="text-[22px] font-medium text-ink">Log cardio</h1>
        </div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-ink-soft text-[13px] min-h-[44px] min-w-[44px] flex items-center justify-end"
        >
          Cancel
        </button>
      </header>

      {/* When */}
      <section className="mt-6">
        <SectionLabel>When</SectionLabel>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {/* Date and Time fields: input is layered over the styled
              surface as an invisible overlay (inset-0, opacity-0). A tap
              anywhere on the surface lands directly on the input and the
              native picker opens via the input's own click handling — no
              showPicker() proxy, no <input> nested inside <button>
              (invalid HTML that broke the time picker). onFocus / onBlur
              drive the dismiss overlay state. */}
          <div
            style={{ borderLeftWidth: '2px', borderLeftColor: '#0F6E56' }}
            className="relative bg-card border border-card-edge rounded-xl p-3 min-h-[64px] flex flex-col"
          >
            <p className="text-[10px] tracking-micro uppercase text-card-mute">Date</p>
            <span className="mt-1 flex items-center justify-between gap-2">
              <span className="text-[15px] text-ink font-medium">{dateText}</span>
              <span aria-hidden className="text-card-mute text-[12px] leading-none">⌄</span>
            </span>
            <input
              ref={dateInputRef}
              type="date"
              value={dateISO}
              onChange={(e) => setDateISO(e.target.value)}
              onFocus={() => setOpenNativePicker('date')}
              onBlur={() => setOpenNativePicker(null)}
              aria-label="Date"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
          <div
            style={{ borderLeftWidth: '2px', borderLeftColor: '#0F6E56' }}
            className="relative bg-card border border-card-edge rounded-xl p-3 min-h-[64px] flex flex-col"
          >
            <p className="text-[10px] tracking-micro uppercase text-card-mute">
              Time · {bucket}
            </p>
            <span className="mt-1 flex items-center justify-between gap-2">
              <span className="text-[15px] text-ink font-medium">{timeText}</span>
              <span aria-hidden className="text-card-mute text-[12px] leading-none">⌄</span>
            </span>
            <input
              ref={timeInputRef}
              type="time"
              value={timeHHMM}
              onChange={(e) => setTimeHHMM(e.target.value)}
              onFocus={() => setOpenNativePicker('time')}
              onBlur={() => setOpenNativePicker(null)}
              aria-label="Time"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>
      </section>

      {/* Type */}
      <section className="mt-6">
        <SectionLabel>Type</SectionLabel>
        {mostUsed && mostUsed.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {mostUsed.map((t) => {
              const active = t.id === cardioTypeId;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setCardioTypeId(t.id)}
                  className={`px-3 min-h-[44px] rounded-full text-[13px] font-medium transition-colors ${
                    active
                      ? 'bg-green-deep text-ink border border-green-mint'
                      : 'bg-card text-ink-body border border-card-edge'
                  }`}
                >
                  {t.name}
                </button>
              );
            })}
          </div>
        )}
        <button
          type="button"
          onClick={openPicker}
          style={{ borderLeftWidth: '2px', borderLeftColor: '#0F6E56' }}
          className={`mt-2 w-full bg-card border rounded-xl p-3 min-h-[48px] text-left flex items-center justify-between ${
            selectedType ? 'border-green-mint' : 'border-card-edge'
          }`}
        >
          <span className="text-[15px] text-ink">
            {selectedType ? selectedType.name : 'Search or pick another'}
          </span>
          <span aria-hidden className="text-card-mute text-[16px]">⌄</span>
        </button>
        {lastLog && selectedType && (
          <p className="text-[11px] text-card-mute mt-2">
            Last logged: {selectedType.name} · {lastLog.duration_minutes} min ·{' '}
            <span className="capitalize">{lastLog.intensity}</span>,{' '}
            {lastLog.daysAgo === 0
              ? 'earlier today'
              : lastLog.daysAgo === 1
              ? 'yesterday'
              : `${lastLog.daysAgo} days ago`}
            .
          </p>
        )}
      </section>

      {/* Duration + Intensity — paired blocks, equal width, equal
          height (intensity stretches to match duration's natural
          height via the grid's items-stretch default). Both share the
          near-black surface and the mint left accent so they read as
          a single visual unit. */}
      <section className="mt-6 grid grid-cols-2 gap-2 items-stretch">
        {/* Duration block */}
        <div
          style={{
            borderLeftWidth: '2px',
            borderLeftColor: '#5DCAA5',
            padding: '14px 12px',
          }}
          className="bg-[#1a1a1a] rounded-lg flex flex-col items-center"
        >
          <p className="text-[9px] tracking-micro uppercase text-green-mint font-semibold">
            Duration
          </p>
          <input
            type="number"
            inputMode="numeric"
            value={durationText}
            onChange={(e) => setDurationText(e.target.value)}
            onBlur={commitDuration}
            aria-label="duration in minutes"
            // Input itself is the grey panel — tap to type. Native up/
            // down spinner suppressed so it doesn't fight the −5 / +5
            // buttons or distort the panel proportions.
            style={{ padding: '10px 24px' }}
            className="mt-3 bg-card text-[#f0f0f0] text-[32px] font-medium text-center rounded-md w-full [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none focus:outline-none"
          />
          <p className="text-[11px] text-card-mute mt-1">min</p>
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={() => bumpDuration(-5)}
              aria-label="decrease duration by 5 minutes"
              className="bg-card text-white text-[16px] font-medium rounded-md"
              style={{ width: '52px', height: '40px' }}
            >
              −5
            </button>
            <button
              type="button"
              onClick={() => bumpDuration(5)}
              aria-label="increase duration by 5 minutes"
              className="bg-card text-white text-[16px] font-medium rounded-md"
              style={{ width: '52px', height: '40px' }}
            >
              +5
            </button>
          </div>
        </div>

        {/* Intensity block */}
        <div
          style={{
            borderLeftWidth: '2px',
            borderLeftColor: '#5DCAA5',
            padding: '14px 12px',
          }}
          className="bg-[#1a1a1a] rounded-lg flex flex-col"
        >
          <p className="text-[9px] tracking-micro uppercase text-green-mint font-semibold text-center">
            Intensity
          </p>
          <div className="flex flex-col gap-1.5 mt-3">
            {INTENSITY_OPTIONS.map((opt) => {
              const active = opt.value === intensity;
              const visual = INTENSITY_VISUAL[opt.value];
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setIntensity(opt.value)}
                  style={
                    active
                      ? { background: visual.bg, color: '#f0f0f0' }
                      : { background: '#686868', color: '#dddddd' }
                  }
                  className="w-full rounded-md text-[13px] font-medium py-2.5 text-center transition-colors"
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Notes */}
      <section className="mt-6">
        <SectionLabel>Notes</SectionLabel>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional"
          rows={2}
          style={{ borderLeftWidth: '2px', borderLeftColor: '#0F6E56' }}
          className="mt-2 w-full bg-card border border-card-edge text-ink rounded-xl p-3 text-[16px] placeholder:text-card-mute resize-none"
        />
      </section>

      <button
        type="button"
        onClick={handleSaveTap}
        disabled={!canSave || saving}
        className="mt-6 w-full bg-green-deep text-ink rounded-xl py-3.5 text-[13px] font-medium uppercase tracking-micro min-h-[48px] disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save session'}
      </button>

      {picking && (
        <CardioTypePicker
          onPick={pickType}
          onClose={() => setPicking(false)}
          types={allTypes}
        />
      )}

      {retroPrompt && (
        <RetroactiveConfirm
          dateText={cardioDateLabel(dateISO)}
          daysAgo={retroPrompt.daysAgo}
          onCancel={() => setRetroPrompt(null)}
          onConfirm={() => {
            setRetroPrompt(null);
            void performSave();
          }}
        />
      )}

      {/* Dismiss overlay for native date / time picker. Sits above page
          content but below the browser's system-rendered picker UI.
          Clicking the picker itself goes to the picker (system layer);
          clicking anywhere else hits this overlay and closes. mousedown
          fires before the native picker can re-take focus, so the
          subsequent blur() reliably closes the popup. */}
      {openNativePicker && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-30"
          onMouseDown={(e) => {
            e.preventDefault();
            dismissNativePicker();
          }}
        />
      )}
    </div>
  );
}

function CardioTypePicker({
  types,
  onPick,
  onClose,
}: {
  types: { id: string; name: string }[];
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);

  const term = search.trim().toLowerCase();
  const filtered = term
    ? types.filter((t) => t.name.toLowerCase().includes(term))
    : types;

  async function handleCreateNew() {
    const trimmed = newName.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      const id = await createCardioType(trimmed);
      onPick(id);
    } catch (err) {
      console.error('Failed to create cardio type:', err);
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-charcoal z-50 flex flex-col">
      <header className="px-5 pt-8 pb-4 flex items-center justify-between">
        <h2 className="text-[19px] font-medium text-ink">
          {adding ? 'New activity' : 'Pick activity'}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-ink-soft text-[28px] w-11 h-11 flex items-center justify-center"
        >
          ×
        </button>
      </header>

      {!adding ? (
        <>
          <div className="px-5">
            <input
              type="text"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-card border border-card-edge text-ink rounded-xl px-4 h-11 text-[16px]"
            />
          </div>
          <div className="flex-1 overflow-y-auto px-5 mt-3 pb-3">
            {filtered.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onPick(t.id)}
                style={{ borderLeftWidth: '2px', borderLeftColor: '#0F6E56' }}
                className="w-full bg-card border border-card-edge rounded-xl p-3 mt-2 text-left min-h-[48px] text-[15px] text-ink"
              >
                {t.name}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-card-mute text-[13px] text-center mt-6">
                No matches. Add it below.
              </p>
            )}
          </div>
          <div
            className="px-5 py-3 border-t border-divider"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
          >
            <button
              type="button"
              onClick={() => {
                setAdding(true);
                setNewName(search);
              }}
              className="w-full bg-charcoal text-green-mint border border-green-deep rounded-xl py-3 text-[13px] font-semibold uppercase tracking-micro min-h-[48px]"
            >
              + Add new type
            </button>
          </div>
        </>
      ) : (
        <div className="flex-1 px-5 overflow-y-auto pb-6">
          <label className="block text-[11px] tracking-micro uppercase text-green-mint font-semibold">
            Name
          </label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
            className="w-full bg-card border border-card-edge text-ink rounded-xl px-4 h-11 text-[16px] mt-2"
          />
          <div className="flex gap-2 mt-6">
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="flex-1 bg-card border border-card-edge text-ink rounded-xl py-3 text-[13px] font-medium uppercase tracking-micro min-h-[48px]"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleCreateNew}
              disabled={!newName.trim() || busy}
              className="flex-1 bg-green-deep text-ink rounded-xl py-3 text-[13px] font-medium uppercase tracking-micro min-h-[48px] disabled:opacity-50"
            >
              Create &amp; pick
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RetroactiveConfirm({
  dateText,
  daysAgo,
  onCancel,
  onConfirm,
}: {
  dateText: string;
  daysAgo: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center px-5"
      style={{ background: 'rgba(0,0,0,0.55)' }}
    >
      <div
        className="bg-card border border-card-edge rounded-2xl p-5 w-full max-w-md mb-6"
        role="dialog"
        aria-modal="true"
      >
        <p className="text-[14px] text-ink leading-snug">
          Logging from <span className="text-ink font-medium">{dateText}</span> —
          that's {daysAgo} days ago. Save anyway?
        </p>
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-charcoal border border-card-edge text-ink rounded-xl py-3 text-[13px] font-medium uppercase tracking-micro min-h-[48px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 bg-green-deep text-ink rounded-xl py-3 text-[13px] font-medium uppercase tracking-micro min-h-[48px]"
          >
            Save anyway
          </button>
        </div>
      </div>
    </div>
  );
}
