import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SectionLabel } from '../components/ui/primitives';
import {
  createSession,
  suggestNextLiftingType,
} from '../lib/strengthHelpers';
import type { SessionType } from '../db/types';

// All four tiles tap-to-route — no "Start session" button. Strength tiles
// open a fresh session row and navigate to the active session; cardio
// bypasses the session model and routes to its own logger. The brief
// in-flight visual (selected highlight) gives feedback during the
// createSession round-trip on slower devices; a routing flag prevents
// double-tap from opening two sessions.
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
  const [routing, setRouting] = useState<TypeValue | null>(null);

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

  async function handleTap(value: TypeValue) {
    if (routing) return;
    setRouting(value);
    try {
      if (value === 'cardio') {
        navigate('/log/cardio');
        return;
      }
      const id = await createSession(value);
      navigate(`/log/strength/active/${id}`);
    } catch (err) {
      console.error('Failed to start session:', err);
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
          const otherInFlight = routing !== null && routing !== opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleTap(opt.value)}
              disabled={routing !== null}
              style={{ borderLeftWidth: '2px', borderLeftColor: '#0F6E56' }}
              className={`bg-card border rounded-xl p-4 text-left min-h-[64px] transition-colors flex items-center justify-between ${
                isInFlight ? 'border-green-mint' : 'border-card-edge'
              } ${otherInFlight ? 'opacity-50' : ''}`}
            >
              <span className="text-[15px] font-medium text-ink">{opt.label}</span>
              {opt.value !== 'cardio' && suggested === opt.value && (
                <span className="text-[10px] tracking-micro uppercase font-semibold text-green-mint">
                  Due next
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
