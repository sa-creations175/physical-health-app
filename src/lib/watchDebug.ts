// TEMPORARY debug tooling for the Apple Watch auto-import (Build 2.9).
//
// The startup import runs before Settings is ever opened, so console logs
// aren't visible without Xcode attached. This persists a small ring buffer of
// log lines to localStorage; the "Watch import log" panel in Settings renders
// them. Remove once the import is confirmed working — same as the earlier
// syncDebug cleanup.

const LOG_KEY = 'ph_watch_import_log';
const MAX_LINES = 200;

export function logWatch(line: string): void {
  const stamped = `${new Date().toLocaleTimeString()}  ${line}`;
  // eslint-disable-next-line no-console
  console.log('[watch-import]', line);
  try {
    const lines = getWatchLog();
    lines.push(stamped);
    localStorage.setItem(LOG_KEY, JSON.stringify(lines.slice(-MAX_LINES)));
  } catch {
    /* logging must never throw */
  }
}

export function getWatchLog(): string[] {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function clearWatchLog(): void {
  try {
    localStorage.removeItem(LOG_KEY);
  } catch {
    /* ignore */
  }
}
