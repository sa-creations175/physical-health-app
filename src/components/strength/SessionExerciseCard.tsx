import { useRef, useState } from 'react';
import { Check, ChevronDown, GripVertical, X } from 'lucide-react';
import LastTimeBlock from './LastTimeBlock';
import { summarizeSets, type LastTimeEntry, type SetValues } from '../../lib/sessionSets';
import { updateSessionExerciseNotes } from '../../lib/strengthHelpers';
import type { Row } from '../../lib/useSetRows';
import type { Exercise, SessionExercise, SetEntry } from '../../db/types';

export interface CardHandlers {
  onOpen: () => void;
  onClose: () => void;
  onSwap: () => void;
  onType: (key: string, field: 'weight' | 'reps', text: string) => void;
  onCheck: (key: string) => void;
  onRemove: (key: string) => void;
  onAddRow: () => void;
  onToggleUnit: (key: string) => void;
  onFinish: () => void;
  onReopen: () => void;
  onKeep: () => void;
  onJustToday: () => void;
}

// One exercise in a session, in one of three states:
//   closed   — one line: name and last time's summary
//   open     — swap, last time, set rows, add set, finish exercise
//   finished — folded on Mint: name, today's summary, a green check
export default function SessionExerciseCard({
  link,
  exercise,
  open,
  rows,
  setsById,
  lastTimes,
  nudge,
  typeLabel,
  h,
  drag,
  ghostFor,
}: {
  link: SessionExercise;
  exercise: Exercise;
  open: boolean;
  rows: Row[];
  setsById: Map<string, SetEntry>;
  lastTimes: LastTimeEntry[];
  nudge: boolean;
  typeLabel: string;
  h: CardHandlers;
  // Long-press reordering (open exercises only). `offset` is how far the card
  // is shifted while a drag is in progress; `held` marks the dragged card.
  drag?: { offset: number; held: boolean; onLongPress: (clientY: number) => void };
  // Placeholder values for a ghost row, when the screen overrides them.
  ghostFor?: (row: Row) => SetValues | null;
}) {
  const shift = drag?.offset
    ? { transform: `translateY(${drag.offset}px)`, transition: drag.held ? 'none' : 'transform 150ms ease' }
    : { transition: 'transform 150ms ease' };
  const finished = link.finished_order != null;

  if (finished) {
    const done = rows
      .map((r) => (r.setId ? setsById.get(r.setId) : undefined))
      .filter((s): s is SetEntry => !!s);
    const logged = done.length > 0 ? done : [...setsById.values()];
    return (
      <button
        type="button"
        id={`ex-${link.id}`}
        onClick={h.onReopen}
        className="tile w-full text-left px-4 py-3 mt-3 block"
      >
        <span className="flex items-center justify-between gap-2">
          <span className="text-body font-bold text-ink">{exercise.name}</span>
          <span className="w-[22px] h-[22px] rounded-full bg-green-700 text-white flex items-center justify-center shrink-0">
            <Check aria-hidden="true" size={13} strokeWidth={3} />
          </span>
        </span>
        <span className="block text-label text-muted tabular-nums mt-1">
          {summarizeSets(logged)}
        </span>
      </button>
    );
  }

  if (!open) {
    const last = lastTimes[0];
    return (
      <LongPressButton
        id={`ex-${link.id}`}
        onClick={h.onOpen}
        onLongPress={drag?.onLongPress}
        style={shift}
        className={`card w-full text-left px-4 py-3.5 mt-3 block select-none ${
          drag?.held ? 'relative z-10 border-green-700' : ''
        }`}
      >
        <span className="flex items-center justify-between gap-2">
          <span className="text-heading text-ink">{exercise.name}</span>
          {drag?.held ? (
            <GripVertical aria-hidden="true" size={18} strokeWidth={2} className="text-green-700 shrink-0" />
          ) : (
            <ChevronDown aria-hidden="true" size={16} strokeWidth={2} className="text-hint shrink-0" />
          )}
        </span>
        <span className="block text-label text-muted tabular-nums mt-1">
          {last ? `Last time: ${summarizeSets(last.sets)}` : 'No history yet'}
        </span>
      </LongPressButton>
    );
  }

  return (
    <div id={`ex-${link.id}`} className="card px-4 py-3.5 mt-3" style={shift}>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={h.onClose}
          aria-expanded="true"
          className="flex-1 text-left text-heading text-ink min-h-[36px]"
        >
          {exercise.name}
        </button>
        <button type="button" onClick={h.onSwap} className="pill py-1 px-2.5 shrink-0">
          Swap exercise
        </button>
      </div>

      <LastTimeBlock entries={lastTimes} className="mt-2 pt-1 border-t border-hairline" />

      <div className="mt-2">
        {rows.map((row, i) => (
          <SetRowView
            key={row.key}
            n={i + 1}
            row={row}
            ghost={ghostFor ? ghostFor(row) : row.ghost}
            set={row.setId ? setsById.get(row.setId) : undefined}
            onType={(field, text) => h.onType(row.key, field, text)}
            onCheck={() => h.onCheck(row.key)}
            onRemove={() => h.onRemove(row.key)}
            onToggleUnit={() => h.onToggleUnit(row.key)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={h.onAddRow}
        className="text-label font-bold text-green-700 min-h-[44px]"
      >
        + Add set
      </button>

      <NoteField linkId={link.id} notes={link.notes} />

      <div className="flex justify-end mt-1">
        <button type="button" onClick={h.onFinish} className="pill pill-soft min-h-[36px]">
          Finish exercise
        </button>
      </div>

      {nudge && (
        <div className="tile px-3 py-2.5 mt-3 text-label text-green-900">
          Second {typeLabel} in a row with {exercise.name}. Make it part of the usual list?
          <div className="flex gap-2 mt-2">
            <button type="button" onClick={h.onKeep} className="pill pill-soft py-1 px-2.5">
              Yes, keep it
            </button>
            <button type="button" onClick={h.onJustToday} className="pill py-1 px-2.5">
              Just today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// One set row: number, weight, reps (or seconds), the circle, the ×. Ghost
// rows show last time's numbers as placeholders. Swiping the row left removes
// it, same as the ×.
function SetRowView({
  n,
  row,
  ghost: ghostValues,
  set,
  onType,
  onCheck,
  onRemove,
  onToggleUnit,
}: {
  n: number;
  row: Row;
  ghost: SetValues | null;
  set: SetEntry | undefined;
  onType: (field: 'weight' | 'reps', text: string) => void;
  onCheck: () => void;
  onRemove: () => void;
  onToggleUnit: () => void;
}) {
  const ghost = !row.setId;
  const duration = row.setType === 'duration';
  const [dx, setDx] = useState(0);
  const start = useRef<{ x: number; y: number } | null>(null);

  const stored = (field: 'weight' | 'reps') => {
    if (!set) return '';
    if (field === 'weight') return String(set.weight);
    return String(duration ? (set.duration_seconds ?? 0) : set.reps);
  };
  const value = (field: 'weight' | 'reps') => row.draft[field] ?? stored(field);
  const placeholder = (field: 'weight' | 'reps') => {
    if (!ghostValues) return field === 'weight' ? 'lb' : duration ? 'sec' : 'reps';
    if (field === 'weight') return String(ghostValues.weight);
    return String(duration ? (ghostValues.duration_seconds ?? 0) : ghostValues.reps);
  };
  const checked = !!set?.completed;

  return (
    <div
      className="flex items-center gap-1.5 py-1 tabular-nums transition-transform"
      style={{ transform: dx ? `translateX(${dx}px)` : undefined }}
      onTouchStart={(e) => {
        start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }}
      onTouchMove={(e) => {
        if (!start.current) return;
        const mx = e.touches[0].clientX - start.current.x;
        const my = e.touches[0].clientY - start.current.y;
        if (Math.abs(mx) > Math.abs(my) && mx < 0) setDx(Math.max(mx, -120));
      }}
      onTouchEnd={() => {
        const remove = dx < -72;
        start.current = null;
        setDx(0);
        if (remove) onRemove();
      }}
    >
      <span className="w-5 text-label font-semibold text-hint shrink-0">{n}</span>
      <input
        type="number"
        inputMode="decimal"
        aria-label={`Set ${n} weight`}
        value={value('weight')}
        placeholder={placeholder('weight')}
        onChange={(e) => onType('weight', e.target.value)}
        className="input w-[60px] h-10 px-1 text-center"
      />
      <span className="text-label text-hint shrink-0">lb ×</span>
      <input
        type="number"
        inputMode="numeric"
        aria-label={`Set ${n} ${duration ? 'seconds' : 'reps'}`}
        value={value('reps')}
        placeholder={placeholder('reps')}
        onChange={(e) => onType('reps', e.target.value)}
        className="input w-[52px] h-10 px-1 text-center"
      />
      <button
        type="button"
        onClick={onToggleUnit}
        aria-label={duration ? 'Switch to reps' : 'Switch to seconds'}
        className="text-label text-hint min-h-[40px] w-9 text-left shrink-0"
      >
        {duration ? 'sec' : 'reps'}
      </button>
      <button
        type="button"
        onClick={onCheck}
        aria-label={checked ? `Uncheck set ${n}` : ghost ? `Set ${n} same as last time` : `Check set ${n}`}
        aria-pressed={checked}
        className="ml-auto w-10 h-11 flex items-center justify-center shrink-0"
      >
        <span
          className={`w-[26px] h-[26px] rounded-full border-2 flex items-center justify-center ${
            checked
              ? 'bg-green-700 border-green-700 text-white'
              : ghost
                ? 'border-hairline-warm text-transparent'
                : 'border-green-300 text-transparent'
          }`}
        >
          <Check aria-hidden="true" size={14} strokeWidth={3} />
        </span>
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove set ${n}`}
        className="w-7 h-11 flex items-center justify-center text-hint shrink-0"
      >
        <X size={16} strokeWidth={2} />
      </button>
    </div>
  );
}

// Per-exercise free-form note. Collapsed to "Add note" until used; saves on
// blur.
function NoteField({ linkId, notes }: { linkId: string; notes: string | null }) {
  const [expanded, setExpanded] = useState<boolean>(Boolean(notes));
  const [draft, setDraft] = useState<string>(notes ?? '');

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="block text-label font-bold text-green-700 min-h-[36px]"
      >
        Add note
      </button>
    );
  }
  return (
    <input
      type="text"
      value={draft}
      autoFocus={!notes}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const next = draft.trim() === '' ? null : draft.trim();
        if (next !== (notes ?? null)) void updateSessionExerciseNotes(linkId, next);
        if (next === null) setExpanded(false);
      }}
      placeholder="Note for this exercise"
      aria-label="Exercise note"
      className="input mt-1 w-full h-11"
    />
  );
}

// A button that also reports a long press (held ~450ms without moving). A
// finger that moves first is scrolling, so the press is cancelled.
const LONG_PRESS_MS = 450;
function LongPressButton({
  onLongPress,
  onClick,
  children,
  ...rest
}: {
  id: string;
  className: string;
  style?: React.CSSProperties;
  onClick: () => void;
  onLongPress?: (clientY: number) => void;
  children: React.ReactNode;
}) {
  const timer = useRef<number | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const cancel = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };
  const press = (x: number, y: number) => {
    if (!onLongPress) return;
    start.current = { x, y };
    cancel();
    timer.current = window.setTimeout(() => {
      timer.current = null;
      onLongPress(y);
    }, LONG_PRESS_MS);
  };
  const moved = (x: number, y: number) => {
    const s = start.current;
    if (s && Math.hypot(x - s.x, y - s.y) > 8) cancel();
  };
  return (
    <button
      type="button"
      {...rest}
      onClick={onClick}
      onContextMenu={(e) => onLongPress && e.preventDefault()}
      onTouchStart={(e) => press(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchMove={(e) => moved(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={cancel}
      onMouseDown={(e) => press(e.clientX, e.clientY)}
      onMouseMove={(e) => moved(e.clientX, e.clientY)}
      onMouseUp={cancel}
      onMouseLeave={cancel}
      style={{ ...rest.style, WebkitTouchCallout: 'none' }}
    >
      {children}
    </button>
  );
}
