import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import HeaderStrip from '../components/ui/HeaderStrip';
import BottomSheet from '../components/ui/BottomSheet';
import { useToast } from '../components/ui/Toast';
import SessionExerciseCard from '../components/strength/SessionExerciseCard';
import ExerciseSheet from '../components/strength/ExerciseSheet';
import { discardSession } from '../lib/strengthHelpers';
import {
  addExerciseToInstance,
  isSessionComplete,
  isStrengthType,
  keepSwapInPlan,
  repeatSwapLinkIds,
  resolveNudge,
  STRENGTH_TYPE_LABEL,
  swapExerciseInInstance,
} from '../lib/sessionPlans';
import {
  droppedMessage,
  finishExercise,
  finishSession,
  getLastTimes,
  reopenExercise,
  type LastTimeEntry,
} from '../lib/sessionSets';
import { initialRows, useSetRows } from '../lib/useSetRows';
import { getUserPreferences } from '../lib/userPreferences';
import { todayISODate } from '../lib/dateHelpers';
import type { Exercise, SessionExercise, SetEntry } from '../db/types';

type SheetState = { mode: 'add' } | { mode: 'swap'; linkId: string } | null;

// The workout session screen. Exercises open collapsed, one line each; one is
// open at a time. Sets are logged over last time's ghost numbers; a finished
// exercise folds and sinks below the open ones. Everything typed or checked
// is written immediately, so there's no separate save step for sets.
export default function ActiveSession() {
  const { sessionId = '' } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [openId, setOpenId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const session = useLiveQuery(() => db.sessions.get(sessionId), [sessionId]);
  const links = useLiveQuery(
    () => db.session_exercises.where('session_id').equals(sessionId).sortBy('order_index'),
    [sessionId],
  );
  const sets = useLiveQuery(
    async () => {
      const ls = await db.session_exercises.where('session_id').equals(sessionId).toArray();
      return db.sets.where('session_exercise_id').anyOf(ls.map((l) => l.id)).toArray();
    },
    [sessionId],
  );
  const exercises = useLiveQuery(() => db.exercises.toArray(), [], [] as Exercise[]);
  const prefs = useLiveQuery(() => getUserPreferences(), []);
  const repeatSwaps = useLiveQuery(
    () => repeatSwapLinkIds(sessionId),
    [sessionId, links],
    new Set<string>(),
  );

  const exerciseIds = useMemo(
    () => [...new Set((links ?? []).map((l) => l.exercise_id))].sort(),
    [links],
  );
  const idsKey = exerciseIds.join(',');
  // Last times, tagged with the exercise list they were computed for, so rows
  // are only built once history for that exact list has loaded.
  const lastTimes = useLiveQuery(
    async () =>
      session
        ? { key: idsKey, map: await getLastTimes(exerciseIds, session) }
        : undefined,
    [idsKey, session?.id, session?.created_at],
  );

  const toast = useCallback((msg: string) => showToast(msg), [showToast]);
  const rowsApi = useSetRows(toast);
  const { rows, setLinkRows } = rowsApi;

  const setsByLink = useMemo(() => {
    const m = new Map<string, Map<string, SetEntry>>();
    for (const s of sets ?? []) {
      const inner = m.get(s.session_exercise_id) ?? new Map<string, SetEntry>();
      inner.set(s.id, s);
      m.set(s.session_exercise_id, inner);
    }
    return m;
  }, [sets]);

  // Build rows for any exercise that doesn't have them yet.
  useEffect(() => {
    if (!links || !sets || !lastTimes || lastTimes.key !== idsKey) return;
    for (const l of links) {
      if (rows[l.id]) continue;
      const linkSets = [...(setsByLink.get(l.id)?.values() ?? [])];
      setLinkRows(l.id, initialRows(l, linkSets, lastTimes.map.get(l.exercise_id)?.[0]));
    }
  }, [links, sets, lastTimes, idsKey, rows, setsByLink, setLinkRows]);

  if (!session || !links) {
    return <div className="px-4 pt-8 text-muted text-label">Loading session…</div>;
  }

  const type = isStrengthType(session.type) ? session.type : 'full_body';
  const typeLabel = STRENGTH_TYPE_LABEL[type];
  const editing = isSessionComplete(session);
  const exById = new Map(exercises.map((e) => [e.id, e]));
  const history = (exerciseId: string): LastTimeEntry[] =>
    lastTimes?.map.get(exerciseId) ?? [];

  const openLinks = links.filter((l) => l.finished_order == null);
  const doneLinks = links
    .filter((l) => l.finished_order != null)
    .sort((a, b) => (a.finished_order ?? 0) - (b.finished_order ?? 0));

  const date = new Date(session.date + 'T00:00:00');
  const dateLabel = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
  const title =
    session.date === todayISODate()
      ? "Today's Session"
      : `${date.toLocaleDateString('en-US', { weekday: 'long' })}'s Session`;

  // "Finish session" / "Save changes": never blocks. Anything typed lands
  // first; then every exercise with a logged set is finished and the rest are
  // left out, named in a toast.
  async function handleFinishSession() {
    if (finishing || !links) return;
    setFinishing(true);
    await Promise.all(links.map((l) => rowsApi.settle(l.id)));
    const result = await finishSession(sessionId);
    if (result.discarded) {
      showToast('Nothing logged, so the session wasn’t saved');
      navigate('/fitness');
      return;
    }
    if (result.dropped.length > 0) showToast(droppedMessage(result.dropped), 3200);
    navigate(`/log/strength/complete/${sessionId}`);
  }

  function scrollTo(linkId: string) {
    requestAnimationFrame(() =>
      document.getElementById(`ex-${linkId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    );
  }

  async function pick(ex: Exercise) {
    const current = sheet;
    setSheet(null);
    if (!current) return;
    if (current.mode === 'add') {
      const id = await addExerciseToInstance(sessionId, ex.id);
      setOpenId(id);
      showToast(`${ex.name} added`);
      scrollTo(id);
    } else {
      await rowsApi.settle(current.linkId);
      await swapExerciseInInstance(current.linkId, ex.id);
      setLinkRows(current.linkId, undefined);
      setOpenId(current.linkId);
      showToast(`${ex.name} in, just for today`);
    }
  }

  function handlersFor(link: SessionExercise, ex: Exercise) {
    const linkSets = setsByLink.get(link.id) ?? new Map<string, SetEntry>();
    return {
      onOpen: () => setOpenId(link.id),
      onClose: () => setOpenId(null),
      onSwap: () => setSheet({ mode: 'swap', linkId: link.id }),
      onType: (key: string, field: 'weight' | 'reps', text: string) =>
        rowsApi.type(link.id, key, field, text),
      onCheck: (key: string) => {
        const row = rows[link.id]?.find((r) => r.key === key);
        void rowsApi.check(
          link.id,
          key,
          row?.setId ? linkSets.get(row.setId) : undefined,
          prefs?.one_tap_repeat ?? true,
        );
      },
      onRemove: (key: string) => void rowsApi.remove(link.id, key),
      onAddRow: () => rowsApi.addRow(link.id, linkSets),
      onToggleUnit: (key: string) => void rowsApi.toggleUnit(link.id, key),
      onFinish: async () => {
        await rowsApi.settle(link.id);
        const list = rowsApi.getRows(link.id);
        const real = list.filter((r) => r.setId);
        const ok = await finishExercise(link, real.map((r) => r.setId as string));
        if (!ok) {
          showToast('Nothing logged yet. Type a set or tap a circle.');
          return;
        }
        setLinkRows(link.id, real);
        setOpenId(null);
        showToast(`${ex.name} done`);
      },
      onReopen: async () => {
        await reopenExercise(link.id);
        setOpenId(link.id);
        scrollTo(link.id);
      },
      onKeep: async () => {
        await keepSwapInPlan(link.id);
        showToast(`${ex.name} is now part of ${typeLabel}`);
      },
      onJustToday: () => void resolveNudge(link.id),
    };
  }

  function renderCard(link: SessionExercise) {
    const ex = exById.get(link.exercise_id);
    if (!ex) return null;
    return (
      <SessionExerciseCard
        key={link.id}
        link={link}
        exercise={ex}
        open={openId === link.id}
        rows={rows[link.id] ?? []}
        setsById={setsByLink.get(link.id) ?? new Map()}
        lastTimes={history(link.exercise_id)}
        nudge={repeatSwaps.has(link.id)}
        typeLabel={typeLabel}
        h={handlersFor(link, ex)}
      />
    );
  }

  const swapLink = sheet?.mode === 'swap' ? links.find((l) => l.id === sheet.linkId) : undefined;

  return (
    <div className="pb-32">
      <HeaderStrip
        eyebrow={`Body · Fitness · ${typeLabel}`}
        title={title}
        subtitle={`${dateLabel} · ${doneLinks.length} of ${links.length} exercise${
          links.length === 1 ? '' : 's'
        } done`}
      />

      <div className="px-4">
        {links.length === 0 && (
          <p className="text-label text-muted mt-4">
            {typeLabel} has no usual exercises yet. Add the first one below.
          </p>
        )}
        {openLinks.map(renderCard)}
        {doneLinks.map(renderCard)}

        <button
          type="button"
          onClick={() => setSheet({ mode: 'add' })}
          className="pill pill-soft w-full mt-3 min-h-[44px]"
        >
          + Add an exercise
        </button>

        {!editing && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setConfirmDiscard(true)}
              className="text-label text-muted underline decoration-dotted underline-offset-4 min-h-[44px]"
            >
              Discard session
            </button>
          </div>
        )}
      </div>

      <div
        className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-hairline"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
      >
        <div className="max-w-md mx-auto px-4 pt-2.5 flex gap-2">
          {!editing && (
            <button
              type="button"
              onClick={() => {
                showToast('Session kept as a draft');
                navigate('/fitness');
              }}
              className="btn-secondary flex-1"
            >
              Save for later
            </button>
          )}
          <button
            type="button"
            onClick={() => void handleFinishSession()}
            disabled={finishing}
            className="btn-primary flex-1"
          >
            {editing ? 'Save changes' : 'Finish session'}
          </button>
        </div>
      </div>

      {sheet && (
        <ExerciseSheet
          mode={sheet.mode}
          session={session}
          type={type}
          swapName={swapLink ? exById.get(swapLink.exercise_id)?.name : undefined}
          inSession={exerciseIds}
          onPick={(ex) => void pick(ex)}
          onClose={() => setSheet(null)}
        />
      )}

      {confirmDiscard && (
        <BottomSheet onClose={() => setConfirmDiscard(false)} label="Discard session">
          <p className="text-body text-ink leading-snug pr-10">
            Discard this session? This can't be undone.
          </p>
          <div className="flex gap-2 mt-4">
            <button type="button" onClick={() => setConfirmDiscard(false)} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                await discardSession(sessionId);
                navigate('/log/strength');
              }}
              className="btn-secondary flex-1"
            >
              Discard
            </button>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
