export const TAIPEI_TIME_ZONE = "Asia/Taipei";

type TaipeiDateParts = {
  year: number;
  month: number;
  day: number;
};

type TaipeiDateTimeParts = TaipeiDateParts & {
  hour: number;
  minute: number;
};

const taipeiDateTimePartsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TAIPEI_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function toDate(value: Date | string | number): Date {
  return value instanceof Date ? value : new Date(value);
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function partValue(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes
): number {
  const value = parts.find((part) => part.type === type)?.value;
  return value ? Number(value) : 0;
}

export function getTaipeiDateTimeParts(
  value: Date | string | number = new Date()
): TaipeiDateTimeParts {
  const parts = taipeiDateTimePartsFormatter.formatToParts(toDate(value));
  return {
    year: partValue(parts, "year"),
    month: partValue(parts, "month"),
    day: partValue(parts, "day"),
    hour: partValue(parts, "hour"),
    minute: partValue(parts, "minute"),
  };
}

export function getTaipeiCalendarDate(
  value: Date | string | number = new Date()
): Date {
  const { year, month, day } = getTaipeiDateTimeParts(value);
  return new Date(year, month - 1, day);
}

export function formatTaipeiDateOnly(value: Date | string | number): string {
  const { year, month, day } = getTaipeiDateTimeParts(value);
  return `${year}/${pad2(month)}/${pad2(day)}`;
}

export function formatTaipeiDateTime(value: Date | string | number): string {
  const { year, month, day, hour, minute } = getTaipeiDateTimeParts(value);
  return `${year}/${pad2(month)}/${pad2(day)} ${pad2(hour)}:${pad2(minute)}`;
}

export function formatTaipeiMonthKey(value: Date | string | number): string {
  const { year, month } = getTaipeiDateTimeParts(value);
  return `${year}/${pad2(month)}`;
}

export function formatTaipeiFilenameTimestamp(
  value: Date | string | number = new Date()
): string {
  const { year, month, day, hour, minute } = getTaipeiDateTimeParts(value);
  return `${year}${pad2(month)}${pad2(day)}-${pad2(hour)}${pad2(minute)}`;
}

export function toTaipeiDayBoundsIso(date: Date): { from: string; to: string } {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  return {
    from: new Date(Date.UTC(year, month, day, -8, 0, 0, 0)).toISOString(),
    to: new Date(Date.UTC(year, month, day + 1, -8, 0, 0, -1)).toISOString(),
  };
}
