import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import {
  AUTOSAVED_NOTICES_EVENT,
  dismissAutoSavedNotice,
  readAutoSavedNotices,
  type AutoSavedNotice,
} from '../../lib/sessionSets';

// One notice per session the app saved on the user's behalf ("Monday's Lower
// Body was saved with 2 exercises. Tap to edit"). Tap to edit it; × to dismiss.
// Either way it doesn't come back.
export default function AutoSavedNotices() {
  const navigate = useNavigate();
  const [notices, setNotices] = useState<AutoSavedNotice[]>(() => readAutoSavedNotices());

  useEffect(() => {
    const refresh = () => setNotices(readAutoSavedNotices());
    window.addEventListener(AUTOSAVED_NOTICES_EVENT, refresh);
    return () => window.removeEventListener(AUTOSAVED_NOTICES_EVENT, refresh);
  }, []);

  if (notices.length === 0) return null;
  return (
    <div className="space-y-2">
      {notices.map((n) => (
        <div key={n.sessionId} className="tile flex items-center gap-2 pl-4 pr-1">
          <button
            type="button"
            onClick={() => {
              dismissAutoSavedNotice(n.sessionId);
              navigate(`/log/strength/active/${n.sessionId}`);
            }}
            className="flex-1 text-left text-label text-green-900 py-3"
          >
            {n.text}
          </button>
          <button
            type="button"
            onClick={() => dismissAutoSavedNotice(n.sessionId)}
            aria-label="Dismiss"
            className="w-11 h-11 flex items-center justify-center text-hint shrink-0"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>
      ))}
    </div>
  );
}
