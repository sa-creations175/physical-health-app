import { useEffect, useRef, useState } from 'react';
import { Plane, Rocket, Snail } from 'lucide-react';
import { db } from '../../db/database';
import { syncedUpdate } from '../../db/syncedWrite';
import type { FeelRating, Session } from '../../db/types';

const FEELS: { value: FeelRating; label: string; Icon: typeof Rocket }[] = [
  { value: 'flying', label: 'Flying', Icon: Rocket },
  { value: 'cruising', label: 'Cruising', Icon: Plane },
  { value: 'crawling', label: 'Crawling', Icon: Snail },
];

// "How'd It Go?" on the session summary: an optional feel rating and an
// optional note, each saved as it's tapped or typed. Tapping the selected
// feel again clears it. No confirm step.
export default function FeelAndNote({ session }: { session: Session }) {
  const [noteOpen, setNoteOpen] = useState(() => session.notes.trim() !== '');
  const [note, setNote] = useState(session.notes);
  const timer = useRef<number | null>(null);

  // Save the note a moment after typing stops, and on the way out.
  const pending = useRef<string | null>(null);
  const save = (text: string) =>
    void syncedUpdate(db.sessions, session.id, { notes: text, updated_at: new Date().toISOString() });
  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      if (pending.current !== null) save(pending.current);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  function onNote(text: string) {
    setNote(text);
    pending.current = text;
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      pending.current = null;
      save(text);
    }, 400);
  }

  function pickFeel(value: FeelRating) {
    void syncedUpdate(db.sessions, session.id, {
      feel_rating: session.feel_rating === value ? null : value,
      updated_at: new Date().toISOString(),
    });
  }

  return (
    <div className="mt-3 pt-3 border-t border-hairline">
      <p className="eyebrow">How'd It Go?</p>
      <div className="flex flex-wrap gap-2 mt-2">
        {FEELS.map(({ value, label, Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => pickFeel(value)}
            aria-pressed={session.feel_rating === value}
            className={`pill min-h-[44px] ${session.feel_rating === value ? 'pill-on' : ''}`}
          >
            <Icon aria-hidden="true" size={16} strokeWidth={2} />
            {label}
          </button>
        ))}
      </div>
      {noteOpen ? (
        <textarea
          value={note}
          onChange={(e) => onNote(e.target.value)}
          autoFocus={session.notes.trim() === ''}
          rows={2}
          placeholder="Anything to remember from this session?"
          aria-label="Session note"
          className="input w-full mt-3 p-3 resize-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setNoteOpen(true)}
          className="mt-1 text-label font-bold text-green-700 min-h-[44px]"
        >
          Add a note
        </button>
      )}
    </div>
  );
}
