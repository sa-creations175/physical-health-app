import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { SectionLabel } from '../components/ui/primitives';
import {
  getUserPreferences,
  updateUserPreferences,
  TARGET_RANGES,
} from '../lib/userPreferences';
import { getWatchLog, clearWatchLog } from '../lib/watchDebug';
import { importWatchWorkouts, LAST_IMPORT_KEY } from '../lib/watchImport';
import { db } from '../db/database';
import { syncedBulkDelete } from '../db/syncedWrite';

export default function Settings() {
  const prefs = useLiveQuery(() => getUserPreferences(), []);

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

      <section className="mt-6">
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

      <section className="mt-6">
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

      <section className="mt-6">
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

      <WatchImportLogPanel />

      <CleanupManualCardioPanel />

      <CardioLogsDebugPanel />

    </div>
  );
}

// TEMPORARY — diagnostics for the Apple Watch auto-import. Reads the
// localStorage ring buffer written by importWatchWorkouts(), with buttons to
// re-run the import on demand, refresh, and clear. Remove with the rest of the
// watch-import debug tooling once confirmed working.
function WatchImportLogPanel() {
  const [lines, setLines] = useState<string[]>(() => getWatchLog());
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');

  const refresh = () => setLines(getWatchLog());

  async function runNow() {
    setRunning(true);
    try {
      // Clear the high-water mark first so every manual run reprocesses the
      // full last-7-days window rather than skipping "already processed" ones.
      localStorage.removeItem(LAST_IMPORT_KEY);
      await importWatchWorkouts();
    } catch (e) {
      console.error('Manual watch import failed:', e);
    } finally {
      setRunning(false);
      refresh();
    }
  }

  // One-time backfill: clear the marker and import a 90-day window instead of
  // the usual 7. The startup auto-import is unaffected (still defaults to 7).
  async function run90() {
    setRunning(true);
    setMessage('Importing 90 days of Watch data…');
    try {
      localStorage.removeItem(LAST_IMPORT_KEY);
      const n = await importWatchWorkouts(90);
      setMessage(`Imported ${n} workout${n === 1 ? '' : 's'} from Apple Watch`);
    } catch (e) {
      console.error('90-day watch import failed:', e);
      setMessage(`Import failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setRunning(false);
      refresh();
    }
  }

  return (
    <section className="mt-6">
      <SectionLabel>Watch import log (debug)</SectionLabel>
      <p className="text-[11px] text-ink-soft mt-1">
        Temporary diagnostics for the Apple Watch auto-import.
      </p>

      <div className="flex gap-2 mt-2">
        <button
          type="button"
          onClick={runNow}
          disabled={running}
          className="bg-green-mid text-white rounded-lg px-3 h-9 text-[13px] font-medium disabled:opacity-50"
        >
          {running ? 'Running…' : 'Run import now'}
        </button>
        <button
          type="button"
          onClick={refresh}
          className="bg-card border border-card-edge text-ink rounded-lg px-3 h-9 text-[13px]"
        >
          Refresh
        </button>
        <button
          type="button"
          onClick={() => {
            clearWatchLog();
            refresh();
          }}
          className="bg-card border border-card-edge text-ink rounded-lg px-3 h-9 text-[13px]"
        >
          Clear
        </button>
      </div>

      <button
        type="button"
        onClick={run90}
        disabled={running}
        className="mt-2 w-full bg-green-mid text-white rounded-lg px-3 h-10 text-[13px] font-medium disabled:opacity-50"
      >
        Import last 90 days from Apple Watch
      </button>
      {message && <p className="mt-2 text-[12px] text-green-mid">{message}</p>}

      <div className="mt-3 bg-charcoal border border-card-edge rounded-xl p-3 max-h-72 overflow-auto">
        {lines.length === 0 ? (
          <p className="text-[12px] text-card-mute">
            No log yet — tap “Run import now”.
          </p>
        ) : (
          <pre className="text-[10px] leading-[1.5] text-ink whitespace-pre-wrap break-words font-mono">
            {lines.join('\n')}
          </pre>
        )}
      </div>
    </section>
  );
}

// TEMPORARY — one-off cleanup: delete manually-logged cardio so the Apple
// Watch imports replace them. Guarded: counts first, requires an explicit
// confirm tap, then deletes (syncing to Supabase) and re-runs the import.
// ⚠ Destructive and synced to the cloud — there is no backup once confirmed.
function CleanupManualCardioPanel() {
  const [phase, setPhase] = useState<'idle' | 'confirm' | 'working' | 'done'>(
    'idle',
  );
  const [ids, setIds] = useState<string[]>([]);
  const [result, setResult] = useState('');

  async function start() {
    const all = await db.cardio_logs.toArray();
    // `== null` catches both null and (legacy/pulled) undefined source values.
    const targetIds = all
      .filter((l) => l.source == null || l.source === 'manual')
      .map((l) => l.id);
    if (targetIds.length === 0) {
      setResult('No manual cardio logs to delete.');
      setPhase('done');
      return;
    }
    setIds(targetIds);
    setPhase('confirm');
  }

  async function confirmDelete() {
    const n = ids.length;
    setPhase('working');
    try {
      await syncedBulkDelete(db.cardio_logs, ids);
      // Clear the high-water mark so the reimport reprocesses the full window
      // and re-files the Watch versions (no longer blocked by the now-deleted
      // manual duplicates).
      localStorage.removeItem(LAST_IMPORT_KEY);
      await importWatchWorkouts();
      setResult(`Deleted ${n} logs. Watch workouts reimported.`);
    } catch (e) {
      console.error('Manual cardio cleanup failed:', e);
      setResult(`Cleanup failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setPhase('done');
    }
  }

  return (
    <section className="mt-6">
      <SectionLabel>Clean up manual cardio (debug)</SectionLabel>
      <p className="text-[11px] text-ink-soft mt-1">
        Delete manually-logged cardio and let Apple Watch imports replace them.
      </p>

      {phase === 'idle' && (
        <button
          type="button"
          onClick={start}
          className="mt-2 bg-card border border-card-edge text-ink rounded-lg px-3 h-9 text-[13px]"
        >
          Clean up manual cardio logs
        </button>
      )}

      {phase === 'confirm' && (
        <div className="mt-2">
          <p className="text-[13px] text-ink">
            Delete {ids.length} manual cardio log{ids.length === 1 ? '' : 's'}?
            Watch imports will replace them.
          </p>
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={confirmDelete}
              className="text-white rounded-lg px-3 h-9 text-[13px] font-medium"
              style={{ backgroundColor: '#e03b5a' }}
            >
              Delete {ids.length}
            </button>
            <button
              type="button"
              onClick={() => setPhase('idle')}
              className="bg-card border border-card-edge text-ink rounded-lg px-3 h-9 text-[13px]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {phase === 'working' && (
        <p className="mt-2 text-[13px] text-ink-soft">Deleting &amp; reimporting…</p>
      )}

      {phase === 'done' && (
        <div className="mt-2">
          <p className="text-[13px] text-green-mid">{result}</p>
          <button
            type="button"
            onClick={() => {
              setPhase('idle');
              setResult('');
              setIds([]);
            }}
            className="mt-2 bg-card border border-card-edge text-ink rounded-lg px-3 h-9 text-[13px]"
          >
            Done
          </button>
        </div>
      )}
    </section>
  );
}

// TEMPORARY — read-only inspector for cardio_logs, to debug Watch-import
// duplicate detection. Reports total count, a breakdown by source, and a
// per-row dump (started_at · source · resolved type · duration). Rows whose
// cardio_type_id doesn't resolve are flagged "(type missing)" — those exist in
// the store (so they trip dedup) but are filtered out of History.
function CardioLogsDebugPanel() {
  const [report, setReport] = useState<string | null>(null);

  async function inspect() {
    const [logs, types] = await Promise.all([
      db.cardio_logs.toArray(),
      db.cardio_types.toArray(),
    ]);
    const typeName = new Map(types.map((t) => [t.id, t.name]));
    let watch = 0;
    let manual = 0;
    let none = 0;
    for (const l of logs) {
      if (l.source === 'watch') watch += 1;
      else if (l.source === 'manual') manual += 1;
      else none += 1;
    }
    const rows = logs
      .slice()
      .sort((a, b) => b.started_at.localeCompare(a.started_at))
      .map((l) => {
        const t = l.cardio_type_id
          ? (typeName.get(l.cardio_type_id) ?? '(type missing)')
          : '(no type)';
        return `${l.started_at}  [${l.source ?? 'null'}]  ${t}  ${l.duration_minutes}min`;
      });
    const summary = `Total: ${logs.length}  —  watch: ${watch}, manual: ${manual}, null/none: ${none}`;
    setReport([summary, '', ...rows].join('\n'));
  }

  return (
    <section className="mt-6">
      <SectionLabel>Cardio logs (debug)</SectionLabel>
      <p className="text-[11px] text-ink-soft mt-1">
        Inspect cardio_logs + source — for Watch-import duplicate debugging.
      </p>
      <button
        type="button"
        onClick={inspect}
        className="mt-2 bg-card border border-card-edge text-ink rounded-lg px-3 h-9 text-[13px]"
      >
        Inspect cardio logs
      </button>
      {report !== null && (
        <div className="mt-3 bg-charcoal border border-card-edge rounded-xl p-3 max-h-72 overflow-auto">
          <pre className="text-[10px] leading-[1.5] text-ink whitespace-pre-wrap break-words font-mono">
            {report}
          </pre>
        </div>
      )}
    </section>
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
