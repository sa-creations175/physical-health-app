// Tiny in-memory pub/sub log buffer for surfacing cloud-sync progress in the
// UI (the Settings "Sync debug output" panel) instead of the console — iOS
// Safari has no easy console. Module-level so messages collected during
// startup sync survive until the Settings page mounts and reads them; live
// updates flow to any subscriber. Resets on reload (debug aid, not persisted).

type Listener = (messages: string[]) => void;

let messages: string[] = [];
const listeners = new Set<Listener>();

// Append a line. `data` (optional) is stringified — Error instances and
// Postgrest-style error objects render their message rather than "{}".
export function logSync(label: string, data?: unknown): void {
  let line = label;
  if (data !== undefined) {
    let rendered: string;
    if (typeof data === 'string') {
      rendered = data;
    } else {
      try {
        rendered = JSON.stringify(data, (_key, value) =>
          value instanceof Error
            ? { name: value.name, message: value.message }
            : value,
        );
      } catch {
        rendered = String(data);
      }
    }
    line = `${label} ${rendered}`;
  }
  const ts = new Date().toLocaleTimeString();
  messages = [...messages, `${ts}  ${line}`];
  for (const l of listeners) l(messages);
}

export function getSyncMessages(): string[] {
  return messages;
}

export function subscribeSyncMessages(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
