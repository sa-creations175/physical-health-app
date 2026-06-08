import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import { useToast } from '../ui/Toast';
import SharedActivityCard from './SharedActivityCard';
import { MobilityIcon } from './activityIcons';
import { MobilityRow } from './bundleLogging';
import {
  getUserPreferences,
  updateUserPreferences,
} from '../../lib/userPreferences';
import { DEFAULT_BUNDLE_CONFIG } from '../../lib/defaults';
import {
  getWeeklyTotals,
  parseMobilityLinks,
  upsertBundleLog,
  type MobilityLink,
} from '../../lib/bundleHelpers';
import { mobilityDots } from '../../lib/dotHelpers';
import { PILLAR_COLORS, fillFraction } from '../../lib/pillarColors';
import {
  startOfWeekISODate,
  addDaysISO,
  todayISODate,
} from '../../lib/dateHelpers';
import type { BundleLog } from '../../db/types';

export default function MobilityActivityCard({
  expanded,
  onToggle,
}: {
  expanded: boolean;
  onToggle: () => void;
}) {
  const rows = useLiveQuery(() => db.bundle_logs.toArray(), [], []);
  const prefs = useLiveQuery(() => getUserPreferences(), []);
  const { showToast } = useToast();
  const today = todayISODate();

  const minMinutes =
    prefs?.bundle_mobility_min_minutes ?? DEFAULT_BUNDLE_CONFIG.mobility_min_minutes;
  const target =
    prefs?.bundle_mobility_target ?? DEFAULT_BUNDLE_CONFIG.mobility_target;

  const byDate = new Map<string, BundleLog>(rows.map((r) => [r.date, r]));
  const weekStart = startOfWeekISODate();
  const weekLogs = Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i))
    .map((d) => byDate.get(d))
    .filter((r): r is BundleLog => r !== undefined);

  const totals = getWeeklyTotals(weekLogs, minMinutes);
  const dots = mobilityDots(byDate, minMinutes);
  const links = parseMobilityLinks(prefs?.bundle_mobility_youtube_links);
  const todayMinutes = byDate.get(today)?.mobility_minutes ?? 0;
  const met = target > 0 && totals.mobilityQualifyingDays >= target;
  const pillar = PILLAR_COLORS.mobility;

  return (
    <SharedActivityCard
      label="Mobility"
      badge={
        <>
          {totals.mobilityQualifyingDays} / {target}
          {met && <span style={{ color: pillar.text }}> ✓</span>}
        </>
      }
      dots={dots}
      expanded={expanded}
      onToggle={onToggle}
      icon={<MobilityIcon />}
      fill={{
        color: pillar.fill,
        fraction: fillFraction(totals.mobilityQualifyingDays, target),
        complete: met,
        accent: pillar.text,
      }}
    >
      <MobilityRow
        minutes={todayMinutes}
        minMinutes={minMinutes}
        links={links}
        onChange={(next) =>
          upsertBundleLog(today, 'mobility_minutes', next).then(() =>
            showToast(`Mobility: ${next} min`),
          )
        }
        onAddLink={(label, url) => {
          const next: MobilityLink[] = [
            ...links,
            { id: Date.now().toString(), label, url },
          ];
          return updateUserPreferences({
            bundle_mobility_youtube_links: JSON.stringify(next),
          });
        }}
        onDeleteLink={(id) => {
          const next = links.filter((l) => l.id !== id);
          return updateUserPreferences({
            bundle_mobility_youtube_links: JSON.stringify(next),
          });
        }}
      />
      <p
        className={`mt-2 text-[11px] text-center ${
          met ? 'text-green-mid' : 'text-[#5f6b65]'
        }`}
      >
        Mobility: {totals.mobilityQualifyingDays} / {target} days
        {met ? ' ✓' : ''}
      </p>
    </SharedActivityCard>
  );
}
