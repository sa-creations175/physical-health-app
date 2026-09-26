import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AUTOSAVED_NOTICES_EVENT,
  dismissAutoSavedNotice,
  readAutoSavedNotices,
  type AutoSavedNotice,
} from '../../lib/sessionSets';
import type { GoalNames } from '../../lib/goalNames';
import type { RingKey } from '../../lib/bodySignals';

// Inside the Fitness Score card, above Start a session
// (body-goals-merged-proto.html): one line per session the app saved on your
// behalf, "Monday's Lower Body was saved with 2 exercises." "Edit" opens it;
// "Looks right" dismisses it. Either way it doesn't come back. The session
// type reads with its own name, renamed or built in.
export default function AutoSavedNotices({ names }: { names?: Record<RingKey, GoalNames> }) {
  const navigate = useNavigate();
  const [notices, setNotices] = useState<AutoSavedNotice[]>(() => readAutoSavedNotices());

  useEffect(() => {
    const refresh = () => setNotices(readAutoSavedNotices());
    window.addEventListener(AUTOSAVED_NOTICES_EVENT, refresh);
    return () => window.removeEventListener(AUTOSAVED_NOTICES_EVENT, refresh);
  }, []);

  if (notices.length === 0) return null;
  return (
    <div className="mt-2 space-y-1.5">
      {notices.map((n) => (
        <div
          key={n.sessionId}
          className="rounded-input border border-green-300 bg-white px-2.5 py-1.5 text-[12px] text-ink leading-snug"
        >
          <Line notice={n} names={names} />{' '}
          <button
            type="button"
            onClick={() => {
              dismissAutoSavedNotice(n.sessionId);
              navigate(`/log/strength/active/${n.sessionId}`);
            }}
            className="font-bold text-green-700"
          >
            Edit
          </button>
          <span className="text-hint"> · </span>
          <button type="button" onClick={() => dismissAutoSavedNotice(n.sessionId)} className="text-muted">
            Looks right
          </button>
        </div>
      ))}
    </div>
  );
}

function Line({ notice, names }: { notice: AutoSavedNotice; names?: Record<RingKey, GoalNames> }) {
  if (notice.date && notice.type && notice.kept !== undefined) {
    const weekday = new Date(notice.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
    const kept = notice.kept;
    return (
      <>
        <b className="font-bold">
          {weekday}’s {names?.[notice.type].heading ?? ''}
        </b>{' '}
        was saved with {kept} exercise{kept === 1 ? '' : 's'}.
      </>
    );
  }
  // A notice saved before this build carries only its text.
  return <>{notice.text.replace(/\s*Tap to edit$/, '')}</>;
}
