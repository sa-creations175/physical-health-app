import { useFitnessCardConfig } from '../../lib/useFitnessCardConfig';
import { FITNESS_CARD_KEYS } from '../../lib/defaults';
import Switch from '../ui/Switch';
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
              <Switch on={visible} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
