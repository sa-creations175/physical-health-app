import { useEffect, useMemo, useState } from 'react';
import { useToast } from '../ui/Toast';
import {
  navyBodyFat,
  leanMassLbs,
  logBodyStats,
  logBodyMeasurement,
  getLatestBodyStats,
  getLatestMeasurement,
} from '../../lib/bodyComposition';
import {
  MALE_BODY_FAT_BANDS,
  type BodyFatBand,
} from '../../lib/bodyFatReference';
import {
  isAiEstimateAvailable,
  estimateBodyFatFromPhoto,
  type BodyFatEstimate,
} from '../../lib/aiPhotoEstimate';
import {
  LOOK_OPTIONS,
  TIMELINE_OPTIONS,
  FOCUS_OPTIONS,
  recommendSeason,
  computeTDEE,
  generateTargets,
  SEASON_EXPLANATION,
  SEASON_PROS_CONS,
  SEASON_PICKER_OPTIONS,
  MACRO_STYLE_OPTIONS,
  seasonCalories,
  bodyFatGuidance,
  bothLookTip,
  seasonLabel,
  startSeason,
  getActiveSeason,
  type LookAnswer,
  type TimelineAnswer,
  type FocusAnswer,
  type GeneratedTargets,
} from '../../lib/nutritionSeason';
import type {
  BiologicalSex,
  MacroStyle,
  MeasurementSource,
  NutritionSeason,
  SeasonType,
} from '../../db/types';

// The Nutrition setup flow — a three-page onboarding modal opened on first
// nutrition setup or via "Change season". Page 1 body stats → Page 2 BF%
// estimate (visual chart + AI photo + Navy Method) → Page 3 goal questions →
// generated macro targets the user confirms. On finish it persists a body_stats
// row, a body_measurement row, and a new active season (closing the old one).

type Step = 1 | 2 | 3;

export default function NutritionSetupModal({
  onClose,
  onComplete,
}: {
  onClose: () => void;
  onComplete: () => void;
}) {
  const { showToast } = useToast();
  const [step, setStep] = useState<Step>(1);

  // Page 1 — body stats
  const [weight, setWeight] = useState('');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<BiologicalSex>('male');

  // Page 2 — body fat
  const [bfPercent, setBfPercent] = useState('');
  const [bfSource, setBfSource] = useState<MeasurementSource | null>(null);
  const [neck, setNeck] = useState('');
  const [waist, setWaist] = useState('');
  const [hips, setHips] = useState('');

  // Page 3 — goal questions
  const [look, setLook] = useState<LookAnswer | null>(null);
  const [timeline, setTimeline] = useState<TimelineAnswer | null>(null);
  // Multi-select — several focus areas can be active at once.
  const [focus, setFocus] = useState<FocusAnswer[]>([]);

  // Block the body until the initial load resolves so we land on the right page
  // without a flash of Page 1 (we skip to Page 3 when a season already exists).
  const [initializing, setInitializing] = useState(true);

  // Pre-fill from the latest saved profile + active season so re-running (Change
  // season) is fast: Pages 1–2 are pre-populated and skipped, landing on Page 3
  // with the previous goal answers pre-selected.
  useEffect(() => {
    void (async () => {
      const [stats, measurement, season] = await Promise.all([
        getLatestBodyStats(),
        getLatestMeasurement(),
        getActiveSeason(),
      ]);
      if (stats) {
        setWeight(String(stats.weight_lbs));
        setHeightFt(String(Math.floor(stats.height_inches / 12)));
        setHeightIn(String(Math.round(stats.height_inches % 12)));
        setAge(String(stats.age));
        setSex(stats.biological_sex);
      }
      if (measurement) {
        setBfPercent(String(measurement.bf_percentage));
        setBfSource(measurement.source);
        if (measurement.neck_inches) setNeck(String(measurement.neck_inches));
        if (measurement.waist_inches) setWaist(String(measurement.waist_inches));
        if (measurement.hips_inches) setHips(String(measurement.hips_inches));
      }
      if (season) {
        try {
          const ga = JSON.parse(season.goal_answers) as {
            look?: LookAnswer;
            timeline?: TimelineAnswer;
            focus?: FocusAnswer[];
          };
          if (ga.look) setLook(ga.look);
          if (ga.timeline) setTimeline(ga.timeline);
          if (Array.isArray(ga.focus)) setFocus(ga.focus);
        } catch {
          /* malformed goal_answers — leave the questions blank */
        }
        // Body stats + BF% rarely change — skip straight to the goal questions.
        setStep(3);
      }
      setInitializing(false);
    })();
  }, []);

  const heightInches =
    (parseFloat(heightFt) || 0) * 12 + (parseFloat(heightIn) || 0);
  const weightLbs = parseFloat(weight) || 0;
  const ageNum = parseInt(age, 10) || 0;
  const bfNum = parseFloat(bfPercent) || 0;

  const page1Valid =
    weightLbs > 0 && heightInches > 0 && ageNum > 0 && ageNum < 120;
  const page2Valid = bfNum > 0 && bfNum < 70 && bfSource !== null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <div
        className="bg-charcoal w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-auto"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {initializing ? (
          <div className="p-10 text-center text-card-mute text-[13px]">
            Loading…
          </div>
        ) : (
          <>
        <Header step={step} onClose={onClose} />

        <div className="px-5 pb-5">
          {step === 1 && (
            <BodyStatsStep
              weight={weight}
              setWeight={setWeight}
              heightFt={heightFt}
              setHeightFt={setHeightFt}
              heightIn={heightIn}
              setHeightIn={setHeightIn}
              age={age}
              setAge={setAge}
              sex={sex}
              setSex={setSex}
            />
          )}
          {step === 2 && (
            <BodyFatStep
              sex={sex}
              heightInches={heightInches}
              bfPercent={bfPercent}
              setBfPercent={setBfPercent}
              bfSource={bfSource}
              setBfSource={setBfSource}
              neck={neck}
              setNeck={setNeck}
              waist={waist}
              setWaist={setWaist}
              hips={hips}
              setHips={setHips}
            />
          )}
          {step === 3 && (
            <GoalStep
              look={look}
              setLook={setLook}
              timeline={timeline}
              setTimeline={setTimeline}
              focus={focus}
              setFocus={setFocus}
              weightLbs={weightLbs}
              bfNum={bfNum}
              heightInches={heightInches}
              ageNum={ageNum}
              sex={sex}
              onEditBodyStats={() => setStep(1)}
              onConfirm={async (targets, seasonType, macroStyle) => {
                try {
                  // Only append a new body_stats / body_measurements row when a
                  // value actually changed — a plain season change shouldn't
                  // duplicate unchanged body data. The season row always writes.
                  const [latestStats, latestMeasurement] = await Promise.all([
                    getLatestBodyStats(),
                    getLatestMeasurement(),
                  ]);
                  const statsChanged =
                    !latestStats ||
                    latestStats.weight_lbs !== weightLbs ||
                    latestStats.height_inches !== heightInches ||
                    latestStats.age !== ageNum ||
                    latestStats.biological_sex !== sex;
                  if (statsChanged) {
                    await logBodyStats({
                      weight_lbs: weightLbs,
                      height_inches: heightInches,
                      age: ageNum,
                      biological_sex: sex,
                    });
                  }
                  const measurementChanged =
                    !latestMeasurement ||
                    latestMeasurement.bf_percentage !== bfNum ||
                    latestMeasurement.source !== bfSource;
                  if (measurementChanged) {
                    await logBodyMeasurement({
                      bf_percentage: bfNum,
                      source: bfSource!,
                      neck_inches: neck ? parseFloat(neck) : null,
                      waist_inches: waist ? parseFloat(waist) : null,
                      hips_inches: hips ? parseFloat(hips) : null,
                    });
                  }
                  await startSeason({
                    season_type: seasonType,
                    macro_style: macroStyle,
                    goal_answers: { look: look!, timeline: timeline!, focus },
                    targets,
                  });
                  showToast(`${seasonLabel(seasonType)} season started`);
                  onComplete();
                } catch (e) {
                  console.error('Nutrition setup save failed:', e);
                  showToast('Could not save — try again');
                }
              }}
            />
          )}
        </div>

        {/* Footer nav — Page 3 has its own confirm button inside GoalStep. */}
        {step !== 3 && (
          <div className="px-5 pb-5 flex items-center gap-3">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as Step)}
                className="flex-1 rounded-xl py-3 text-[14px] font-medium text-ink-body bg-card border border-card-edge min-h-[48px]"
              >
                Back
              </button>
            )}
            <button
              type="button"
              disabled={step === 1 ? !page1Valid : !page2Valid}
              onClick={() => setStep((s) => (s + 1) as Step)}
              className="flex-1 rounded-xl py-3 text-[14px] font-medium text-white bg-green-deep min-h-[48px] disabled:opacity-40"
            >
              Continue
            </button>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
}

// ---- Header ----------------------------------------------------------------

function Header({ step, onClose }: { step: Step; onClose: () => void }) {
  const titles = ['Your body', 'Body fat estimate', 'Your goals'];
  return (
    <div className="px-5 pt-5 pb-3 sticky top-0 bg-charcoal z-10">
      <div className="flex items-center justify-between">
        <p className="text-[9px] tracking-micro uppercase font-semibold text-green-mint">
          Set up nutrition · Step {step} of 3
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-card-mute text-[22px] w-9 h-9 flex items-center justify-center -mr-2"
        >
          ×
        </button>
      </div>
      <h2 className="text-[20px] font-medium text-ink mt-1">{titles[step - 1]}</h2>
      <div className="mt-3 flex gap-1.5">
        {[1, 2, 3].map((s) => (
          <span
            key={s}
            className="h-1 flex-1 rounded-full"
            style={{ background: s <= step ? '#0F6E56' : '#d8ded9' }}
          />
        ))}
      </div>
    </div>
  );
}

// ---- Shared inputs ---------------------------------------------------------

function Field({
  label,
  value,
  onChange,
  suffix,
  placeholder,
  width = '',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  placeholder?: string;
  width?: string;
}) {
  return (
    <label className={`block ${width}`}>
      <span className="text-[12px] text-card-mute">{label}</span>
      <div className="mt-1 flex items-center gap-2 bg-card border border-card-edge rounded-xl px-3 h-12">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-[16px] text-ink outline-none"
        />
        {suffix && <span className="text-[13px] text-card-mute">{suffix}</span>}
      </div>
    </label>
  );
}

// ---- Step 1: body stats ----------------------------------------------------

function BodyStatsStep(props: {
  weight: string;
  setWeight: (v: string) => void;
  heightFt: string;
  setHeightFt: (v: string) => void;
  heightIn: string;
  setHeightIn: (v: string) => void;
  age: string;
  setAge: (v: string) => void;
  sex: BiologicalSex;
  setSex: (v: BiologicalSex) => void;
}) {
  return (
    <div className="space-y-4 pt-1">
      <p className="text-[13px] text-ink-body leading-snug">
        These anchor every calculation. Weight is your weekly weigh-in; height,
        age and sex change rarely.
      </p>
      <Field label="Weight" value={props.weight} onChange={props.setWeight} suffix="lbs" placeholder="180" />
      <div>
        <span className="text-[12px] text-card-mute">Height</span>
        <div className="mt-1 flex gap-3">
          <div className="flex-1 flex items-center gap-2 bg-card border border-card-edge rounded-xl px-3 h-12">
            <input type="number" inputMode="numeric" value={props.heightFt} placeholder="5" onChange={(e) => props.setHeightFt(e.target.value)} className="w-full bg-transparent text-[16px] text-ink outline-none" />
            <span className="text-[13px] text-card-mute">ft</span>
          </div>
          <div className="flex-1 flex items-center gap-2 bg-card border border-card-edge rounded-xl px-3 h-12">
            <input type="number" inputMode="numeric" value={props.heightIn} placeholder="10" onChange={(e) => props.setHeightIn(e.target.value)} className="w-full bg-transparent text-[16px] text-ink outline-none" />
            <span className="text-[13px] text-card-mute">in</span>
          </div>
        </div>
      </div>
      <Field label="Age" value={props.age} onChange={props.setAge} suffix="yrs" placeholder="30" />
      <div>
        <span className="text-[12px] text-card-mute">Biological sex</span>
        <div className="mt-1 grid grid-cols-2 gap-3">
          {(['male', 'female'] as BiologicalSex[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => props.setSex(s)}
              className={`rounded-xl py-3 text-[14px] font-medium capitalize border min-h-[48px] ${
                props.sex === s
                  ? 'bg-green-deep text-white border-green-deep'
                  : 'bg-card text-ink-body border-card-edge'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-card-mute">
          Used by the body-fat and metabolic formulas, which are sex-specific.
        </p>
      </div>
    </div>
  );
}

// ---- Step 2: body fat ------------------------------------------------------

function BodyFatStep(props: {
  sex: BiologicalSex;
  heightInches: number;
  bfPercent: string;
  setBfPercent: (v: string) => void;
  bfSource: MeasurementSource | null;
  setBfSource: (v: MeasurementSource) => void;
  neck: string;
  setNeck: (v: string) => void;
  waist: string;
  setWaist: (v: string) => void;
  hips: string;
  setHips: (v: string) => void;
}) {
  return (
    <div className="space-y-3 pt-1">
      <p className="text-[13px] text-ink-body leading-snug">
        Estimate your body-fat % any of these ways. Lean mass (weight × non-fat)
        is what your macros are actually built from — so a starting number
        matters. Do the tape measure every couple of weeks for real tracking.
      </p>

      {/* Visual reference chart */}
      <VisualReferencePanel
        onPick={(band) => {
          props.setBfPercent(String(band.pct));
          props.setBfSource('visual_estimate');
        }}
        selected={props.bfSource === 'visual_estimate' ? props.bfPercent : null}
        defaultOpen={props.bfSource === 'visual_estimate'}
      />

      {/* AI photo estimate — only when the key is configured */}
      {isAiEstimateAvailable() && (
        <AiPhotoPanel
          onEstimate={(est) => {
            props.setBfPercent(String(Math.round((est.low + est.high) / 2)));
            props.setBfSource('ai_photo_estimate');
          }}
          active={props.bfSource === 'ai_photo_estimate'}
        />
      )}

      {/* Navy Method tape measure */}
      <NavyPanel
        sex={props.sex}
        heightInches={props.heightInches}
        neck={props.neck}
        setNeck={props.setNeck}
        waist={props.waist}
        setWaist={props.setWaist}
        hips={props.hips}
        setHips={props.setHips}
        onCompute={(bf) => {
          props.setBfPercent(String(bf));
          props.setBfSource('navy_method');
        }}
        active={props.bfSource === 'navy_method'}
        defaultOpen={props.bfSource === 'navy_method'}
      />

      {/* DEXA scan tip — persistent, informational (no dismiss) */}
      <div className="rounded-xl bg-[#edf7f2] px-4 py-3">
        <p className="text-[12px] text-ink-body leading-snug">
          📋 For the most accurate body fat baseline, consider booking a DEXA
          scan. It’s the gold standard — and the app accepts manual DEXA entry as
          your highest-priority BF% source.
        </p>
      </div>

      {/* Confirm / adjust the chosen estimate */}
      <div className="bg-card border border-card-edge rounded-xl p-4 mt-1">
        <span className="text-[12px] text-card-mute">
          Starting body fat % {props.bfSource && `· from ${SOURCE_LABEL[props.bfSource]}`}
        </span>
        <div className="mt-1 flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            value={props.bfPercent}
            placeholder="—"
            onChange={(e) => {
              props.setBfPercent(e.target.value);
              if (!props.bfSource) props.setBfSource('visual_estimate');
            }}
            className="w-24 bg-transparent text-[22px] font-medium text-ink outline-none border-b border-card-edge"
          />
          <span className="text-[15px] text-card-mute">%</span>
        </div>
        <p className="mt-2 text-[11px] text-card-mute">
          You can adjust this number before continuing.
        </p>
      </div>
    </div>
  );
}

const SOURCE_LABEL: Record<MeasurementSource, string> = {
  navy_method: 'Navy Method',
  dexa: 'DEXA scan',
  ai_photo_estimate: 'AI estimate',
  visual_estimate: 'visual chart',
};

function MethodShell({
  title,
  hint,
  children,
  defaultOpen = false,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-card border border-card-edge rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span>
          <span className="block text-[14px] font-medium text-ink">{title}</span>
          <span className="block text-[11px] text-card-mute">{hint}</span>
        </span>
        <span className="text-card-mute text-[13px]">{open ? '▴' : '▾'}</span>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function VisualReferencePanel({
  onPick,
  selected,
  defaultOpen,
}: {
  onPick: (band: BodyFatBand) => void;
  selected: string | null;
  defaultOpen?: boolean;
}) {
  return (
    <MethodShell
      title="Visual reference chart"
      hint="Tap the level that looks closest"
      defaultOpen={defaultOpen}
    >
      <div className="grid grid-cols-2 gap-2">
        {MALE_BODY_FAT_BANDS.map((band) => {
          const isSel = selected === String(band.pct);
          return (
            <button
              key={band.label}
              type="button"
              aria-pressed={isSel}
              onClick={() => onPick(band)}
              className={`text-left rounded-lg border p-3 flex flex-col ${
                isSel
                  ? 'border-green-deep bg-[#edf7f2]'
                  : 'border-card-edge bg-charcoal'
              }`}
            >
              <span className="text-[14px] font-medium text-ink">
                {band.label}
              </span>
              <span className="text-[11px] font-medium uppercase tracking-micro text-green-mint">
                {band.descriptor}
              </span>
              <span className="mt-1 text-[11px] text-card-mute leading-snug">
                {band.description}
              </span>
            </button>
          );
        })}
      </div>
    </MethodShell>
  );
}

function AiPhotoPanel({
  onEstimate,
  active,
}: {
  onEstimate: (est: BodyFatEstimate) => void;
  active: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BodyFatEstimate | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setBusy(true);
    try {
      const base64 = await fileToBase64(file);
      const media = file.type === 'image/png'
        ? 'image/png'
        : file.type === 'image/webp'
          ? 'image/webp'
          : 'image/jpeg';
      const est = await estimateBodyFatFromPhoto(base64, media);
      setResult(est);
      onEstimate(est);
    } catch (e) {
      console.error('AI estimate failed:', e);
      setError('Could not estimate from that photo. Try another, or use the tape.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <MethodShell title="AI photo estimate" hint="Rough range from a photo — onboarding shortcut">
      <label className="block">
        <span className="inline-flex items-center justify-center w-full rounded-lg py-3 text-[13px] font-medium text-white bg-green-deep cursor-pointer min-h-[44px]">
          {busy ? 'Estimating…' : 'Choose a photo'}
        </span>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
      </label>
      {result && (
        <div className={`mt-2 rounded-lg px-3 py-2 ${active ? 'bg-[#edf7f2]' : 'bg-charcoal'}`}>
          <span className="text-[14px] font-medium text-ink">
            Roughly {result.low}–{result.high}%
          </span>
          <span className="block text-[11px] text-card-mute leading-snug mt-0.5">
            {result.summary}
          </span>
        </div>
      )}
      {error && <p className="mt-2 text-[11px] text-red-alert">{error}</p>}
      <p className="mt-2 text-[11px] text-card-mute leading-snug">
        Rough estimate — do the tape measure bi-weekly for real tracking. Your
        photo is sent only for this estimate and isn’t stored.
      </p>
    </MethodShell>
  );
}

function NavyPanel(props: {
  sex: BiologicalSex;
  heightInches: number;
  neck: string;
  setNeck: (v: string) => void;
  waist: string;
  setWaist: (v: string) => void;
  hips: string;
  setHips: (v: string) => void;
  onCompute: (bf: number) => void;
  active: boolean;
  defaultOpen?: boolean;
}) {
  const computed = useMemo(
    () =>
      navyBodyFat(
        props.sex,
        props.heightInches,
        parseFloat(props.neck) || 0,
        parseFloat(props.waist) || 0,
        props.hips ? parseFloat(props.hips) : null,
      ),
    [props.sex, props.heightInches, props.neck, props.waist, props.hips],
  );

  return (
    <MethodShell
      title="Navy Method (tape measure)"
      hint="Most accurate at home — do this bi-weekly"
      defaultOpen={props.defaultOpen}
    >
      <div className="space-y-2">
        <div className="flex gap-2">
          <Field label="Neck" value={props.neck} onChange={props.setNeck} suffix="in" width="flex-1" />
          <Field label="Waist" value={props.waist} onChange={props.setWaist} suffix="in" width="flex-1" />
        </div>
        {props.sex === 'female' && (
          <Field label="Hips" value={props.hips} onChange={props.setHips} suffix="in" />
        )}
        <button
          type="button"
          disabled={computed === null}
          onClick={() => computed !== null && props.onCompute(computed)}
          className="w-full rounded-lg py-2.5 text-[13px] font-medium text-white bg-green-deep min-h-[44px] disabled:opacity-40"
        >
          {computed !== null ? `Use ${computed}%` : 'Enter measurements'}
        </button>
        {props.active && computed !== null && (
          <p className="text-[11px] text-green-mint">Using {computed}% from the tape.</p>
        )}
      </div>
    </MethodShell>
  );
}

// ---- Step 3: goals ---------------------------------------------------------

function GoalStep(props: {
  look: LookAnswer | null;
  setLook: (v: LookAnswer) => void;
  timeline: TimelineAnswer | null;
  setTimeline: (v: TimelineAnswer) => void;
  focus: FocusAnswer[];
  setFocus: (v: FocusAnswer[]) => void;
  weightLbs: number;
  bfNum: number;
  heightInches: number;
  ageNum: number;
  sex: BiologicalSex;
  onEditBodyStats: () => void;
  onConfirm: (
    targets: GeneratedTargets,
    seasonType: ReturnType<typeof recommendSeason>,
    macroStyle: MacroStyle,
  ) => Promise<void>;
}) {
  // The briefing/picker hold the recommended season + the inputs (lean mass,
  // TDEE) needed to recompute any season's targets live as the user taps cards.
  const [preview, setPreview] = useState<{
    recommendedType: SeasonType;
    tdee: number;
    lean: number;
    estimatedActivity: boolean;
    daysOfData: number;
  } | null>(null);
  const [selectedType, setSelectedType] = useState<SeasonType | null>(null);
  const [macroStyle, setMacroStyle] = useState<MacroStyle>('balanced');
  const [computing, setComputing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [current, setCurrent] = useState<NutritionSeason | null>(null);

  useEffect(() => {
    void getActiveSeason().then(setCurrent);
  }, []);

  const ready = props.look && props.timeline && props.focus.length > 0;

  // Reset the briefing whenever an answer changes so it's rebuilt fresh.
  function resetPreview() {
    setPreview(null);
    setSelectedType(null);
  }

  async function buildPreview() {
    if (!ready) return;
    setComputing(true);
    try {
      const recommendedType = recommendSeason(
        { look: props.look!, timeline: props.timeline!, focus: props.focus },
        props.bfNum > 0 ? props.bfNum : null,
      );
      const tdee = await computeTDEE(
        props.sex,
        props.weightLbs,
        props.heightInches,
        props.ageNum,
      );
      const lean = leanMassLbs(props.weightLbs, props.bfNum);
      setPreview({
        recommendedType,
        tdee: tdee.tdee,
        lean,
        estimatedActivity: tdee.estimatedActivity,
        daysOfData: tdee.daysOfData,
      });
      setSelectedType(recommendedType); // pre-select the recommendation
    } finally {
      setComputing(false);
    }
  }

  return (
    <div className="space-y-4 pt-1">
      <div className="flex justify-end -mt-1">
        <button
          type="button"
          onClick={props.onEditBodyStats}
          className="text-[12px] font-medium text-green-mint min-h-[44px]"
        >
          Update body stats →
        </button>
      </div>
      <QuestionGroup
        question="How do you want your body to look and feel?"
        options={LOOK_OPTIONS}
        value={props.look}
        onChange={(v) => {
          props.setLook(v);
          resetPreview();
        }}
      />
      <BothLookTip look={props.look} bf={props.bfNum > 0 ? props.bfNum : null} />
      <QuestionGroup
        question="What’s your timeline feeling like?"
        options={TIMELINE_OPTIONS}
        value={props.timeline}
        onChange={(v) => {
          props.setTimeline(v);
          resetPreview();
        }}
      />
      <MultiQuestionGroup
        question="Where are you most focused right now?"
        hint="Choose any that apply"
        options={FOCUS_OPTIONS}
        values={props.focus}
        onToggle={(v) => {
          props.setFocus(
            props.focus.includes(v)
              ? props.focus.filter((f) => f !== v)
              : [...props.focus, v],
          );
          resetPreview();
        }}
      />

      {!preview ? (
        <button
          type="button"
          disabled={!ready || computing}
          onClick={buildPreview}
          className="w-full rounded-xl py-3 text-[14px] font-medium text-white bg-green-deep min-h-[48px] disabled:opacity-40"
        >
          {computing ? 'Calculating…' : 'See my targets'}
        </button>
      ) : (
        (() => {
          // selectedType is set alongside preview; targets recompute live as the
          // user taps a different season card.
          const chosen = selectedType ?? preview.recommendedType;
          const targets = generateTargets(
            chosen,
            preview.lean,
            preview.tdee,
            macroStyle,
          );
          return (
            <div className="space-y-3">
              {/* STEP 1 — Research briefing (about the recommended season) */}
              <div className="bg-card border border-card-edge rounded-xl p-4 space-y-4">
                <Micro>Recommended · {seasonLabel(preview.recommendedType)}</Micro>

                <div>
                  <Micro>Your baseline</Micro>
                  <p className="mt-1 text-[13px] text-ink-body leading-snug">
                    Based on your body stats and Apple Watch data, your body
                    burns approximately{' '}
                    <span className="font-medium text-ink">
                      {preview.tdee.toLocaleString()}
                    </span>{' '}
                    calories per day to maintain your current weight. This is
                    your TDEE — total daily energy expenditure.
                  </p>
                  {preview.estimatedActivity ? (
                    <p className="mt-1.5 text-[11px] text-card-mute leading-snug">
                      No Apple Watch active-calorie history yet, so this uses an
                      estimated activity level. It’ll personalize automatically
                      once Watch data builds up.
                    </p>
                  ) : preview.daysOfData < 90 ? (
                    <p className="mt-1.5 text-[11px] text-card-mute leading-snug">
                      Based on {preview.daysOfData} days of Watch data so far —
                      it keeps refining as more comes in.
                    </p>
                  ) : null}
                  <TdeeExplainer />
                </div>

                <div>
                  <Micro>What we’re doing</Micro>
                  <p className="mt-1 text-[13px] text-ink-body leading-snug">
                    {SEASON_EXPLANATION[preview.recommendedType]}
                  </p>
                </div>

                <div>
                  <Micro>What the research says</Micro>
                  <ResearchNote bf={props.bfNum > 0 ? props.bfNum : null} />
                </div>
              </div>

              {/* STEP 2 — Six-option season picker */}
              <div>
                <p className="text-[13px] font-medium text-ink mb-2">
                  Choose your season
                </p>
                <SeasonPicker
                  recommended={preview.recommendedType}
                  selected={chosen}
                  tdee={preview.tdee}
                  onSelect={setSelectedType}
                />
              </div>

              {/* Macro style — splits the non-protein calories */}
              <MacroStyleSelector selected={macroStyle} onSelect={setMacroStyle} />

              {/* STEP 3 — Selected season's targets + pros/cons (live) */}
              <TargetComparison current={current} targets={targets} />

              <div className="bg-card border border-card-edge rounded-xl p-4">
                <Micro>Pros &amp; cons of this season</Micro>
                <div className="mt-2">
                  <ProsCons
                    prosLabel="Pros"
                    pros={SEASON_PROS_CONS[chosen].pros}
                    consLabel="Cons"
                    cons={SEASON_PROS_CONS[chosen].cons}
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  await props.onConfirm(targets, chosen, macroStyle);
                  setSaving(false);
                }}
                className="w-full rounded-xl py-3 text-[14px] font-medium text-white bg-green-deep min-h-[48px] disabled:opacity-50"
              >
                {saving
                  ? 'Saving…'
                  : current
                    ? 'Switch to this season'
                    : 'Start this season'}
              </button>
            </div>
          );
        })()
      )}
    </div>
  );
}

function QuestionGroup<T extends string>({
  question,
  options,
  value,
  onChange,
}: {
  question: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <p className="text-[13px] font-medium text-ink mb-2">{question}</p>
      <div className="space-y-1.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`w-full text-left rounded-xl px-3.5 py-3 text-[14px] border min-h-[48px] ${
              value === o.value
                ? 'border-green-deep bg-[#edf7f2] text-ink font-medium'
                : 'border-card-edge bg-card text-ink-body'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Multi-select variant — any number of options can be highlighted at once.
// Tapping a selected option deselects it. Used for focus areas, which aren't
// mutually exclusive (unlike look + timeline).
function MultiQuestionGroup<T extends string>({
  question,
  hint,
  options,
  values,
  onToggle,
}: {
  question: string;
  hint: string;
  options: { value: T; label: string }[];
  values: T[];
  onToggle: (v: T) => void;
}) {
  return (
    <div>
      <p className="text-[13px] font-medium text-ink">{question}</p>
      <p className="text-[11px] text-card-mute mb-2">{hint}</p>
      <div className="space-y-1.5">
        {options.map((o) => {
          const selected = values.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onToggle(o.value)}
              className={`w-full text-left rounded-xl px-3.5 py-3 text-[14px] border min-h-[48px] flex items-center justify-between ${
                selected
                  ? 'border-green-deep bg-[#edf7f2] text-ink font-medium'
                  : 'border-card-edge bg-card text-ink-body'
              }`}
            >
              <span>{o.label}</span>
              {selected && <span className="text-green-deep text-[15px]">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// The six-option season picker. The app-recommended option carries a badge and
// is pre-selected; tapping any card selects it (green border) and drives the
// live targets + pros/cons below. All six are always available.
function SeasonPicker({
  recommended,
  selected,
  tdee,
  onSelect,
}: {
  recommended: SeasonType;
  selected: SeasonType;
  tdee: number;
  onSelect: (t: SeasonType) => void;
}) {
  return (
    <div className="space-y-2">
      {SEASON_PICKER_OPTIONS.map((opt) => {
        const isSel = selected === opt.seasonType;
        const isRec = recommended === opt.seasonType;
        const cals = seasonCalories(opt.seasonType, tdee);
        return (
          <button
            key={opt.seasonType}
            type="button"
            aria-pressed={isSel}
            onClick={() => onSelect(opt.seasonType)}
            className={`relative w-full text-left rounded-xl border p-3.5 ${
              isSel
                ? 'border-green-deep bg-[#edf7f2]'
                : 'border-card-edge bg-card'
            }`}
          >
            {isRec && (
              <span className="absolute top-2.5 right-2.5 text-[9px] tracking-micro uppercase font-semibold text-white bg-green-deep rounded-full px-2 py-0.5">
                Recommended
              </span>
            )}
            <span className="block text-[14px] font-medium text-ink pr-24">
              {opt.name}
            </span>
            <span className="block text-[15px] font-semibold text-ink mt-0.5">
              {cals.toLocaleString()} cal/day
            </span>
            <span className="block text-[11px] font-medium text-green-mint mt-0.5">
              {opt.calorieLine}
            </span>
            <span className="block text-[12px] text-card-mute leading-snug mt-1">
              {opt.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Macro-style selector — single-select pills shown once a season is chosen.
// Protein stays fixed; the style sets the fat/carb split and re-renders the
// targets preview below live.
function MacroStyleSelector({
  selected,
  onSelect,
}: {
  selected: MacroStyle;
  onSelect: (s: MacroStyle) => void;
}) {
  return (
    <div className="bg-card border border-card-edge rounded-xl p-4">
      <Micro>Macro style</Micro>
      <p className="mt-1 text-[12px] text-card-mute leading-snug">
        Protein stays high regardless. Choose how to split the rest.
      </p>
      <div className="mt-2 space-y-2">
        {MACRO_STYLE_OPTIONS.map((opt) => {
          const isSel = selected === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={isSel}
              onClick={() => onSelect(opt.value)}
              className={`w-full text-left rounded-lg border p-3 ${
                isSel
                  ? 'border-green-deep bg-[#edf7f2]'
                  : 'border-card-edge bg-charcoal'
              }`}
            >
              <span className="block text-[13px] font-medium text-ink">
                {opt.name}
              </span>
              <span className="block text-[11px] text-card-mute leading-snug mt-0.5">
                {opt.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Collapsible "How is this calculated?" explainer for the TDEE figure.
function TdeeExplainer() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-[12px] font-medium text-green-mint"
      >
        How is this calculated? {open ? '↑' : '↓'}
      </button>
      {open && (
        <div className="mt-2 rounded-xl bg-charcoal border border-card-edge p-3 space-y-3">
          <p className="text-[11px] tracking-micro uppercase font-semibold text-green-mint">
            Your TDEE is calculated in two steps
          </p>

          <div>
            <Micro>Step 1 — Resting burn (BMR)</Micro>
            <p className="mt-1 text-[12px] text-ink-body leading-snug">
              Using the Mifflin-St Jeor formula — the most validated BMR equation
              for most adults:
            </p>
            <p className="mt-1 font-mono text-[11px] text-ink-body leading-snug">
              Male: (10 × weight kg) + (6.25 × height cm) − (5 × age) + 5
              <br />
              Female: (10 × weight kg) + (6.25 × height cm) − (5 × age) − 161
            </p>
            <p className="mt-1 text-[12px] text-ink-body leading-snug">
              This is what your body burns at complete rest, just existing.
            </p>
          </div>

          <div>
            <Micro>Step 2 — Active burn (from Apple Watch)</Micro>
            <p className="mt-1 text-[12px] text-ink-body leading-snug">
              Your 90-day rolling average of daily active calories from
              HealthKit. This is your real movement burn — not a generic activity
              multiplier. If you had a lazy month, your TDEE reflects it. If you
              were crushing it, it reflects that too.
            </p>
          </div>

          <p className="font-mono text-[11px] text-ink leading-snug">
            TDEE = BMR + avg daily active calories
          </p>

          <p className="text-[11px] text-card-mute leading-snug">
            Note: Apple Watch active calories can slightly undercount or overcount
            depending on Watch fit and workout type. It’s still more accurate than
            a self-reported activity level.
          </p>
        </div>
      )}
    </div>
  );
}

// Inline contextual tip that appears the moment 'Both' is selected on the look
// question, keyed to the user's BF% (see bothLookTip). Informational only —
// never blocks — and vanishes when the selection changes away from 'Both' or
// when there's no BF% on record.
function BothLookTip({
  look,
  bf,
}: {
  look: LookAnswer | null;
  bf: number | null;
}) {
  if (look !== 'both') return null;
  const copy = bothLookTip(bf);
  if (!copy) return null;
  return (
    <div
      className="rounded-xl bg-[#edf7f2] px-3.5 py-3"
      style={{ borderLeft: '3px solid #0F6E56' }}
    >
      <p className="text-[12px] text-ink-body leading-snug">{copy}</p>
    </div>
  );
}

// Green section micro-label, matching the app's SectionLabel treatment.
function Micro({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] tracking-micro uppercase font-semibold text-green-mint">
      {children}
    </p>
  );
}

// Research-backed body-composition guidance, conditional on the user's BF%.
// Gentle nudge (never a block) when no estimate exists yet.
function ResearchNote({ bf }: { bf: number | null }) {
  const g = bodyFatGuidance(bf);
  if (!g) {
    return (
      <p className="mt-1 text-[12px] text-card-mute leading-snug">
        Complete your body fat estimate on the previous step to get personalized
        research-backed guidance here.
      </p>
    );
  }
  return (
    <div className="mt-1">
      <p className="text-[13px] font-medium text-ink">{g.heading}</p>
      {g.paragraphs.map((para, i) => (
        <p key={i} className="mt-1.5 text-[13px] text-ink-body leading-snug">
          {para}
        </p>
      ))}
      <div className="mt-2.5">
        <ProsCons
          prosLabel={g.prosLabel}
          pros={g.pros}
          consLabel={g.consLabel}
          cons={g.cons}
        />
      </div>
    </div>
  );
}

// Two-column trade-offs. Pros read in green, cons in muted ink — these are
// trade-offs, not warnings, so the cons are deliberately not alarm-red.
function ProsCons({
  prosLabel,
  pros,
  consLabel,
  cons,
}: {
  prosLabel: string;
  pros: string[];
  consLabel: string;
  cons: string[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <p className="text-[10px] tracking-micro uppercase font-semibold text-green-mid">
          {prosLabel}
        </p>
        <ul className="mt-1 space-y-1">
          {pros.map((p) => (
            <li
              key={p}
              className="text-[12px] leading-snug text-ink-body flex gap-1.5"
            >
              <span className="text-green-deep">+</span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-[10px] tracking-micro uppercase font-semibold text-card-mute">
          {consLabel}
        </p>
        <ul className="mt-1 space-y-1">
          {cons.map((c) => (
            <li
              key={c}
              className="text-[12px] leading-snug text-card-mute flex gap-1.5"
            >
              <span>–</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Before/after target comparison — never a blind switch. Shows only the new
// targets on first setup, current → new when switching seasons.
function TargetComparison({
  current,
  targets,
}: {
  current: NutritionSeason | null;
  targets: GeneratedTargets;
}) {
  const rows: { label: string; from: number | null; to: number; unit: string }[] = [
    { label: 'Calories', from: current?.daily_calories_target ?? null, to: targets.daily_calories_target, unit: '' },
    { label: 'Protein', from: current?.protein_target_g ?? null, to: targets.protein_target_g, unit: 'g' },
    { label: 'Carbs', from: current?.carbs_target_g ?? null, to: targets.carbs_target_g, unit: 'g' },
    { label: 'Fat', from: current?.fat_target_g ?? null, to: targets.fat_target_g, unit: 'g' },
    { label: 'Water', from: current?.water_target_bottles ?? null, to: targets.water_target_bottles, unit: ' bottles' },
  ];
  return (
    <div className="bg-card border border-card-edge rounded-xl p-4">
      <p className="text-[12px] text-card-mute mb-2">
        {current ? 'Your targets will change to:' : 'Your daily targets:'}
      </p>
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between text-[13px]">
            <span className="text-ink-body">{r.label}</span>
            <span className="text-ink font-medium">
              {current && r.from !== null && r.from !== r.to && (
                <span className="text-card-mute font-normal">
                  {r.from.toLocaleString()}
                  {r.unit} →{' '}
                </span>
              )}
              {r.to.toLocaleString()}
              {r.unit}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- helpers ---------------------------------------------------------------

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // strip the "data:image/...;base64," prefix
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
