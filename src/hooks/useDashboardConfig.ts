import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  getUserPreferences,
  updateUserPreferences,
} from '../lib/userPreferences';
import {
  DASHBOARD_SECTION_KEYS,
  DEFAULT_DASHBOARD_SECTION_CONFIG,
  type DashboardSectionMeta,
} from '../lib/defaults';

export type SectionConfigMap = Record<string, DashboardSectionMeta>;

export interface DashboardConfig {
  // Visible sections, in stored order — what the normal dashboard renders.
  orderedSections: string[];
  // Every known section in stored order, including hidden ones — for the
  // reorder/edit view.
  allSections: string[];
  // Complete { label, visible } for every known section (defaults merged in).
  config: SectionConfigMap;
  updateOrder: (newOrder: string[]) => Promise<void>;
  updateSection: (
    key: string,
    patch: Partial<DashboardSectionMeta>,
  ) => Promise<void>;
  loading: boolean;
}

// Build a complete config over the *known* section keys: each entry takes the
// stored value when present and well-typed, else the shipped default. Unknown
// keys in the stored blob are dropped, missing keys get defaults — so a future
// section appears automatically and a malformed/stale blob can't break render.
function buildConfig(raw: string | undefined): SectionConfigMap {
  let stored: Record<string, Partial<DashboardSectionMeta>> = {};
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') stored = parsed;
    } catch {
      /* malformed JSON → fall back to defaults below */
    }
  }
  const out: SectionConfigMap = {};
  for (const key of DASHBOARD_SECTION_KEYS) {
    const def = DEFAULT_DASHBOARD_SECTION_CONFIG[key];
    const s = stored[key] ?? {};
    out[key] = {
      label: typeof s.label === 'string' ? s.label : def.label,
      visible: typeof s.visible === 'boolean' ? s.visible : def.visible,
    };
  }
  return out;
}

// Sanitize the stored order: keep only known keys (de-duped, in stored order),
// then append any known keys the stored order is missing, in canonical order.
function buildOrder(raw: string | undefined): string[] {
  let stored: unknown = [];
  if (raw) {
    try {
      stored = JSON.parse(raw);
    } catch {
      /* malformed → canonical order below */
    }
  }
  const known = new Set<string>(DASHBOARD_SECTION_KEYS);
  const seen = new Set<string>();
  const order: string[] = [];
  if (Array.isArray(stored)) {
    for (const k of stored) {
      if (typeof k === 'string' && known.has(k) && !seen.has(k)) {
        order.push(k);
        seen.add(k);
      }
    }
  }
  for (const k of DASHBOARD_SECTION_KEYS) {
    if (!seen.has(k)) {
      order.push(k);
      seen.add(k);
    }
  }
  return order;
}

export function useDashboardConfig(): DashboardConfig {
  const prefs = useLiveQuery(() => getUserPreferences(), []);
  const loading = prefs === undefined;

  // While prefs load, buildConfig/buildOrder(undefined) yield the shipped
  // defaults (canonical order, all visible) — a sensible first paint.
  const config = buildConfig(prefs?.dashboard_section_config);
  const allSections = buildOrder(prefs?.dashboard_section_order);
  const orderedSections = allSections.filter((k) => config[k]?.visible);

  const updateOrder = useCallback(async (newOrder: string[]) => {
    const known = new Set<string>(DASHBOARD_SECTION_KEYS);
    const sanitized = newOrder.filter((k) => known.has(k));
    await updateUserPreferences({
      dashboard_section_order: JSON.stringify(sanitized),
    });
  }, []);

  const updateSection = useCallback(
    async (key: string, patch: Partial<DashboardSectionMeta>) => {
      // Re-read the persisted config so a patch merges onto the latest truth
      // rather than a render-time snapshot (avoids clobbering a concurrent
      // edit, e.g. a rename landing between a visibility toggle's frames).
      const prefsNow = await getUserPreferences();
      const current = buildConfig(prefsNow.dashboard_section_config);
      if (!(key in current)) return;
      const next: SectionConfigMap = {
        ...current,
        [key]: { ...current[key], ...patch },
      };
      await updateUserPreferences({
        dashboard_section_config: JSON.stringify(next),
      });
    },
    [],
  );

  return {
    orderedSections,
    allSections,
    config,
    updateOrder,
    updateSection,
    loading,
  };
}
