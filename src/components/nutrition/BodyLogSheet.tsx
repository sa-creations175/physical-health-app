import { useEffect, useMemo, useState } from 'react';
import { useToast } from '../ui/Toast';
import {
  navyBodyFat,
  logBodyStats,
  logBodyMeasurement,
  getLatestBodyStats,
} from '../../lib/bodyComposition';
import type { BiologicalSex } from '../../db/types';

// Recurring body-profile logging, opened from the Nutrition tab's Body stats
// section. 'weigh' = the weekly weigh-in (weight only; height/age/sex carried
// from the latest row). 'measure' = a bi-weekly body-fat reading via the Navy
// tape measure or a manual DEXA entry (the gold-standard override).
export type BodyLogMode = 'weigh' | 'measure';

export default function BodyLogSheet({
  mode,
  onClose,
  onSaved,
}: {
  mode: BodyLogMode;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);

  // Stable profile carried from the latest weigh-in (needed for both modes —
  // height + sex feed the Navy formula).
  const [profile, setProfile] = useState<{
    height_inches: number;
    age: number;
    biological_sex: BiologicalSex;
  } | null>(null);
  const [loaded, setLoaded] = useState(false);

  const [weight, setWeight] = useState('');
  const [measureMethod, setMeasureMethod] = useState<'navy' | 'dexa'>('navy');
  const [neck, setNeck] = useState('');
  const [waist, setWaist] = useState('');
  const [hips, setHips] = useState('');
  const [dexaBf, setDexaBf] = useState('');

  useEffect(() => {
    void getLatestBodyStats().then((s) => {
      if (s) {
        setProfile({
          height_inches: s.height_inches,
          age: s.age,
          biological_sex: s.biological_sex,
        });
        setWeight(String(s.weight_lbs));
      }
      setLoaded(true);
    });
  }, []);

  const navyBf = useMemo(() => {
    if (!profile) return null;
    return navyBodyFat(
      profile.biological_sex,
      profile.height_inches,
      parseFloat(neck) || 0,
      parseFloat(waist) || 0,
      hips ? parseFloat(hips) : null,
    );
  }, [profile, neck, waist, hips]);

  const title = mode === 'weigh' ? 'Log weigh-in' : 'Log measurements';

  // Both modes need a saved profile (for height/sex); if none exists yet the
  // user must run full setup first.
  const needsSetup = loaded && !profile;

  async function save() {
    if (busy) return;
    setBusy(true);
    try {
      if (mode === 'weigh') {
        const w = parseFloat(weight);
        if (!w || !profile) return;
        await logBodyStats({
          weight_lbs: w,
          height_inches: profile.height_inches,
          age: profile.age,
          biological_sex: profile.biological_sex,
        });
        showToast('Weigh-in logged');
      } else if (measureMethod === 'navy') {
        if (navyBf === null) return;
        await logBodyMeasurement({
          bf_percentage: navyBf,
          source: 'navy_method',
          neck_inches: parseFloat(neck),
          waist_inches: parseFloat(waist),
          hips_inches: hips ? parseFloat(hips) : null,
        });
        showToast('Measurements logged');
      } else {
        const bf = parseFloat(dexaBf);
        if (!bf) return;
        await logBodyMeasurement({ bf_percentage: bf, source: 'dexa' });
        showToast('DEXA result logged');
      }
      onSaved();
    } catch (e) {
      console.error('Body log save failed:', e);
      showToast('Could not save — try again');
    } finally {
      setBusy(false);
    }
  }

  const canSave =
    mode === 'weigh'
      ? !!profile && !!parseFloat(weight)
      : measureMethod === 'navy'
        ? navyBf !== null
        : !!parseFloat(dexaBf);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <div
        className="bg-card w-full max-w-md rounded-t-2xl p-5 max-h-[85vh] overflow-auto"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-medium text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-card-mute text-[22px] w-9 h-9 flex items-center justify-center -mr-1"
          >
            ×
          </button>
        </div>

        {needsSetup ? (
          <p className="mt-4 text-[13px] text-ink-body">
            Set up your nutrition profile first — it captures your height, age
            and sex, which these readings build on.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {mode === 'weigh' && (
              <SmallField label="Weight" value={weight} onChange={setWeight} suffix="lbs" />
            )}

            {mode === 'measure' && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <MethodTab label="Navy tape" active={measureMethod === 'navy'} onClick={() => setMeasureMethod('navy')} />
                  <MethodTab label="DEXA scan" active={measureMethod === 'dexa'} onClick={() => setMeasureMethod('dexa')} />
                </div>

                {measureMethod === 'navy' ? (
                  <>
                    <div className="flex gap-2">
                      <SmallField label="Neck" value={neck} onChange={setNeck} suffix="in" width="flex-1" />
                      <SmallField label="Waist" value={waist} onChange={setWaist} suffix="in" width="flex-1" />
                    </div>
                    {profile?.biological_sex === 'female' && (
                      <SmallField label="Hips" value={hips} onChange={setHips} suffix="in" />
                    )}
                    {navyBf !== null && (
                      <p className="text-[13px] text-green-mint font-medium">
                        Body fat: {navyBf}%
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <SmallField label="Body fat % from DEXA" value={dexaBf} onChange={setDexaBf} suffix="%" />
                    <p className="text-[11px] text-card-mute">
                      DEXA is the gold standard — it overrides other sources as
                      your most accurate reading.
                    </p>
                  </>
                )}
              </>
            )}

            <button
              type="button"
              disabled={!canSave || busy}
              onClick={save}
              className="w-full rounded-xl py-3 text-[14px] font-medium text-white bg-green-deep min-h-[48px] disabled:opacity-40"
            >
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MethodTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl py-2.5 text-[13px] font-medium border min-h-[44px] ${
        active
          ? 'bg-green-deep text-white border-green-deep'
          : 'bg-charcoal text-ink-body border-card-edge'
      }`}
    >
      {label}
    </button>
  );
}

function SmallField({
  label,
  value,
  onChange,
  suffix,
  width = '',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  width?: string;
}) {
  return (
    <label className={`block ${width}`}>
      <span className="text-[12px] text-card-mute">{label}</span>
      <div className="mt-1 flex items-center gap-2 bg-charcoal border border-card-edge rounded-xl px-3 h-12">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-[16px] text-ink outline-none"
        />
        {suffix && <span className="text-[13px] text-card-mute">{suffix}</span>}
      </div>
    </label>
  );
}
