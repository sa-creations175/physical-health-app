import { Card, SectionLabel, ProgressBar } from '../ui/primitives';
import { DEFAULT_DAILY_NUTRITION_TARGETS } from '../../lib/defaults';

export default function NutritionSection() {
  return (
    <section className="px-5 mt-6">
      <SectionLabel>Today — nutrition</SectionLabel>
      <Card className="mt-2 p-4 space-y-4">
        <NutritionRow
          label="Protein"
          targetText={`${DEFAULT_DAILY_NUTRITION_TARGETS.protein_grams}g`}
          barColor="green-deep"
        />
        <NutritionRow
          label="Water"
          targetText={`${DEFAULT_DAILY_NUTRITION_TARGETS.water_glasses} glasses`}
          barColor="water-blue"
        />
        <NutritionRow
          label="Vegetables"
          targetText={`${DEFAULT_DAILY_NUTRITION_TARGETS.veg_servings} servings`}
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
        <span className="text-[11px] text-ink-mute">
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
      <span className="text-[11px] text-ink-hint">configure in settings</span>
    </div>
  );
}
