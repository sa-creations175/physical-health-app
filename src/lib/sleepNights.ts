// Turning HealthKit sleep samples into nights. Pure, so it can be checked
// without a phone.
//
// The rules:
//   - Only the asleep stages count as sleep: core, deep, REM and plain
//     "asleep" (no stage). In bed and awake never count.
//   - A night belongs to the morning it ends. Every asleep stretch that STARTS
//     between 6 PM the evening before and noon on day D belongs to night D. So
//     a night broken by waking up at 3 AM is still one night: both halves
//     start inside the window and add up.
//   - Sleep that starts between noon and 6 PM on day D is a nap. It's kept
//     apart (nap_minutes on night D) and never added to the night.
//   - Several apps can write sleep for the same night (the Watch, a third-party
//     tracker, an older phone). Adding them up would double count, so each
//     night is counted from ONE source. A source that recorded sleep stages
//     (core, deep, REM: the Apple Watch, or a stage-aware tracker) is preferred
//     over one that only says "asleep"; among those, the one with the most
//     asleep time wins. Overlaps within that source are merged.
import type { SleepSample } from 'capacitor-health';
import type { SleepNight } from '../db/types';
import { addDaysISO } from './dateHelpers';

const IN_BED = 0;
const ASLEEP_UNSPECIFIED = 1;
const AWAKE = 2;
const CORE = 3;
const DEEP = 4;
const REM = 5;
const ASLEEP = new Set([ASLEEP_UNSPECIFIED, CORE, DEEP, REM]);

const NIGHT_STARTS_HOUR = 18; // 6 PM the evening before
const NIGHT_ENDS_HOUR = 12; // noon: later starts are naps
const MINUTE = 60_000;

interface Span {
  start: number; // ms
  end: number; // ms
}

function localTime(date: string, hour: number): number {
  const d = new Date(date + 'T00:00:00');
  d.setHours(hour, 0, 0, 0);
  return d.getTime();
}

// Total minutes covered by spans, counting any overlap once.
function unionMinutes(spans: Span[]): number {
  const sorted = spans.filter((s) => s.end > s.start).sort((a, b) => a.start - b.start);
  let total = 0;
  let cur: Span | null = null;
  for (const s of sorted) {
    if (!cur || s.start > cur.end) {
      if (cur) total += cur.end - cur.start;
      cur = { ...s };
    } else if (s.end > cur.end) {
      cur.end = s.end;
    }
  }
  if (cur) total += cur.end - cur.start;
  return Math.round(total / MINUTE);
}

const span = (s: SleepSample): Span => ({ start: Date.parse(s.startDate), end: Date.parse(s.endDate) });
const sourceKey = (s: SleepSample) => `${s.sourceBundleId}|${s.sourceName}`;

// The asleep samples of the one source the night is counted from: sources
// with stages first, then the most asleep time.
function pickSource(asleep: SleepSample[]): { key: string; samples: SleepSample[] } | null {
  const bySource = new Map<string, SleepSample[]>();
  for (const s of asleep) {
    const k = sourceKey(s);
    bySource.set(k, [...(bySource.get(k) ?? []), s]);
  }
  let best: { key: string; samples: SleepSample[]; minutes: number; staged: boolean } | null = null;
  for (const [key, samples] of bySource) {
    const minutes = unionMinutes(samples.map(span));
    const staged = samples.some((s) => s.value === CORE || s.value === DEEP || s.value === REM);
    if (
      !best ||
      (staged && !best.staged) ||
      (staged === best.staged && minutes > best.minutes)
    ) {
      best = { key, samples, minutes, staged };
    }
  }
  return best && best.minutes > 0 ? { key: best.key, samples: best.samples } : null;
}

// One SleepNight (without user_id / updated_at) per morning in `dates` that has
// any sleep, night or nap.
export function computeNights(
  samples: SleepSample[],
  dates: string[],
): Omit<SleepNight, 'user_id' | 'updated_at'>[] {
  const out: Omit<SleepNight, 'user_id' | 'updated_at'>[] = [];
  for (const date of dates) {
    const nightFrom = localTime(addDaysISO(date, -1), NIGHT_STARTS_HOUR);
    const nightTo = localTime(date, NIGHT_ENDS_HOUR);
    const napTo = localTime(date, NIGHT_STARTS_HOUR);
    const startsIn = (s: SleepSample, from: number, to: number) => {
      const t = Date.parse(s.startDate);
      return t >= from && t < to;
    };

    const asleepNight = samples.filter((s) => ASLEEP.has(s.value) && startsIn(s, nightFrom, nightTo));
    const asleepNap = samples.filter((s) => ASLEEP.has(s.value) && startsIn(s, nightTo, napTo));
    const night = pickSource(asleepNight);
    const nap = pickSource(asleepNap);
    const napMinutes = nap ? unionMinutes(nap.samples.map(span)) : 0;
    if (!night && napMinutes === 0) continue;

    let asleep = 0;
    let core = 0;
    let deep = 0;
    let rem = 0;
    let unspecified = 0;
    let awake = 0;
    let first = '';
    let last = '';
    let sourceName = '';
    let sourceBundleId = '';
    if (night) {
      const spans = night.samples.map(span);
      asleep = unionMinutes(spans);
      const stage = (v: number) =>
        unionMinutes(night.samples.filter((s) => s.value === v).map(span));
      core = stage(CORE);
      deep = stage(DEEP);
      rem = stage(REM);
      unspecified = stage(ASLEEP_UNSPECIFIED);
      const startMs = Math.min(...spans.map((s) => s.start));
      const endMs = Math.max(...spans.map((s) => s.end));
      first = new Date(startMs).toISOString();
      last = new Date(endMs).toISOString();
      // Awake stretches from the same source, between falling asleep and waking.
      awake = unionMinutes(
        samples
          .filter((s) => s.value === AWAKE && sourceKey(s) === night.key)
          .map(span)
          .map((s) => ({ start: Math.max(s.start, startMs), end: Math.min(s.end, endMs) })),
      );
      sourceName = night.samples[0].sourceName;
      sourceBundleId = night.samples[0].sourceBundleId;
    }
    const inBedSpans = samples.filter((s) => s.value === IN_BED && startsIn(s, nightFrom, nightTo)).map(span);

    out.push({
      id: `night-${date}`,
      date,
      asleep_minutes: asleep,
      core_minutes: core,
      deep_minutes: deep,
      rem_minutes: rem,
      unspecified_minutes: unspecified,
      awake_minutes: awake,
      in_bed_minutes: inBedSpans.length ? unionMinutes(inBedSpans) : null,
      sleep_start: first,
      sleep_end: last,
      nap_minutes: napMinutes,
      source_name: sourceName,
      source_bundle_id: sourceBundleId,
    });
  }
  return out;
}
