/**
 * Scheduling is displayed in the Seller's browser/system timezone, while API
 * timestamps are always sent and stored as UTC instants. This is the same
 * model used by Discount Campaigns, Banners, and Boost Ads.
 */
export const browserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

function instant(value: string | Date): Date {
  if (value instanceof Date) return value;
  const normalized = value.trim().replace(' ', 'T');
  return new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized) ? normalized : `${normalized}Z`);
}

function partsInZone(value: string | Date, timezone: string): Record<string, string> {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant(value));

  return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
}

export function localDateTimeInput(value: string | Date, timezone = browserTimezone()): string {
  const parts = partsInZone(value, timezone);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function utcFromZonedInput(value: string, timezone = browserTimezone()): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return new Date(value).toISOString();

  const [, year, month, day, hour, minute] = match;
  const wanted = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  const actual = partsInZone(new Date(wanted), timezone);
  const displayed = Date.UTC(Number(actual.year), Number(actual.month) - 1, Number(actual.day), Number(actual.hour), Number(actual.minute));
  return new Date(wanted - (displayed - wanted)).toISOString();
}

export function formatLocalSchedule(value?: string | null, timezone = browserTimezone()): string {
  if (!value) return '—';
  try {
    return `${new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: timezone,
    }).format(instant(value))} (${timezone})`;
  } catch {
    return instant(value).toLocaleString();
  }
}
