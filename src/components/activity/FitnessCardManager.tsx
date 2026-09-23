import { useFitnessCardConfig } from '../../lib/useFitnessCardConfig';
import { FITNESS_CARD_KEYS } from '../../lib/defaults';
import { COLOR } from '../../lib/brand';

// Inline panel of per-card show/hide toggles for the Fitness page. Each toggle
// writes straight through to user_preferences (via useFitnessCardConfig), so
// the choice persists across launches. Rendered under the Customize affordance.
export default function FitnessCardManager() {
  const { config, toggle } = useFitnessCardConfig();

  return (
    <div className="card p-4">
      <p className="eyebrow">
        Show / Hide Cards
      </p>

      <div className="mt-3 space-y-0.5">
        {FITNESS_CARD_KEYS.map((key) => {
          const { label, visible } = config[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              role="switch"
              aria-checked={visible}
              className="w-full flex items-center justify-between py-2"
            >
              <span
                className="text-body"
                style={{ color: visible ? COLOR.ink : COLOR.hint }}
              >
                {label}
              </span>
              <ToggleTrack on={visible} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Pill switch — green when on, grey when off. Purely presentational; the parent
// button owns the role="switch" semantics and the tap target.
function ToggleTrack({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="relative inline-block rounded-full transition-colors"
      style={{
        width: 38,
        height: 22,
        background: on ? COLOR.green700 : COLOR.stone,
      }}
    >
      <span
        className="absolute top-0.5 rounded-full bg-white transition-all"
        style={{
          width: 18,
          height: 18,
          left: on ? 18 : 2,
        }}
      />
    </span>
  );
}
