// All dates handled as ISO strings (YYYY-MM-DD, local time) or full ISO datetimes.
// Week starts Monday — matches the ISO week number shown in the dashboard subline.

function toISODateLocal(d: Date): string {
  return d.toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
}

export function todayISODate(): string {
  return toISODateLocal(new Date());
}

export function startOfWeekISODate(d: Date = new Date()): string {
  const day = d.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return toISODateLocal(monday);
}

export function isoWeekNumber(d: Date = new Date()): number {
  const target = new Date(d.valueOf());
  const dayNum = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNum + 3);
  const firstThursdayMs = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursdayMs - target.valueOf()) / 604800000);
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

export function last7DaysISODates(today: Date = new Date()): string[] {
  const dates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dates.push(toISODateLocal(d));
  }
  return dates;
}

export function addDaysISO(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toISODateLocal(d);
}
