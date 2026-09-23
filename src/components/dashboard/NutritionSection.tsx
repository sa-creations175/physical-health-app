import { useLiveQuery } from 'dexie-react-hooks';
import { Card, SectionLabel, ProgressBar } from '../ui/primitives';
import { LeafIcon } from './PillarIcons';
import { DEFAULT_DAILY_NUTRITION_TARGETS } from '../../lib/defaults';
import { getUserPreferences } from '../../lib/userPreferences';

export default function NutritionSection({
  label = 'Today — Nutrition',
}: {
  label?: string;
}) {
  const prefs = useLiveQuery(() => getUserPreferences(), []);
  const protein = prefs?.protein_grams_daily ?? DEFAULT_DAILY_NUTRITION_TARGETS.protein_grams;
  const water = prefs?.water_glasses_daily ?? DEFAULT_DAILY_NUTRITION_TARGETS.water_glasses;
  const veg = prefs?.veg_servings_daily ?? DEFAULT_DAILY_NUTRITION_TARGETS.veg_servings;

  return (
    <section className="px-4 mt-6">
      <div className="flex items-center justify-between gap-2">
        <SectionLabel>{label}</SectionLabel>
        <LeafIcon />
      </div>
      <Card className="mt-2 p-4 space-y-4">
        <NutritionRow
          label="Protein"
          targetText={`${protein}g`}
        />
        <NutritionRow
          label="Water"
          targetText={`${water} glasses`}
        />
        <NutritionRow
          label="Vegetables"
          targetText={`${veg} servings`}
        />
        <SupplementsRow />
      </Card>
    </section>
  );
}

function NutritionRow({
  label,
  targetText,
}: {
  label: string;
  targetText: string;
}) {
  return (
    <div>
      <div className="flex justify-between items-baseline">
        <span className="text-label text-ink">{label}</span>
        <span className="text-label text-muted">
          no data yet · target {targetText}
        </span>
      </div>
      <div className="mt-1.5">
        <ProgressBar value={0} max={1} />
      </div>
    </div>
  );
}

function SupplementsRow() {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-label text-ink">Supplements</span>
      <span className="text-label text-muted">configure in settings</span>
    </div>
  );
}
