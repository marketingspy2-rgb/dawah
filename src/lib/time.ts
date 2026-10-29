export const HOUR = 3600_000;
export const DAY = 24 * HOUR;

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(tz: string) {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric" });
    formatters.set(tz, f);
  }
  return f;
}

/** Calendar parts of an instant as seen in a time zone. `wd` is 0 = Sunday. */
export function zonedParts(ms: number, tz: string) {
  const p: Record<string, number> = {};
  for (const part of formatter(tz).formatToParts(new Date(ms))) if (part.type !== "literal") p[part.type] = Number(part.value);
  const wd = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
  return { y: p.year, m: p.month, d: p.day, h: p.hour % 24, min: p.minute, wd };
}

/** The instant when a local wall-clock time happens in a time zone. */
export function zonedToUtc(y: number, m: number, d: number, h: number, tz: string) {
  const guess = Date.UTC(y, m - 1, d, h);
  const p = zonedParts(guess, tz);
  const offset = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min) - guess;
  return guess - offset;
}

/** First slot at or after `fromMs` on one of `days` (local weekdays) at `hour` local time. */
export function nextSlot(fromMs: number, tz: string, days: number[], hour: number): number | null {
  if (!days.length) return null;
  for (let i = 0; i < 15; i++) {
    const p = zonedParts(fromMs + i * DAY, tz);
    if (!days.includes(p.wd)) continue;
    const at = zonedToUtc(p.y, p.m, p.d, hour, tz);
    if (at >= fromMs) return at;
  }
  return null;
}
