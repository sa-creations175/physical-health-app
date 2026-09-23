import { ChevronDown } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { useToast } from '../components/ui/Toast';
import { SectionLabel } from '../components/ui/primitives';
import HeaderStrip from '../components/ui/HeaderStrip';
import BottomSheet from '../components/ui/BottomSheet';
import CloseButton from '../components/ui/CloseButton';
import {
  createCardioLog,
  createCardioType,
  getMostUsedCardioTypes,
  getLastLogOfType,
  isDistanceEligible,
  isRetroactive,
} from '../lib/cardioHelpers';
import {
  cardioDateLabel,
  timeBucketLabel,
} from '../lib/timeBucket';
import {
  DEFAULT_CARDIO_THRESHOLD_MINUTES,
} from '../lib/defaults';
import { getUserPreferences } from '../lib/userPreferences';
import type { Intensity } from '../db/types';

// Intensity options use the shared selection pill: Green 700 when selected,
// white with a hairline otherwise.
const INTENSITY_OPTIONS: { value: Intensity; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'high', label: 'High' },
];

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
  // Distance is opt-in: distanceShown gates the input (false → render
  // the "Add distance" tap-target; true → render the input + nudge
  // buttons). Only persisted when the selected type is in
  // DISTANCE_ELIGIBLE_TYPES — see save handler below.
  const [distanceShown, setDistanceShown] = useState(false);
  const [distance, setDistance] = useState<number>(0);
  const [distanceText, setDistanceText] = useState<string>('');
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
  const distanceEligible = isDistanceEligible(selectedType?.name);

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

  // 0.1-step nudges with floating-point safe rounding (0.1 + 0.2 isn't
  // exactly 0.3 in IEEE-754, so round through *10). Clamp 0..100 — a
  // 100-mile session covers Ironman + then some, plenty of headroom.
  function bumpDistance(delta: number) {
    const next = Math.max(
      0,
      Math.min(100, Math.round(((distance ?? 0) + delta) * 10) / 10),
    );
    setDistance(next);
    setDistanceText(next.toFixed(1));
  }

  function commitDistance() {
    const trimmed = distanceText.trim();
    if (trimmed === '') {
      // User cleared the field → revert to "Add distance" affordance.
      setDistance(0);
      setDistanceText('');
      setDistanceShown(false);
      return;
    }
    const parsed = parseFloat(trimmed);
    if (Number.isNaN(parsed) || parsed < 0) {
      setDistance(0);
      setDistanceText('0.0');
      return;
    }
    const clamped = Math.max(0, Math.min(100, Math.round(parsed * 10) / 10));
    setDistance(clamped);
    setDistanceText(clamped.toFixed(1));
  }

  function showDistanceInput() {
    setDistanceShown(true);
    setDistance(0);
    setDistanceText('0.0');
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
      // Distance only persists when both the type is eligible AND the
      // user actually entered a value (distanceShown). State for the
      // input is preserved across type toggles, but a non-eligible
      // type at save time always writes null.
      const eligibleNow = isDistanceEligible(selectedType?.name);
      await createCardioLog({
        cardio_type_id: cardioTypeId,
        duration_minutes: duration,
        intensity,
        started_at: startedAt,
        distance_miles: eligibleNow && distanceShown ? distance : null,
        notes: notes.trim() === '' ? null : notes.trim(),
      });
      const typeName = selectedType?.name ?? 'session';
      showToast(`Cardio logged: ${typeName}, ${duration} min`);
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
  // timeText is no longer rendered — the native <input type="time">
  // displays the value itself now. Bucket label still drives off the
  // composed datetime via timeBucketLabel above.

  const canSave = Boolean(cardioTypeId) && duration >= 1;

  return (
    <div className="pb-8">
      <HeaderStrip
        eyebrow="Body · Log"
        title="Log Cardio"
        right={
          <button type="button" onClick={() => navigate(-1)} className="pill min-h-[44px]">
            Cancel
          </button>
        }
      />
      <div className="px-4">

      {/* When */}
      <section className="mt-6">
        <SectionLabel>When</SectionLabel>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {/* Date uses an invisible-overlay input + explicit
              showPicker() so we can keep our custom "Today / Yesterday"
              relative label as the visible value while the native popup
              still opens on tap. Time can't use the same trick:
              showPicker() silently no-ops on opacity:0 type="time"
              inputs in some browsers (Safari especially), so the time
              field below uses a visible input instead. */}
          <div className="relative bg-white border border-hairline rounded-input p-3 min-h-[64px] flex flex-col">
            <p className="eyebrow">
              Date
            </p>
            <span className="mt-1 flex items-center justify-between gap-2">
              <span className="text-body text-ink font-medium">{dateText}</span>
              <ChevronDown aria-hidden="true" size={16} strokeWidth={2} className="text-muted shrink-0" />
            </span>
            <input
              ref={dateInputRef}
              type="date"
              value={dateISO}
              onChange={(e) => setDateISO(e.target.value)}
              onFocus={() => setOpenNativePicker('date')}
              onBlur={() => setOpenNativePicker(null)}
              onClick={() => {
                const el = dateInputRef.current;
                if (el && typeof el.showPicker === 'function') {
                  try { el.showPicker(); } catch { /* fall back to focus */ }
                }
              }}
              aria-label="Date"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
          {/* Visible time input — see comment on the date field above
              for the asymmetry rationale. Native UI (Chrome popup /
              iOS wheel sheet / macOS spinners) signals interactivity
              instead of our chevron. */}
          <div className="bg-white border border-hairline rounded-input p-3 min-h-[64px] flex flex-col">
            <p className="eyebrow">
              Time · {bucket}
            </p>
            <input
              ref={timeInputRef}
              type="time"
              value={timeHHMM}
              onChange={(e) => setTimeHHMM(e.target.value)}
              onFocus={() => setOpenNativePicker('time')}
              onBlur={() => setOpenNativePicker(null)}
              aria-label="Time"
              // colorScheme:dark nudges browsers that respect it to
              // render the native picker UI in dark mode so the popup
              // doesn't flash white. font-size 16px dodges iOS Safari's
              // auto-zoom-on-focus behavior, same as our other inputs.
              style={{ colorScheme: 'dark' }}
              className="mt-1 bg-transparent text-ink text-input border-0 outline-none p-0 w-full"
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
                  className={`pill min-h-[44px] ${active ? 'pill-on' : ''}`}
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
          className={`mt-2 w-full bg-white border rounded-input p-3 min-h-[48px] text-left flex items-center justify-between ${
            selectedType ? 'border-green-700' : 'border-hairline'
          }`}
        >
          <span className="text-body text-ink">
            {selectedType ? selectedType.name : 'Search or pick another'}
          </span>
          <ChevronDown aria-hidden="true" size={16} strokeWidth={2} className="text-muted shrink-0" />
        </button>
        {lastLog && selectedType && (
          <p className="text-label text-muted mt-2">
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
        {/* Duration block — collapses to a single Duration section on
            non-eligible types; expands to stacked Time + Distance
            sub-sections on Run / Bike / Walk / Hike / Row. */}
        <div className="tile px-3 py-3.5 flex flex-col items-center">
          {distanceEligible ? (
            <>
              {/* TIME sub-section */}
              <p className="eyebrow">
                Time
              </p>
              <input
                type="number"
                inputMode="numeric"
                value={durationText}
                onChange={(e) => setDurationText(e.target.value)}
                onBlur={commitDuration}
                aria-label="duration in minutes"
                style={{ padding: '8px 18px' }}
                className="mt-3 bg-white border border-hairline rounded-input text-ink text-display text-center w-full [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none focus:outline-none"
              />
              <p className="text-label text-muted mt-1">min</p>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => bumpDuration(-5)}
                  aria-label="decrease duration by 5 minutes"
                  className="btn-secondary w-11 h-11 px-0 py-0 text-label"
                >
                  −5
                </button>
                <button
                  type="button"
                  onClick={() => bumpDuration(5)}
                  aria-label="increase duration by 5 minutes"
                  className="btn-secondary w-11 h-11 px-0 py-0 text-label"
                >
                  +5
                </button>
              </div>

              {/* Divider — 0.5px hairline using transform so subpixel
                  thickness survives DPR rounding on high-density displays. */}
              <div
                aria-hidden="true"
                className="w-full bg-hairline"
                style={{
                  height: '1px',
                  transform: 'scaleY(0.5)',
                  marginTop: '14px',
                  marginBottom: '14px',
                }}
              />

              {/* DISTANCE sub-section */}
              <p className="eyebrow">
                Distance
              </p>
              {distanceShown ? (
                <>
                  <input
                    key="distance-input"
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    autoFocus
                    onFocus={(e) => e.currentTarget.select()}
                    value={distanceText}
                    onChange={(e) => setDistanceText(e.target.value)}
                    onBlur={commitDistance}
                    aria-label="distance in miles"
                    style={{ padding: '8px 18px' }}
                    className="mt-3 bg-white border border-hairline rounded-input text-ink text-display text-center w-full [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none focus:outline-none"
                  />
                  <p className="text-label text-muted mt-1">mi</p>
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => bumpDistance(-0.1)}
                      aria-label="decrease distance by 0.1 mile"
                      className="btn-secondary w-11 h-11 px-0 py-0 text-label"
                    >
                      −.1
                    </button>
                    <button
                      type="button"
                      onClick={() => bumpDistance(0.1)}
                      aria-label="increase distance by 0.1 mile"
                      className="btn-secondary w-11 h-11 px-0 py-0 text-label"
                    >
                      +.1
                    </button>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  onClick={showDistanceInput}
                  className="mt-3 w-full text-center text-green-700 font-bold text-body min-h-[44px]"
                >
                  Add distance
                </button>
              )}
            </>
          ) : (
            <>
              <p className="eyebrow">
                Duration
              </p>
              <input
                type="number"
                inputMode="numeric"
                value={durationText}
                onChange={(e) => setDurationText(e.target.value)}
                onBlur={commitDuration}
                aria-label="duration in minutes"
                style={{ padding: '10px 24px' }}
                className="mt-3 bg-white border border-hairline rounded-input text-ink text-display text-center w-full [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none focus:outline-none"
              />
              <p className="text-label text-muted mt-1">min</p>
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => bumpDuration(-5)}
                  aria-label="decrease duration by 5 minutes"
                  className="btn-secondary w-[52px] h-11 px-0 py-0"
                >
                  −5
                </button>
                <button
                  type="button"
                  onClick={() => bumpDuration(5)}
                  aria-label="increase duration by 5 minutes"
                  className="btn-secondary w-[52px] h-11 px-0 py-0"
                >
                  +5
                </button>
              </div>
            </>
          )}
        </div>

        {/* Intensity block */}
        <div className="tile px-3 py-3.5 flex flex-col">
          <p className="eyebrow text-center">
            Intensity
          </p>
          <div className="flex flex-col gap-1.5 mt-3">
            {INTENSITY_OPTIONS.map((opt) => {
              const active = opt.value === intensity;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setIntensity(opt.value)}
                  className={`pill w-full min-h-[44px] ${active ? 'pill-on' : ''}`}
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
          className="input mt-2 w-full p-3 resize-none"
        />
      </section>

      <button
        type="button"
        onClick={handleSaveTap}
        disabled={!canSave || saving}
        className="btn-primary mt-6 w-full disabled:opacity-50"
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
    <div className="fixed inset-0 bg-paper z-50 flex flex-col overflow-hidden">
      <HeaderStrip
        overlay
        eyebrow="Body · Log"
        title={adding ? 'New Activity' : 'Pick Activity'}
        right={<CloseButton onClose={onClose} />}
      />
      <div className="h-3 shrink-0" />

      {!adding ? (
        <>
          <div className="px-4">
            <input
              type="text"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input w-full px-4 h-11"
            />
          </div>
          <div className="flex-1 overflow-y-auto px-4 mt-3 pb-3">
            {filtered.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onPick(t.id)}
                className="w-full card p-3 mt-2 text-left min-h-[48px] text-body text-ink"
              >
                {t.name}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-muted text-label text-center mt-6">
                No matches. Add it below.
              </p>
            )}
          </div>
          <div
            className="px-4 py-3 border-t border-hairline"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
          >
            <button
              type="button"
              onClick={() => {
                setAdding(true);
                setNewName(search);
              }}
              className="btn-secondary w-full"
            >
              + Add new type
            </button>
          </div>
        </>
      ) : (
        <div className="flex-1 px-4 overflow-y-auto pb-6">
          <label className="block eyebrow">
            Name
          </label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
            className="input w-full px-4 h-11 mt-2"
          />
          <div className="flex gap-2 mt-6">
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="btn-secondary flex-1"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleCreateNew}
              disabled={!newName.trim() || busy}
              className="btn-primary flex-1 disabled:opacity-50"
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
    <BottomSheet onClose={onCancel} label="Confirm date">
        <p className="text-body text-ink leading-snug pr-10">
          Logging from <span className="text-ink font-medium">{dateText}</span>,
          that's {daysAgo} days ago. Save anyway?
        </p>
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="btn-primary flex-1"
          >
            Save anyway
          </button>
        </div>
    </BottomSheet>
  );
}
