import { formatInTimeZone, utcToZonedTime } from 'date-fns-tz';

const MOSCOW_TZ = 'Europe/Moscow';

export const nowInMoscow = () => utcToZonedTime(new Date(), MOSCOW_TZ);

export const formatMoscow = (date: Date) =>
  formatInTimeZone(date, MOSCOW_TZ, "yyyy-MM-dd'T'HH:mm:ssXXX");

export const parseDateOrNull = (value?: string | null) =>
  value ? new Date(value) : null;

export const ensureDate = (value: string | Date | null | undefined) =>
  value ? new Date(value) : null;
