import { formatInTimeZone, utcToZonedTime } from 'date-fns-tz';
import { isValid, parse } from 'date-fns';

const MOSCOW_TZ = 'Europe/Moscow';
const DATE_FORMATS = [
  "yyyy-MM-dd'T'HH:mm:ssXXX",
  'dd.MM.yyyy HH:mm:ss',
  'dd.MM.yyyy, HH:mm:ss',
  'dd.MM.yyyy'
];

export const nowInMoscow = () => utcToZonedTime(new Date(), MOSCOW_TZ);

export const formatMoscow = (date: Date) =>
  formatInTimeZone(date, MOSCOW_TZ, "yyyy-MM-dd'T'HH:mm:ssXXX");

export const parseDateOrNull = (value?: string | null) =>
  value ? parseWithFormats(value) : null;

export const ensureDate = (value: string | Date | null | undefined) => {
  if (!value) return null;
  if (value instanceof Date) {
    return isValid(value) ? value : null;
  }
  return parseWithFormats(value);
};

function parseWithFormats(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  for (const format of DATE_FORMATS) {
    const parsed = parse(trimmed, format, new Date());
    if (isValid(parsed)) {
      return parsed;
    }
  }

  const direct = new Date(trimmed);
  return isValid(direct) ? direct : null;
}
