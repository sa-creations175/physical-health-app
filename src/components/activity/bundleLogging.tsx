import { Check, ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { MobilityLink } from '../../lib/bundleHelpers';
import { COLOR } from '../../lib/brand';

// Shared logging controls for the daily-bundle exercises. Extracted from the
// old DailyBundleCard so both the bundle detail and the standalone mobility
// card reuse the exact same steppers, tap-to-type, and links UI.

// Rep exercise row: name + tap-to-type count + −/+ increment buttons.
export function ExerciseLogRow({
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
      <span className="text-body text-ink flex-1">{label}</span>

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
          className="input font-semibold text-center w-[64px] h-11 px-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none focus:outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`${label}: ${value} reps today — tap to type`}
          className="text-ink text-heading tabular-nums w-[64px] h-11 text-center"
        >
          {value}
        </button>
      )}

      <button
        type="button"
        onClick={() => bump(-increment)}
        aria-label={`Subtract ${increment} ${label}`}
        className="btn-secondary w-11 h-11 px-0 py-0 shrink-0"
      >
        −
      </button>
      <button
        type="button"
        onClick={() => bump(increment)}
        aria-label={`Add ${increment} ${label}`}
        className="btn-primary w-11 h-11 px-0 py-0 shrink-0"
      >
        +
      </button>
    </div>
  );
}

// Mobility row: label + qualifying check, ±5-minute stepper with tap-to-type,
// and a collapsible Links section.
export function MobilityRow({
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
        <span className="text-body text-ink">Flex / Mobility</span>
        {qualifying ? (
          <span
            aria-label="mobility target met today"
            className="text-green-700 text-heading leading-none"
          >
            <Check size={18} strokeWidth={2.5} />
          </span>
        ) : (
          <span
            aria-hidden="true"
            className="block w-4 h-4 rounded-full border border-hint"
          />
        )}
      </div>

      <div className="flex items-center gap-2 mt-1">
        <button
          type="button"
          onClick={() => bump(-5)}
          aria-label="Subtract 5 mobility minutes"
          className="btn-secondary w-11 h-11 px-0 py-0 shrink-0 text-label"
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
              className="input font-semibold text-center w-[64px] h-11 px-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none focus:outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label={`Mobility: ${minutes} minutes today — tap to type`}
              className="text-ink text-heading tabular-nums h-11"
            >
              {minutes}
            </button>
          )}
          <span className="text-label text-muted">min</span>
        </div>

        <button
          type="button"
          onClick={() => bump(5)}
          aria-label="Add 5 mobility minutes"
          className="btn-primary w-11 h-11 px-0 py-0 shrink-0 text-label"
        >
          +5
        </button>
      </div>

      <MobilityLinks links={links} onAdd={onAddLink} onDelete={onDeleteLink} />
    </div>
  );
}

// Always-present default: a YouTube *search* (not a fixed video) so results
// stay fresh. Rendered above the user's own links and can't be deleted.
const DEFAULT_MOBILITY_SEARCH = {
  label: '5-min mobility & stretch (YouTube)',
  url: `https://www.youtube.com/results?search_query=${encodeURIComponent(
    "5 minute men's mobility flexibility stretch",
  )}`,
};

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
        className="mt-2 text-green-700 text-label font-bold min-h-[44px]"
      >
        Links <ChevronDown aria-hidden="true" size={14} strokeWidth={2} className="inline" />
      </button>
    );
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-green-700 text-label font-bold min-h-[44px]"
      >
        Links <ChevronUp aria-hidden="true" size={14} strokeWidth={2} className="inline" />
      </button>

      <div className="mt-1.5 space-y-1.5">
        {/* Default search link — always available, not user-deletable. */}
        <button
          type="button"
          onClick={() => window.open(DEFAULT_MOBILITY_SEARCH.url, '_blank')}
          className="w-full flex items-center justify-between gap-2 bg-white border border-hairline rounded-input px-3 py-2 text-left min-h-[44px]"
        >
          <span className="text-label text-ink truncate">
            <Search aria-hidden="true" size={14} strokeWidth={2} className="inline -mt-0.5 mr-1 text-green-700" />
            {DEFAULT_MOBILITY_SEARCH.label}
          </span>
          <ExternalLinkIcon />
        </button>

        {links.map((link) => (
          <div key={link.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.open(link.url, '_blank')}
              className="flex-1 flex items-center justify-between gap-2 bg-white border border-hairline rounded-input px-3 py-2 text-left min-h-[44px]"
            >
              <span className="text-label text-ink truncate">{link.label}</span>
              <ExternalLinkIcon />
            </button>
            <button
              type="button"
              onClick={() => void onDelete(link.id)}
              aria-label={`Delete ${link.label}`}
              className="text-hint w-11 h-11 flex items-center justify-center shrink-0"
            >
              <X size={18} strokeWidth={2} />
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
              className="input w-full h-11"
            />
            <input
              type="url"
              inputMode="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="YouTube URL"
              aria-label="Link URL"
              className="input w-full h-11"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={save}
                disabled={!label.trim() || !url.trim()}
                aria-label="Save link"
                className="btn-primary flex-1"
              >
                <Check aria-hidden="true" size={16} strokeWidth={2.5} /> Save
              </button>
              <button
                type="button"
                onClick={cancel}
                aria-label="Cancel"
                className="btn-secondary flex-1"
              >
                <X aria-hidden="true" size={16} strokeWidth={2} /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-green-700 text-label font-bold min-h-[44px]"
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
      stroke={COLOR.green700}
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
