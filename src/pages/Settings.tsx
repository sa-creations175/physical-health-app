import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { SectionLabel } from '../components/ui/primitives';
import {
  getUserPreferences,
  updateUserPreferences,
  TARGET_RANGES,
} from '../lib/userPreferences';
import { getSyncMessages, subscribeSyncMessages } from '../lib/syncDebug';

export default function Settings() {
  const prefs = useLiveQuery(() => getUserPreferences(), []);

  // Live cloud-sync debug output. Seeded from the buffer (messages collected
  // during startup sync, before this page mounted) and updated as more arrive.
  const [syncLog, setSyncLog] = useState<string[]>(() => getSyncMessages());
  useEffect(() => subscribeSyncMessages(setSyncLog), []);

  if (!prefs) {
    return (
      <div className="px-5 pt-8 text-card-mute text-[12px]">Loading…</div>
    );
  }

  return (
    <div className="px-5 pt-8 pb-8">
      <SectionLabel>Settings</SectionLabel>
      <h1 className="text-[22px] font-medium text-ink mt-1">Settings</h1>
      <p className="text-[12px] text-ink-soft mt-1">
        Targets save automatically when you tap away from the field.
      </p>

      <section className="mt-6">
        <SectionLabel>Weekly targets</SectionLabel>
        <p className="text-[11px] text-ink-soft mt-1">Sessions per week</p>

        <NumberRow
          label="Lower Body"
          value={prefs.lifting_target_lower}
          min={TARGET_RANGES.lifting.min}
          max={TARGET_RANGES.lifting.max}
          onCommit={(v) =>
            updateUserPreferences({ lifting_target_lower: v })
          }
        />
        <NumberRow
          label="Upper Body"
          value={prefs.lifting_target_upper}
          min={TARGET_RANGES.lifting.min}
          max={TARGET_RANGES.lifting.max}
          onCommit={(v) =>
            updateUserPreferences({ lifting_target_upper: v })
          }
        />
        <NumberRow
          label="Full Body"
          hint="Optional — set 0 to hide from progress tracking."
          value={prefs.lifting_target_full_body}
          min={TARGET_RANGES.lifting.min}
          max={TARGET_RANGES.lifting.max}
          onCommit={(v) =>
            updateUserPreferences({ lifting_target_full_body: v })
          }
        />
        <NumberRow
          label="Cardio"
          value={prefs.cardio_target_weekly}
          min={TARGET_RANGES.cardio.min}
          max={TARGET_RANGES.cardio.max}
          onCommit={(v) =>
            updateUserPreferences({ cardio_target_weekly: v })
          }
        />
      </section>

      <section className="mt-7">
        <SectionLabel>Daily nutrition</SectionLabel>
        <p className="text-[11px] text-ink-soft mt-1">
          Saved now — Phase 3 lights up dashboard tracking.
        </p>

        <NumberRow
          label="Protein"
          hint="grams per day"
          value={prefs.protein_grams_daily}
          min={TARGET_RANGES.protein_grams.min}
          max={TARGET_RANGES.protein_grams.max}
          onCommit={(v) =>
            updateUserPreferences({ protein_grams_daily: v })
          }
        />
        <NumberRow
          label="Water"
          hint="glasses per day"
          value={prefs.water_glasses_daily}
          min={TARGET_RANGES.water_glasses.min}
          max={TARGET_RANGES.water_glasses.max}
          onCommit={(v) =>
            updateUserPreferences({ water_glasses_daily: v })
          }
        />
        <NumberRow
          label="Vegetables"
          hint="servings per day"
          value={prefs.veg_servings_daily}
          min={TARGET_RANGES.veg_servings.min}
          max={TARGET_RANGES.veg_servings.max}
          onCommit={(v) =>
            updateUserPreferences({ veg_servings_daily: v })
          }
        />
      </section>

      <section className="mt-7">
        <SectionLabel>Daily bundle</SectionLabel>
        <p className="text-[11px] text-ink-soft mt-1">
          Daily rep targets, and the amount each tap adds on the dashboard card.
        </p>

        <NumberRow
          label="Push-up target"
          hint="reps per day"
          value={prefs.bundle_pushup_target}
          min={TARGET_RANGES.bundle_target.min}
          max={TARGET_RANGES.bundle_target.max}
          onCommit={(v) =>
            updateUserPreferences({ bundle_pushup_target: v })
          }
        />
        <NumberRow
          label="Ab roll target"
          hint="reps per day"
          value={prefs.bundle_abroll_target}
          min={TARGET_RANGES.bundle_target.min}
          max={TARGET_RANGES.bundle_target.max}
          onCommit={(v) =>
            updateUserPreferences({ bundle_abroll_target: v })
          }
        />
        <NumberRow
          label="Calf raise target"
          hint="reps per day"
          value={prefs.bundle_calfraise_target}
          min={TARGET_RANGES.bundle_target.min}
          max={TARGET_RANGES.bundle_target.max}
          onCommit={(v) =>
            updateUserPreferences({ bundle_calfraise_target: v })
          }
        />
        <NumberRow
          label="Push-up increment"
          hint="Amount added per tap on the bundle card."
          value={prefs.bundle_pushup_increment}
          min={TARGET_RANGES.bundle_increment.min}
          max={TARGET_RANGES.bundle_increment.max}
          onCommit={(v) =>
            updateUserPreferences({ bundle_pushup_increment: v })
          }
        />
        <NumberRow
          label="Ab roll increment"
          hint="Amount added per tap on the bundle card."
          value={prefs.bundle_abroll_increment}
          min={TARGET_RANGES.bundle_increment.min}
          max={TARGET_RANGES.bundle_increment.max}
          onCommit={(v) =>
            updateUserPreferences({ bundle_abroll_increment: v })
          }
        />
        <NumberRow
          label="Calf raise increment"
          hint="Amount added per tap on the bundle card."
          value={prefs.bundle_calfraise_increment}
          min={TARGET_RANGES.bundle_increment.min}
          max={TARGET_RANGES.bundle_increment.max}
          onCommit={(v) =>
            updateUserPreferences({ bundle_calfraise_increment: v })
          }
        />
      </section>

      <section className="mt-7">
        <SectionLabel>Thresholds</SectionLabel>
        <p className="text-[11px] text-ink-soft mt-1">
          What counts as a qualifying session, and weekly day targets.
        </p>

        <NumberRow
          label="Cardio minimum duration"
          hint="Sessions below this are marked short on the dashboard."
          value={prefs.cardio_threshold_minutes}
          min={TARGET_RANGES.cardio_min_minutes.min}
          max={TARGET_RANGES.cardio_min_minutes.max}
          onCommit={(v) =>
            updateUserPreferences({ cardio_threshold_minutes: v })
          }
        />
        <NumberRow
          label="Mobility minimum duration"
          hint="Minimum minutes for a mobility session to count as complete."
          value={prefs.bundle_mobility_min_minutes}
          min={TARGET_RANGES.mobility_min_minutes.min}
          max={TARGET_RANGES.mobility_min_minutes.max}
          onCommit={(v) =>
            updateUserPreferences({ bundle_mobility_min_minutes: v })
          }
        />
        <NumberRow
          label="Mobility weekly target"
          hint="Target days per week for mobility practice."
          value={prefs.bundle_mobility_target}
          min={TARGET_RANGES.weekly_days.min}
          max={TARGET_RANGES.weekly_days.max}
          onCommit={(v) =>
            updateUserPreferences({ bundle_mobility_target: v })
          }
        />
        <NumberRow
          label="Bundle weekly target"
          hint="Target days per week for daily bundle activity."
          value={prefs.bundle_target}
          min={TARGET_RANGES.weekly_days.min}
          max={TARGET_RANGES.weekly_days.max}
          onCommit={(v) => updateUserPreferences({ bundle_target: v })}
        />
      </section>

      {/* TEMPORARY (debug): clears the one-time initial-push flag and reloads
          so the cloud sync re-runs the initial push. Remove once sync is
          confirmed working. */}
      <section className="mt-8">
        <button
          type="button"
          onClick={() => {
            localStorage.removeItem('ph_cloud_initial_push_done');
            const cleared =
              localStorage.getItem('ph_cloud_initial_push_done') === null;
            // The in-memory sync log resets on reload, so stash a one-shot
            // marker the post-reload sync trace reads and surfaces in the panel.
            localStorage.setItem('ph_force_sync_marker', String(cleared));
            window.location.reload();
          }}
          className="border border-red-alert text-red-alert rounded-full px-3 py-1.5 text-[13px] font-medium"
        >
          Force cloud sync (debug)
        </button>
      </section>

      {/* TEMPORARY (debug): live cloud-sync trace, mirrored from lib/sync.ts. */}
      <section className="mt-6">
        <SectionLabel>Sync debug output</SectionLabel>
        <div className="mt-2 bg-[#eef1ef] border border-card-edge rounded-lg p-3 text-[11px] text-ink font-mono whitespace-pre-wrap break-words">
          {syncLog.length === 0 ? (
            <span className="text-card-mute">No sync output yet.</span>
          ) : (
            syncLog.map((line, i) => <div key={i}>{line}</div>)
          )}
        </div>
      </section>
    </div>
  );
}

function NumberRow({
  label,
  hint,
  value,
  min,
  max,
  onCommit,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  onCommit: (next: number) => Promise<void> | void;
}) {
  const [text, setText] = useState(String(value));
  // Inline save confirmation. The mint ✓ next to the label fades in
  // when the synced-write resolves and fades out ~2s later. Holding a
  // timer ref instead of a Date.now() comparison so a quick re-edit
  // (within the visible window) can clear the previous timeout
  // cleanly and start a fresh 2s window from the new save.
  const [showCheck, setShowCheck] = useState(false);
  const checkTimerRef = useRef<number | null>(null);

  // Mirror the underlying value back into the local input when it changes
  // (e.g., another tab saved, or the value was clamped on the previous commit).
  useEffect(() => {
    setText(String(value));
  }, [value]);

  // Clear any pending fade-out on unmount so a stale timer can't fire
  // setShowCheck on a torn-down component.
  useEffect(() => {
    return () => {
      if (checkTimerRef.current !== null) {
        window.clearTimeout(checkTimerRef.current);
        checkTimerRef.current = null;
      }
    };
  }, []);

  async function commit() {
    const trimmed = text.trim();
    const parsed = trimmed === '' ? 0 : parseInt(trimmed, 10);
    if (Number.isNaN(parsed)) {
      setText(String(value));
      return;
    }
    const clamped = Math.max(min, Math.min(max, parsed));
    if (clamped !== value) {
      // Await the synced-write before flipping the check on — the
      // confirmation is for *save success*, not blur. If onCommit
      // throws, control never reaches the lines below and the check
      // stays hidden, which is the right signal.
      await onCommit(clamped);
      if (checkTimerRef.current !== null) {
        window.clearTimeout(checkTimerRef.current);
      }
      setShowCheck(true);
      checkTimerRef.current = window.setTimeout(() => {
        setShowCheck(false);
        checkTimerRef.current = null;
      }, 2000);
    }
    setText(String(clamped));
  }

  return (
    <div
      className="bg-card border border-card-edge rounded-xl px-4 py-3 mt-2 flex items-center justify-between gap-3"
      style={{ borderLeftWidth: '2px', borderLeftColor: '#0F6E56' }}
    >
      <div className="min-w-0">
        <p className="text-[14px] text-ink">{label}</p>
        {hint && (
          <p className="text-[11px] text-card-mute mt-0.5">{hint}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <input
          type="number"
          inputMode="numeric"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          aria-label={label}
          className="bg-charcoal border border-card-edge text-ink rounded-lg px-2 w-[72px] h-11 text-[16px] text-center"
        />
        <span
          aria-hidden={!showCheck}
          className="text-green-mint text-[16px] leading-none w-3 transition-opacity duration-500"
          style={{ opacity: showCheck ? 1 : 0 }}
        >
          ✓
        </span>
      </div>
    </div>
  );
}
