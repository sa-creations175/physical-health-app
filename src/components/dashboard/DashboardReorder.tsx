import { useEffect, useRef, useState } from 'react';
import type { SectionConfigMap } from '../../hooks/useDashboardConfig';
import type { DashboardSectionMeta } from '../../lib/defaults';

// Reorder / customization view. Replaces the normal dashboard content while
// active: a mint banner with a Done button, then one card per section
// (including hidden ones). Reordering is by ↑/↓ arrow buttons — tapped moves
// swap a section with its neighbor and persist immediately via updateOrder.
// (Was HTML5 drag-and-drop through Build 2.5; swapped to arrows because DnD is
// unreliable on iOS Safari.) Eye toggles visibility, pencil inline-renames —
// both persist immediately too, so Done is a pure exit with no save step.

const MIN_VISIBLE_MESSAGE = 'At least one section must be visible';

export default function DashboardReorder({
  allSections,
  config,
  updateOrder,
  updateSection,
  onDone,
}: {
  allSections: string[];
  config: SectionConfigMap;
  updateOrder: (newOrder: string[]) => Promise<void>;
  updateSection: (
    key: string,
    patch: Partial<DashboardSectionMeta>,
  ) => Promise<void>;
  onDone: () => void;
}) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const msgTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (msgTimer.current !== null) window.clearTimeout(msgTimer.current);
    },
    [],
  );

  const visibleCount = allSections.filter((k) => config[k]?.visible).length;

  function flashMessage(text: string) {
    if (msgTimer.current !== null) window.clearTimeout(msgTimer.current);
    setMessage(text);
    msgTimer.current = window.setTimeout(() => {
      setMessage(null);
      msgTimer.current = null;
    }, 2500);
  }

  // Swap a section with its neighbor in `dir` (-1 up, +1 down) and persist.
  function move(key: string, dir: -1 | 1) {
    const idx = allSections.indexOf(key);
    const target = idx + dir;
    if (idx === -1 || target < 0 || target >= allSections.length) return;
    const next = allSections.slice();
    [next[idx], next[target]] = [next[target], next[idx]];
    void updateOrder(next);
  }

  function handleToggleVisible(key: string) {
    const isVisible = config[key]?.visible ?? true;
    // Refuse to hide the last visible section — there'd be nothing to show.
    if (isVisible && visibleCount <= 1) {
      flashMessage(MIN_VISIBLE_MESSAGE);
      return;
    }
    void updateSection(key, { visible: !isVisible });
  }

  return (
    <div className="px-5 pt-3 pb-8">
      {/* Banner */}
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#e7f5ef] px-4 py-3">
        <p className="text-[13px] text-green-mid leading-snug">
          Use ↑ ↓ to reorder — tap ✓ to save
        </p>
        <button
          type="button"
          onClick={onDone}
          aria-label="Done reordering"
          className="shrink-0 bg-green-deep text-white rounded-full w-9 h-9 flex items-center justify-center text-[16px] leading-none"
        >
          ✓
        </button>
      </div>

      {message && (
        <p className="mt-2 text-[12px] text-red-alert text-center">{message}</p>
      )}

      {/* Cards */}
      <div className="mt-3 space-y-2">
        {allSections.map((key, i) => {
          const meta = config[key];
          if (!meta) return null;
          return (
            <ReorderCard
              key={key}
              meta={meta}
              isFirst={i === 0}
              isLast={i === allSections.length - 1}
              editing={editingKey === key}
              onMoveUp={() => move(key, -1)}
              onMoveDown={() => move(key, 1)}
              onToggleVisible={() => handleToggleVisible(key)}
              onStartEdit={() => setEditingKey(key)}
              onCommitEdit={(label) => {
                const trimmed = label.trim();
                if (trimmed && trimmed !== meta.label) {
                  void updateSection(key, { label: trimmed });
                }
                setEditingKey(null);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function ReorderCard({
  meta,
  isFirst,
  isLast,
  editing,
  onMoveUp,
  onMoveDown,
  onToggleVisible,
  onStartEdit,
  onCommitEdit,
}: {
  meta: DashboardSectionMeta;
  isFirst: boolean;
  isLast: boolean;
  editing: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleVisible: () => void;
  onStartEdit: () => void;
  onCommitEdit: (label: string) => void;
}) {
  const [text, setText] = useState(meta.label);

  // Re-seed the field whenever an edit session opens, so it starts from the
  // current label even after an external rename.
  useEffect(() => {
    if (editing) setText(meta.label);
  }, [editing, meta.label]);

  const hidden = !meta.visible;

  return (
    <div
      className={`bg-card shadow-card rounded-2xl px-3 py-2 flex items-center gap-2 ${
        hidden ? 'opacity-50' : ''
      }`}
    >
      {/* Reorder arrows (replace the old drag handle). */}
      <div className="flex flex-col shrink-0">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={isFirst}
          aria-label={`Move ${meta.label} up`}
          className={`w-11 h-11 flex items-center justify-center text-[20px] leading-none ${
            isFirst ? 'text-dim cursor-not-allowed' : 'text-green-mid'
          }`}
        >
          ↑
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={isLast}
          aria-label={`Move ${meta.label} down`}
          className={`w-11 h-11 flex items-center justify-center text-[20px] leading-none ${
            isLast ? 'text-dim cursor-not-allowed' : 'text-green-mid'
          }`}
        >
          ↓
        </button>
      </div>

      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            onBlur={() => onCommitEdit(text)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
            aria-label={`Rename ${meta.label} section`}
            className="w-full bg-transparent border-0 border-b border-green-mid outline-none text-[16px] text-ink font-display py-0.5"
          />
        ) : (
          <span
            className={`block truncate font-display text-[15px] text-ink ${
              hidden ? 'line-through' : ''
            }`}
          >
            {meta.label}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={onToggleVisible}
        aria-label={hidden ? `Show ${meta.label}` : `Hide ${meta.label}`}
        aria-pressed={!hidden}
        className="shrink-0 w-11 h-11 flex items-center justify-center"
      >
        {hidden ? <EyeOffIcon /> : <EyeIcon />}
      </button>
      <button
        type="button"
        onClick={onStartEdit}
        aria-label={`Rename ${meta.label}`}
        className="shrink-0 w-11 h-11 flex items-center justify-center"
      >
        <PencilIcon />
      </button>
    </div>
  );
}

// --- inline icons (no icon-lib dependency, matches PillarIcons approach) ---

function EyeIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#1a6b4a"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#9aa39d"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#1a6b4a"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}
