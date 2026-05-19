// All dates handled as ISO strings (YYYY-MM-DD, local time) or full ISO datetimes.
// Week starts Sunday — matches the user's training-week convention. The week
// number shown in the dashboard subline is therefore US-style (week 1 contains
// Jan 1; weeks run Sun → Sat) rather than ISO 8601.

function toISODateLocal(d: Date): string {
  return d.toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
}

export function todayISODate(): string {
  return toISODateLocal(new Date());
}

export function startOfWeekISODate(d: Date = new Date()): string {
  const day = d.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const sunday = new Date(d);
  sunday.setDate(d.getDate() - day);
  sunday.setHours(0, 0, 0, 0);
  return toISODateLocal(sunday);
}

export function weekNumber(d: Date = new Date()): number {
  // US-style: week 1 contains Jan 1; weeks start Sunday.
  // Use UTC date math to stay DST-safe (both anchors at UTC midnight).
  const year = d.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const days = Math.round(
    (Date.UTC(year, d.getMonth(), d.getDate()) - Date.UTC(year, 0, 1)) / 86400000,
  );
  return Math.ceil((days + jan1.getDay() + 1) / 7);
}

export function dayName(d: Date = new Date()): string {
  return d.toLocaleDateString('en-US', { weekday: 'long' });
}

export function dateLabel(d: Date = new Date()): string {
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function shortDayLabel(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

export function narrowDayLabel(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'narrow' });
}

// Short weekday + month + day for inline context lines (e.g. the
// repeat-last-session panel: "Mon Apr 28"). No comma between weekday
// and date — the default locale rendering would emit "Mon, Apr 28";
// we trim the comma to keep the line tight in dense surfaces.
export function shortDateLabel(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00');
  return d
    .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    .replace(',', '');
}

export function addDaysISO(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toISODateLocal(d);
}

export function relativeDateLabel(isoDate: string, ref: Date = new Date()): string {
  const then = new Date(isoDate + 'T00:00:00');
  const refMid = new Date(ref);
  refMid.setHours(0, 0, 0, 0);
  const diffDays = Math.round((refMid.getTime() - then.getTime()) / 86400000);
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays > 1 && diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// 12h clock time-of-day label for the Resume badge ("2:14 PM"). Skips
// leading-zero on the hour and uppercases AM/PM so it reads naturally
// next to "started …" in the muted secondary line.
export function timeOfDayLabel(iso: string): string {
  return new Date(iso)
    .toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    .toUpperCase();
}

export function currentWeekISODates(today: Date = new Date()): string[] {
  // Returns 7 dates Sun → Sat of the week containing `today`.
  const startISO = startOfWeekISODate(today);
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    dates.push(addDaysISO(startISO, i));
  }
  return dates;
}
