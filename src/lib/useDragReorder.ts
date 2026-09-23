import { useCallback, useEffect, useRef, useState } from 'react';

// Long-press-and-drag reordering for a vertical list of cards whose elements
// have ids `ex-${id}`. While dragging, the held card follows the finger and
// the cards it passes slide out of its way; on release, onDrop gets the new
// order (only when it changed).

const GAP = 12; // px between cards (mt-3)

interface Active {
  id: string;
  startY: number;
  mids: number[];
  from: number;
  height: number;
}

export function useDragReorder(ids: string[], onDrop: (order: string[]) => void) {
  const [drag, setDrag] = useState<{ id: string; dy: number; from: number; to: number; height: number } | null>(null);
  const active = useRef<Active | null>(null);
  const toRef = useRef(0);
  const idsRef = useRef(ids);
  const dropRef = useRef(onDrop);
  useEffect(() => {
    idsRef.current = ids;
    dropRef.current = onDrop;
  });
  // A drag ends with a click on the card under the finger; swallow it.
  const suppressClick = useRef(false);
  const cleanup = useRef<(() => void) | null>(null);

  const move = useCallback((y: number) => {
    const a = active.current;
    if (!a) return;
    const dy = y - a.startY;
    const center = a.mids[a.from] + dy;
    const to = a.mids.filter((m, i) => i !== a.from && m < center).length;
    toRef.current = to;
    setDrag({ id: a.id, dy, from: a.from, to, height: a.height });
  }, []);

  const end = useCallback(() => {
    const a = active.current;
    const to = toRef.current;
    cleanup.current?.();
    cleanup.current = null;
    active.current = null;
    suppressClick.current = true;
    window.setTimeout(() => {
      suppressClick.current = false;
    }, 350);
    setDrag(null);
    if (a && to !== a.from) {
      const order = idsRef.current.filter((x) => x !== a.id);
      order.splice(to, 0, a.id);
      dropRef.current(order);
    }
  }, []);

  const begin = useCallback(
    (id: string, clientY: number) => {
      const list = idsRef.current;
      const from = list.indexOf(id);
      if (from < 0) return;
      const rects = list.map((x) => document.getElementById(`ex-${x}`)?.getBoundingClientRect());
      if (rects.some((r) => !r)) return;
      const mids = rects.map((r) => (r as DOMRect).top + (r as DOMRect).height / 2);
      active.current = { id, startY: clientY, mids, from, height: (rects[from] as DOMRect).height + GAP };
      toRef.current = from;
      setDrag({ id, dy: 0, from, to: from, height: active.current.height });

      const onTouchMove = (e: TouchEvent) => {
        e.preventDefault(); // hold the page still while dragging
        move(e.touches[0].clientY);
      };
      const onMouseMove = (e: MouseEvent) => move(e.clientY);
      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('touchend', end);
      window.addEventListener('touchcancel', end);
      window.addEventListener('mouseup', end);
      cleanup.current = () => {
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('touchend', end);
        window.removeEventListener('touchcancel', end);
        window.removeEventListener('mouseup', end);
      };
    },
    [end, move],
  );

  useEffect(() => () => cleanup.current?.(), []);

  // How far a card is shifted right now.
  const offsetFor = useCallback(
    (id: string): number => {
      if (!drag) return 0;
      if (id === drag.id) return drag.dy;
      const i = idsRef.current.indexOf(id);
      if (i < 0) return 0;
      if (drag.from < drag.to && i > drag.from && i <= drag.to) return -drag.height;
      if (drag.from > drag.to && i >= drag.to && i < drag.from) return drag.height;
      return 0;
    },
    [drag],
  );

  return { dragId: drag?.id ?? null, begin, offsetFor, suppressClick };
}
