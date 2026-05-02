import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SectionLabel } from '../components/ui/primitives';
import {
  createSession,
  suggestNextLiftingType,
} from '../lib/strengthHelpers';
import type { SessionType } from '../db/types';

// Cardio is a peer option here so the four logging entry points sit at the
// same level — but it bypasses the strength session model entirely. Tapping
// Cardio routes straight to /log/cardio (no parent session row created);
// strength tiles still pass through the "select then Start" affordance so
// the user can change their mind before a session is opened.
type StrengthValue = 'upper' | 'lower' | 'full_body';
type TypeValue = StrengthValue | 'cardio';

const TYPE_OPTIONS: { value: TypeValue; label: string }[] = [
  { value: 'lower', label: 'Lower Body' },
  { value: 'upper', label: 'Upper Body' },
  { value: 'full_body', label: 'Full Body' },
  { value: 'cardio', label: 'Cardio' },
];

export default function LogStrength() {
  const navigate = useNavigate();
  // Suggestion math is strength-only (cross-pillar logic deferred). Cardio
  // never receives a "Due next" badge.
  const [suggested, setSuggested] = useState<SessionType | null>(null);
  const [selected, setSelected] = useState<StrengthValue | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    suggestNextLiftingType()
      .then((s) => {
        if (cancelled) return;
        setSuggested(s);
        setSelected((cur) => cur ?? s);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to suggest type:', err);
        setSelected((cur) => cur ?? 'upper');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleTap(value: TypeValue) {
    if (value === 'cardio') {
      navigate('/log/cardio');
      return;
    }
    setSelected(value);
  }

  async function handleStart() {
    if (!selected || starting) return;
    setStarting(true);
    try {
      const id = await createSession(selected);
      navigate(`/log/strength/active/${id}`);
    } catch (err) {
      console.error('Failed to create session:', err);
      setStarting(false);
    }
  }

  return (
    <div className="px-5 pt-8 pb-8">
      <SectionLabel>Log Session</SectionLabel>
      <h1 className="text-[22px] font-medium text-ink mt-1">
        What kind of session?
      </h1>
      <p className="text-[12px] text-ink-soft mt-1">
        Strength is pre-selected based on what's due this week.
      </p>

      <div className="grid grid-cols-1 gap-2 mt-6">
        {TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleTap(opt.value)}
            style={{ borderLeftWidth: '2px', borderLeftColor: '#0F6E56' }}
            className={`bg-card border rounded-xl p-4 text-left min-h-[64px] transition-colors flex items-center justify-between ${
              selected === opt.value ? 'border-green-mint' : 'border-card-edge'
            }`}
          >
            <span className="text-[15px] font-medium text-ink">{opt.label}</span>
            {opt.value !== 'cardio' && suggested === opt.value && (
              <span className="text-[10px] tracking-micro uppercase font-semibold text-green-mint">
                Due next
              </span>
            )}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={handleStart}
        disabled={!selected || starting}
        className="mt-6 w-full bg-green-deep text-ink rounded-xl py-3.5 text-[13px] font-medium uppercase tracking-micro min-h-[48px] disabled:opacity-50"
      >
        {starting ? 'Starting…' : 'Start session'}
      </button>
    </div>
  );
}
