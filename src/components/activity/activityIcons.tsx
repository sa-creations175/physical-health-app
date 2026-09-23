import {
  Activity,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Flame,
  PersonStanding,
  Watch,
  type LucideIcon,
} from 'lucide-react';

// Pillar icons, Lucide only (PERSONAL_OS_BRAND.md; Body Home/Fitness
// prototype): Daily Bundle flame, Cardio the activity line (never the
// heart-pulse, which is reserved for the app icon), Lower Body arrow-down,
// Upper Body arrow-up, Full Body arrow-up-down, Mobility the stretching
// figure. Green 700, sized to sit inline with an eyebrow.
function pillarIcon(Icon: LucideIcon) {
  return function PillarIcon() {
    return (
      <Icon
        aria-hidden="true"
        size={16}
        strokeWidth={2}
        className="shrink-0 text-green-700"
      />
    );
  };
}

export const BundleIcon = pillarIcon(Flame);
export const CardioIcon = pillarIcon(Activity);
export const LowerBodyIcon = pillarIcon(ArrowDown);
export const UpperBodyIcon = pillarIcon(ArrowUp);
export const FullBodyIcon = pillarIcon(ArrowUpDown);
export const MobilityIcon = pillarIcon(PersonStanding);
export const WatchIcon = pillarIcon(Watch);
