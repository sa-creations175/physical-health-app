import { useLiveQuery } from 'dexie-react-hooks';
import { getUserPreferences, updateUserPreferences } from './userPreferences';
import {
  FITNESS_CARD_KEYS,
  DEFAULT_FITNESS_CARD_CONFIG,
  type FitnessCardKey,
  type FitnessCardMeta,
} from './defaults';

export type FitnessCardConfig = Record<FitnessCardKey, FitnessCardMeta>;

// Parse the stored JSON, falling back to the defaults on anything malformed,
// then merge each key over the defaults so a card added in a later build (or a
// key missing from an older stored blob) always resolves to a sane entry.
function parseConfig(raw: string | undefined): FitnessCardConfig {
  let stored: Partial<Record<string, Partial<FitnessCardMeta>>> = {};
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') stored = parsed;
    } catch {
      // Corrupt blob — fall through to defaults.
    }
  }
  const merged = {} as FitnessCardConfig;
  for (const key of FITNESS_CARD_KEYS) {
    const fallback = DEFAULT_FITNESS_CARD_CONFIG[key];
    const override = stored[key];
    merged[key] = {
      label: fallback.label,
      visible:
        typeof override?.visible === 'boolean'
          ? override.visible
          : fallback.visible,
    };
  }
  return merged;
}

export interface UseFitnessCardConfig {
  config: FitnessCardConfig;
  isVisible: (key: FitnessCardKey) => boolean;
  setVisible: (key: FitnessCardKey, visible: boolean) => Promise<void>;
  toggle: (key: FitnessCardKey) => Promise<void>;
  // Undefined until the live query first resolves — used to avoid a flash of
  // the default layout before the user's saved visibility loads.
  loading: boolean;
}

export function useFitnessCardConfig(): UseFitnessCardConfig {
  const prefs = useLiveQuery(() => getUserPreferences(), []);
  const config = parseConfig(prefs?.fitness_card_config);

  const setVisible = (key: FitnessCardKey, visible: boolean) => {
    const next: FitnessCardConfig = {
      ...config,
      [key]: { ...config[key], visible },
    };
    return updateUserPreferences({
      fitness_card_config: JSON.stringify(next),
    });
  };

  return {
    config,
    isVisible: (key) => config[key].visible,
    setVisible,
    toggle: (key) => setVisible(key, !config[key].visible),
    loading: prefs === undefined,
  };
}
