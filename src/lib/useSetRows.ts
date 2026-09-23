import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createSetRow,
  deleteSetRow,
  renumberSets,
  updateSetRow,
  type LastTimeEntry,
  type SetValues,
} from './sessionSets';
import type { SessionExercise, SetEntry, SetType } from '../db/types';

// On-screen set rows for every exercise in a session.
//
// A row is either REAL (setId points at a `sets` row, written the moment the
// user typed into it or checked it) or a GHOST (no row; its placeholder is
// last time's set in the same position). Ghost rows live only here, so an
// untouched ghost is never saved. Row state is kept per exercise at screen
// level, so closing one card to open another keeps what was typed.

export interface Row {
  key: string;
  setId: string | null;
  ghost: SetValues | null; // placeholder values; null = no history to show
  setType: SetType; // the unit the row is logged in (reps or seconds)
  // Checked via the circle on a ghost ("same as last time"). Tapping the
  // circle again reverts it to a ghost rather than just unchecking.
  fromGhost: boolean;
  // What the user has typed, kept as text so a half-typed number survives.
  draft: { weight?: string; reps?: string };
}

const BLANK_ROWS = 3;

let keySeq = 0;
const newKey = () => `row-${++keySeq}`;

function ghostOf(s: SetEntry | undefined): SetValues | null {
  if (!s) return null;
  return {
    weight: s.weight,
    reps: s.reps,
    set_type: s.set_type,
    duration_seconds: s.duration_seconds,
  };
}

function realRow(s: SetEntry): Row {
  return { key: newKey(), setId: s.id, ghost: null, setType: s.set_type, fromGhost: false, draft: {} };
}

function ghostRow(g: SetValues | null): Row {
  return { key: newKey(), setId: null, ghost: g, setType: g?.set_type ?? 'reps', fromGhost: false, draft: {} };
}

// Open exercise: real rows at their set positions, ghosts from last time in
// the gaps, as many rows as last time had (three blank rows with no history).
// Finished exercise: real rows only.
export function initialRows(
  link: SessionExercise,
  sets: SetEntry[],
  lastTime: LastTimeEntry | undefined,
): Row[] {
  const real = sets.slice().sort((a, b) => a.set_number - b.set_number);
  if (link.finished_order != null) return real.map(realRow);
  const template = lastTime?.sets ?? [];
  const count = Math.max(
    template.length || (real.length === 0 ? BLANK_ROWS : 0),
    real.length,
    real.reduce((m, s) => Math.max(m, s.set_number), 0),
  );
  const slots: (SetEntry | null)[] = Array(count).fill(null);
  const overflow: SetEntry[] = [];
  for (const s of real) {
    const i = s.set_number - 1;
    if (i >= 0 && i < count && !slots[i]) slots[i] = s;
    else overflow.push(s);
  }
  for (const s of overflow) {
    const free = slots.indexOf(null);
    if (free >= 0) slots[free] = s;
    else slots.push(s);
  }
  return slots.map((s, i) =>
    s ? realRow(s) : ghostRow(ghostOf(template[i] ?? template[template.length - 1])),
  );
}

const num = (t: string) => {
  const n = parseFloat(t);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

export function useSetRows(onToast: (msg: string) => void) {
  const [rows, setRows] = useState<Record<string, Row[]>>({});
  const rowsRef = useRef(rows);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  // One write chain per row, so a create always lands before the updates
  // that follow it (fast typing can't create the same set twice).
  const chains = useRef(new Map<string, Promise<unknown>>());
  const enqueue = useCallback((key: string, job: () => Promise<unknown>) => {
    const next = (chains.current.get(key) ?? Promise.resolve()).then(job, job);
    chains.current.set(key, next);
    return next;
  }, []);
  const settle = useCallback(
    async (linkId: string) => {
      const keys = (rowsRef.current[linkId] ?? []).map((r) => r.key);
      await Promise.all(keys.map((k) => chains.current.get(k)).filter(Boolean));
    },
    [],
  );

  const patchRow = useCallback((linkId: string, key: string, patch: Partial<Row>) => {
    setRows((all) => {
      const list = all[linkId];
      if (!list) return all;
      const next = { ...all, [linkId]: list.map((r) => (r.key === key ? { ...r, ...patch } : r)) };
      rowsRef.current = next;
      return next;
    });
  }, []);

  const setLinkRows = useCallback((linkId: string, list: Row[] | undefined) => {
    setRows((all) => {
      const next = { ...all };
      if (list) next[linkId] = list;
      else delete next[linkId];
      rowsRef.current = next;
      return next;
    });
  }, []);

  const find = useCallback((linkId: string, key: string) => {
    const list = rowsRef.current[linkId] ?? [];
    const index = list.findIndex((r) => r.key === key);
    return { row: list[index] as Row | undefined, index };
  }, []);

  // Typing into a row. A ghost becomes real on the first keystroke, taking
  // last time's value for the field that wasn't typed.
  // `ghost` overrides the row's own placeholder values when the screen derives
  // them from something else (calf raises borrowing today's squat load).
  const type = useCallback(
    (linkId: string, key: string, field: 'weight' | 'reps', text: string, ghost?: SetValues | null) => {
      const { row } = find(linkId, key);
      if (!row) return;
      patchRow(linkId, key, { draft: { ...row.draft, [field]: text }, fromGhost: false });
      void enqueue(key, async () => {
        const { row: r, index } = find(linkId, key);
        if (!r) return;
        const value = num(text);
        const durationRow = r.setType === 'duration';
        if (!r.setId) {
          const base = ghost ?? r.ghost;
          const values: SetValues = {
            weight: field === 'weight' ? value : (base?.weight ?? 0),
            reps: field === 'reps' && !durationRow ? value : (base?.reps ?? 0),
            set_type: r.setType,
            duration_seconds:
              field === 'reps' && durationRow ? value : (base?.duration_seconds ?? null),
          };
          const id = await createSetRow(linkId, index + 1, values, false);
          patchRow(linkId, key, { setId: id });
        } else if (field === 'weight') {
          await updateSetRow(r.setId, { weight: value });
        } else if (durationRow) {
          await updateSetRow(r.setId, { duration_seconds: value });
        } else {
          await updateSetRow(r.setId, { reps: value });
        }
      });
    },
    [enqueue, find, patchRow],
  );

  // The circle. Checked → unchecked (a "same as last time" row goes back to
  // a ghost). Typed → checked. Ghost → "same as last time", if allowed.
  const check = useCallback(
    async (
      linkId: string,
      key: string,
      current: SetEntry | undefined,
      oneTap: boolean,
      ghostOverride?: SetValues | null,
    ) => {
      const { row } = find(linkId, key);
      if (!row) return;
      if (row.setId && current?.completed) {
        if (row.fromGhost) {
          await enqueue(key, () => deleteSetRow(row.setId as string));
          patchRow(linkId, key, { setId: null, fromGhost: false, draft: {} });
        } else {
          await enqueue(key, () => updateSetRow(row.setId as string, { completed: false }));
        }
        return;
      }
      if (row.setId) {
        await enqueue(key, () => updateSetRow(row.setId as string, { completed: true }));
        return;
      }
      // Ghost row. A typed-but-not-yet-saved row goes through the chain.
      if (row.draft.weight !== undefined || row.draft.reps !== undefined) {
        await chains.current.get(key);
        const again = find(linkId, key).row;
        if (again?.setId) await enqueue(key, () => updateSetRow(again.setId as string, { completed: true }));
        return;
      }
      const ghost = ghostOverride ?? row.ghost;
      if (!oneTap || !ghost) {
        onToast('Type the set first');
        return;
      }
      await enqueue(key, async () => {
        const { index } = find(linkId, key);
        const id = await createSetRow(linkId, index + 1, { ...ghost, set_type: row.setType }, true);
        patchRow(linkId, key, { setId: id, fromGhost: true });
      });
      onToast('Same as last time');
    },
    [enqueue, find, onToast, patchRow],
  );

  // The × (or a left swipe).
  const remove = useCallback(
    async (linkId: string, key: string) => {
      await chains.current.get(key);
      const { row } = find(linkId, key);
      if (!row) return;
      if (row.setId) await deleteSetRow(row.setId);
      const rest = (rowsRef.current[linkId] ?? []).filter((r) => r.key !== key);
      setLinkRows(linkId, rest);
      await renumberSets(rest.filter((r) => r.setId).map((r) => r.setId as string));
    },
    [find, setLinkRows],
  );

  // "+ Add set": a ghost that repeats the row above it.
  const addRow = useCallback(
    (linkId: string, setsById: Map<string, SetEntry>) => {
      const list = rowsRef.current[linkId] ?? [];
      const last = list[list.length - 1];
      let ghost: SetValues | null = last?.ghost ?? null;
      if (last?.setId) ghost = ghostOf(setsById.get(last.setId)) ?? ghost;
      setLinkRows(linkId, [...list, ghostRow(ghost)]);
    },
    [setLinkRows],
  );

  // The reps / sec label toggles the row's unit.
  const toggleUnit = useCallback(
    async (linkId: string, key: string) => {
      const { row } = find(linkId, key);
      if (!row) return;
      const setType: SetType = row.setType === 'reps' ? 'duration' : 'reps';
      patchRow(linkId, key, { setType, draft: { ...row.draft, reps: undefined } });
      if (row.setId) {
        await enqueue(key, () =>
          updateSetRow(row.setId as string, {
            set_type: setType,
            duration_seconds: setType === 'duration' ? 0 : null,
            reps: 0,
          }),
        );
      }
    },
    [enqueue, find, patchRow],
  );

  // Latest rows for one exercise (not the render-time snapshot).
  const getRows = useCallback((linkId: string) => rowsRef.current[linkId] ?? [], []);

  return { rows, getRows, setLinkRows, type, check, remove, addRow, toggleUnit, settle };
}
