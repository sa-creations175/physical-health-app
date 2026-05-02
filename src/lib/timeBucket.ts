// Single source of truth for the morning/afternoon/evening/late-night
// labels that cardio_logs render with. The bucket is *computed*, never
// stored alongside the timestamp — same input always produces the same
// label, and edits to the boundaries (this file) flow everywhere they're
// shown.
//
// Boundaries (locked Build 2.1):
//   Morning      05:00 – 11:59
//   Afternoon    12:00 – 17:59
//   Evening      18:00 – 23:59
//   Late night   00:00 – 04:59

export type TimeBucket = 'morning' | 'afternoon' | 'evening' | 'late_night';

const BUCKET_LABELS: Record<TimeBucket, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  late_night: 'Late night',
};

export function timeBucketFor(d: Date): TimeBucket {
  const h = d.getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'afternoon';
  if (h >= 18 && h < 24) return 'evening';
  return 'late_night'; // 00:00 – 04:59
}

export function timeBucketLabel(d: Date): string {
  return BUCKET_LABELS[timeBucketFor(d)];
}

// Capitalized companion to dateHelpers.relativeDateLabel — the cardio
// logger's date field reads "Today", "Yesterday", or "Mon, Apr 28",
// which differs from the dashboard's lowercase "today" / "yesterday"
// micro-copy. Kept separate to avoid a flag-per-callsite.
export function cardioDateLabel(isoDate: string, ref: Date = new Date()): string {
  const then = new Date(isoDate + 'T00:00:00');
  const refMid = new Date(ref);
  refMid.setHours(0, 0, 0, 0);
  const diffDays = Math.round((refMid.getTime() - then.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return then.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// "h:mm AM/PM" — used as the time field's default value display.
export function clockLabel(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
