import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { formatSetList, LAST_TIME_MAX, type LastTimeEntry } from '../../lib/sessionSets';

const OPEN_COUNT = 3;

function shortDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

// "Last time" for one exercise. Closed it shows the most recent session; open
// it lists three, with "Show 2 more" for five. Tapping the block toggles it.
// Used closed in a session card and open on the exercise's Library page.
export default function LastTimeBlock({
  entries,
  defaultOpen = false,
  className = '',
}: {
  entries: LastTimeEntry[];
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [more, setMore] = useState(false);

  const shown = open ? entries.slice(0, more ? LAST_TIME_MAX : OPEN_COUNT) : entries.slice(0, 1);
  const canShowMore = open && !more && entries.length > OPEN_COUNT;
  const hidden = Math.min(entries.length, LAST_TIME_MAX) - OPEN_COUNT;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between min-h-[32px] text-left"
      >
        <span className="micro text-green-500">Last Time</span>
        <ChevronDown
          aria-hidden="true"
          size={16}
          strokeWidth={2}
          className={`text-hint transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {entries.length === 0 ? (
        <p className="text-label text-muted py-1">No history yet</p>
      ) : (
        shown.map((e) => (
          <div key={e.sessionId} className="flex justify-between gap-3 py-1 text-label tabular-nums">
            <span className="text-muted shrink-0 w-14">{shortDate(e.date)}</span>
            <span className="text-ink text-right">{formatSetList(e.sets)}</span>
          </div>
        ))
      )}
      {canShowMore && (
        <button
          type="button"
          onClick={() => setMore(true)}
          className="text-label font-bold text-green-700 min-h-[32px]"
        >
          Show {hidden} more
        </button>
      )}
    </div>
  );
}
