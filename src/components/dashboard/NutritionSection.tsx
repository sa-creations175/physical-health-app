import { useLiveQuery } from 'dexie-react-hooks';
import { Card, SectionLabel, ProgressBar } from '../ui/primitives';
import { DEFAULT_DAILY_NUTRITION_TARGETS } from '../../lib/defaults';
import { getUserPreferences } from '../../lib/userPreferences';

export default function NutritionSection() {
  const prefs = useLiveQuery(() => getUserPreferences(), []);
  const protein = prefs?.protein_grams_daily ?? DEFAULT_DAILY_NUTRITION_TARGETS.protein_grams;
  const water = prefs?.water_glasses_daily ?? DEFAULT_DAILY_NUTRITION_TARGETS.water_glasses;
  const veg = prefs?.veg_servings_daily ?? DEFAULT_DAILY_NUTRITION_TARGETS.veg_servings;

  return (
    <section className="px-5 mt-6">
      <SectionLabel>Today — nutrition</SectionLabel>
      <Card className="mt-2 p-4 space-y-4">
        <NutritionRow
          label="Protein"
          targetText={`${protein}g`}
          barColor="green-deep"
        />
        <NutritionRow
          label="Water"
          targetText={`${water} glasses`}
          barColor="water-blue"
        />
        <NutritionRow
          label="Vegetables"
          targetText={`${veg} servings`}
          barColor="green-light"
        />
        <SupplementsRow />
      </Card>
    </section>
  );
}

function NutritionRow({
  label,
  targetText,
  barColor,
}: {
  label: string;
  targetText: string;
  barColor: 'green-deep' | 'water-blue' | 'green-light';
}) {
  return (
    <div>
      <div className="flex justify-between items-baseline">
        <span className="text-[12px] text-ink-body">{label}</span>
        <span className="text-[11px] text-card-mute">
          no data yet · target {targetText}
        </span>
      </div>
      <div className="mt-1.5">
        <ProgressBar value={0} max={1} color={barColor} />
      </div>
    </div>
  );
}

function SupplementsRow() {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-[12px] text-ink-body">Supplements</span>
      <span className="text-[11px] text-card-mute">configure in settings</span>
    </div>
  );
}
