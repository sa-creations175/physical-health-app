import { useRef } from 'react';
import { cardioDateLabel } from '../../lib/timeBucket';
import { COLOR } from '../../lib/brand';

// Date block matching the cardio logger's date field: light recessed
// surface, mint left accent, mint micro-label, "Today / Yesterday / Mon Apr 28"
// rendered as the value. The native <input type="date"> sits invisibly
// on top so a tap opens the platform picker — keeps our typography and
// drops zero native chrome into the visual.
export default function DateBlock({
  value,
  onChange,
  label = 'Date',
  ariaLabel = 'Date',
}: {
  value: string; // YYYY-MM-DD
  onChange: (next: string) => void;
  label?: string;
  ariaLabel?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      style={{ borderLeftWidth: '2px', borderLeftColor: COLOR.green300 }}
      className="relative bg-stone border border-hairline rounded-xl p-3 min-h-[64px] flex flex-col"
    >
      <p className="eyebrow">
        {label}
      </p>
      <span className="mt-1 flex items-center justify-between gap-2">
        <span className="text-body text-ink font-medium">
          {cardioDateLabel(value)}
        </span>
        <span aria-hidden className="text-muted text-label leading-none">
          ⌄
        </span>
      </span>
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={() => {
          const el = inputRef.current;
          if (el && typeof el.showPicker === 'function') {
            try {
              el.showPicker();
            } catch {
              /* fall back to focus */
            }
          }
        }}
        aria-label={ariaLabel}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
    </div>
  );
}
