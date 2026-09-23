import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { List, Calendar as CalendarIcon } from 'lucide-react';
import {
  LowerBodyIcon,
  UpperBodyIcon,
  FullBodyIcon,
  CardioIcon,
} from '../components/activity/activityIcons';
import DateBlock from '../components/ui/DateBlock';
import { formatSetMagnitude } from '../lib/setFormat';
import { updateSessionDate } from '../lib/strengthHelpers';
import { updateCardioLogDate } from '../lib/cardioHelpers';
import { todayISODate } from '../lib/dateHelpers';
import {
  getHistoryItems,
  type HistoryItem,
} from '../lib/historyHelpers';
import { COLOR } from '../lib/brand';
import HeaderStrip from '../components/ui/HeaderStrip';

type FilterKey = 'all' | 'lower' | 'upper' | 'full_body' | 'cardio';
type ViewMode = 'list' | 'calendar';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'lower', label: 'Lower' },
  { key: 'upper', label: 'Upper' },
  { key: 'full_body', label: 'Full' },
  { key: 'cardio', label: 'Cardio' },
];

const STRENGTH_META: Record<
  'lower' | 'upper' | 'full_body',
  { label: string; Icon: () => React.ReactElement }
> = {
  lower: { label: 'Lower Body', Icon: LowerBodyIcon },
  upper: { label: 'Upper Body', Icon: UpperBodyIcon },
  full_body: { label: 'Full Body', Icon: FullBodyIcon },
};

const FEEL_EMOJI = { flying: '🚀', cruising: '✈️', crawling: '🐌' } as const;


function dayLabel(dateISO: string): string {
  return new Date(dateISO + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export default function History() {
  const [filter, setFilter] = useState<FilterKey>('all');
  const [view, setView] = useState<ViewMode>('list');

  const items = useLiveQuery(() => getHistoryItems(), [], []);
  const filtered = useMemo(
    () =>
      items.filter((it) =>
        filter === 'all'
          ? true
          : filter === 'cardio'
            ? it.kind === 'cardio'
            : it.kind === 'strength' && it.type === filter,
      ),
    [items, filter],
  );

  return (
    <div className="pb-4">
      <HeaderStrip
        eyebrow="Body · Fitness"
        title="History"
        right={
          <>
            <ViewButton active={view === 'list'} onClick={() => setView('list')} label="List view">
              <List size={18} strokeWidth={2} />
            </ViewButton>
            <ViewButton active={view === 'calendar'} onClick={() => setView('calendar')} label="Calendar view">
              <CalendarIcon size={18} strokeWidth={2} />
            </ViewButton>
          </>
        }
      >
        {/* Filter pills — apply to both views */}
        <div className="mt-3 flex flex-wrap gap-2">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`pill ${filter === key ? 'pill-on' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>
      </HeaderStrip>
      <div className="px-4">

      {view === 'list' ? (
        <div className="mt-4 space-y-1.5">
          {filtered.length === 0 ? (
            <p className="text-center text-hint text-label mt-10">
              No sessions logged yet
            </p>
          ) : (
            filtered.map((it) => <HistoryRow key={it.id} item={it} />)
          )}
        </div>
      ) : (
        <CalendarView items={filtered} />
      )}
      </div>
    </div>
  );
}

function ViewButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`w-11 h-11 flex items-center justify-center rounded-full border ${
        active ? 'bg-white border-green-700 text-green-700' : 'border-transparent text-hint'
      }`}
    >
      {children}
    </button>
  );
}

// One collapsible history row — used by both the list and the calendar's
// day-detail panel. Manages its own expand state.
function HistoryRow({ item }: { item: HistoryItem }) {
  const [open, setOpen] = useState(false);

  const Icon = item.kind === 'cardio' ? CardioIcon : STRENGTH_META[item.type].Icon;
  const label = item.kind === 'cardio' ? 'Cardio' : STRENGTH_META[item.type].label;

  const right =
    item.kind === 'cardio'
      ? `${item.duration_minutes} min`
      : item.totalVolume > 0
        ? `${item.totalVolume.toLocaleString()} lb`
        : `${item.totalSets} set${item.totalSets === 1 ? '' : 's'}`;
  const feel =
    item.kind === 'strength' && item.feel_rating
      ? FEEL_EMOJI[item.feel_rating]
      : '';

  return (
    <div className="card px-4 py-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 text-left"
      >
        <span className="shrink-0 flex items-center">
          <Icon />
        </span>
        <span className="eyebrow shrink-0">
          {label}
        </span>
        {(item.source === 'watch' || item.source === 'merged') && (
          <span
            className="text-label shrink-0"
            title={
              item.source === 'merged'
                ? 'Apple Watch duration merged'
                : 'Imported from Apple Watch'
            }
            aria-label={
              item.source === 'merged'
                ? 'Apple Watch duration merged'
                : 'Imported from Apple Watch'
            }
          >
            ⌚
          </span>
        )}
        <span className="flex-1 text-center text-label text-muted truncate">
          {dayLabel(item.date)}
        </span>
        <span className="text-label text-ink whitespace-nowrap">
          {right}
          {feel && <span className="ml-1">{feel}</span>}
        </span>
        <span
          aria-hidden="true"
          className={`text-green-700 text-heading leading-none transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="mt-3 pt-3 border-t border-hairline">
          {item.kind === 'strength' ? (
            <StrengthDetail item={item} />
          ) : (
            <CardioDetail item={item} />
          )}
        </div>
      )}
    </div>
  );
}

function StrengthDetail({
  item,
}: {
  item: Extract<HistoryItem, { kind: 'strength' }>;
}) {
  return (
    <div className="space-y-2">
      {item.exercises.length === 0 ? (
        <p className="text-label text-muted">No exercises logged.</p>
      ) : (
        item.exercises.map((ex, i) => (
          <div key={i}>
            <p className="text-label font-medium text-ink">{ex.name}</p>
            <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
              {ex.sets.map((s) => (
                <span key={s.id} className="text-label">
                  <span className="text-ink font-medium">
                    {s.weight.toLocaleString()}
                  </span>
                  <span className="text-muted">×{formatSetMagnitude(s)}</span>
                </span>
              ))}
            </div>
          </div>
        ))
      )}

      {item.notes.trim() !== '' && (
        <p className="text-label text-muted pt-1">
          <span className="text-green-700">Notes:</span> {item.notes}
        </p>
      )}

      {item.feel_rating && (
        <div className="flex items-center justify-between pt-1">
          <span className="text-title leading-none" aria-label={item.feel_rating}>
            {FEEL_EMOJI[item.feel_rating]}
          </span>
        </div>
      )}

      <div className="pt-1">
        <DateBlock
          value={item.date}
          onChange={(next) => void updateSessionDate(item.id, next)}
          ariaLabel="Session date"
        />
      </div>
    </div>
  );
}

function CardioDetail({
  item,
}: {
  item: Extract<HistoryItem, { kind: 'cardio' }>;
}) {
  return (
    <div className="space-y-2">
      <p className="text-label text-ink">
        <span className="font-medium">{item.typeName}</span> · {item.duration_minutes} min ·{' '}
        <span className="capitalize">{item.intensity}</span>
        {item.distance_miles !== null && <> · {item.distance_miles.toFixed(1)} mi</>}
      </p>

      {item.notes && item.notes.trim() !== '' && (
        <p className="text-label text-muted">
          <span className="text-green-700">Notes:</span> {item.notes}
        </p>
      )}

      <div className="pt-1">
        <DateBlock
          value={item.date}
          onChange={(next) => void updateCardioLogDate(item.id, next)}
          ariaLabel="Session date"
        />
      </div>
    </div>
  );
}

const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function CalendarView({ items }: { items: HistoryItem[] }) {
  const now = new Date();
  const [cursor, setCursor] = useState({
    y: now.getFullYear(),
    m: now.getMonth(),
  });
  const [selected, setSelected] = useState<string | null>(null);
  const today = todayISODate();

  const byDate = useMemo(() => {
    const map = new Map<string, HistoryItem[]>();
    for (const it of items) {
      const arr = map.get(it.date) ?? [];
      arr.push(it);
      map.set(it.date, arr);
    }
    return map;
  }, [items]);

  function shiftMonth(delta: number) {
    setSelected(null);
    setCursor((c) => {
      let m = c.m + delta;
      let y = c.y;
      if (m < 0) {
        m = 11;
        y -= 1;
      } else if (m > 11) {
        m = 0;
        y += 1;
      }
      return { y, m };
    });
  }

  const firstDow = new Date(cursor.y, cursor.m, 1).getDay();
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const monthLabel = new Date(cursor.y, cursor.m, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
  const pad = (n: number) => String(n).padStart(2, '0');

  const cells: (string | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${cursor.y}-${pad(cursor.m + 1)}-${pad(d)}`);
  }

  const selectedItems = selected ? (byDate.get(selected) ?? []) : [];

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          aria-label="Previous month"
          className="w-9 h-9 flex items-center justify-center text-green-700 text-title"
        >
          ←
        </button>
        <span className="text-body font-medium text-ink">
          {monthLabel}
        </span>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          aria-label="Next month"
          className="w-9 h-9 flex items-center justify-center text-green-700 text-title"
        >
          →
        </button>
      </div>

      <div className="mt-2 grid grid-cols-7">
        {WEEKDAY_INITIALS.map((w, i) => (
          <span key={i} className="text-micro text-hint text-center py-1">
            {w}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((dateISO, i) => {
          if (!dateISO) return <div key={`b${i}`} />;
          const dayItems = byDate.get(dateISO) ?? [];
          const dayNum = Number(dateISO.slice(8));
          const isToday = dateISO === today;
          const isSelected = dateISO === selected;
          return (
            <button
              key={dateISO}
              type="button"
              disabled={dayItems.length === 0}
              onClick={() => setSelected(dateISO)}
              className={`aspect-square flex flex-col items-center justify-center rounded-lg ${
                isSelected ? 'bg-green-100' : ''
              } ${dayItems.length === 0 ? 'cursor-default' : ''}`}
            >
              <span
                className="w-6 h-6 flex items-center justify-center rounded-full text-label text-ink"
                style={{
                  boxShadow: isToday ? `inset 0 0 0 1.5px ${COLOR.green700}` : undefined,
                }}
              >
                {dayNum}
              </span>
              <span className="flex gap-0.5 h-1.5 mt-0.5">
                {dayItems.slice(0, 4).map((_, j) => (
                  <span
                    key={j}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: COLOR.green700 }}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      {selected && selectedItems.length > 0 && (
        <div className="mt-4 space-y-1.5">
          <p className="text-label text-muted">
            {new Date(selected + 'T00:00:00').toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </p>
          {selectedItems.map((it) => (
            <HistoryRow key={it.id} item={it} />
          ))}
        </div>
      )}
    </div>
  );
}
