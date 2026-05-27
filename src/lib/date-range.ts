import {
  endOfDay,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  subMonths,
} from "date-fns";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";

export type DatePreset =
  | "today"
  | "week"
  | "month"
  | "last_month"
  | "quarter"
  | "custom";

export const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  today: "今日",
  week: "本週",
  month: "本月",
  last_month: "前一月",
  quarter: "本季",
  custom: "自訂",
};

export const DATE_PRESETS: DatePreset[] = [
  "today",
  "week",
  "month",
  "last_month",
  "quarter",
  "custom",
];

export const DEFAULT_DATE_PRESET: DatePreset = "month";

const SLASH_DATE_RE = /^(\d{4})\/(\d{2})\/(\d{2})$/;

export function formatSlashDate(date: Date): string {
  return format(date, "yyyy/MM/dd", { locale: zhTW });
}

export function parseSlashDate(value: string): Date | null {
  const match = value.trim().match(SLASH_DATE_RE);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export function isValidSlashDate(value: string): boolean {
  return parseSlashDate(value) !== null;
}

export function getPresetRange(
  preset: Exclude<DatePreset, "custom">,
  baseDate = new Date()
): { from: Date; to: Date } {
  switch (preset) {
    case "today":
      return { from: startOfDay(baseDate), to: endOfDay(baseDate) };
    case "week":
      return {
        from: startOfWeek(baseDate, { weekStartsOn: 1 }),
        to: endOfWeek(baseDate, { weekStartsOn: 1 }),
      };
    case "month":
      return {
        from: startOfMonth(baseDate),
        to: endOfMonth(baseDate),
      };
    case "last_month": {
      const prev = subMonths(baseDate, 1);
      return {
        from: startOfMonth(prev),
        to: endOfMonth(prev),
      };
    }
    case "quarter":
      return {
        from: startOfQuarter(baseDate),
        to: endOfQuarter(baseDate),
      };
  }
}

export function resolveDateRange(params: {
  date_preset?: string;
  date_from?: string;
  date_to?: string;
}): { preset: DatePreset; from: Date; to: Date } {
  const preset = (params.date_preset as DatePreset) ?? DEFAULT_DATE_PRESET;

  if (preset !== "custom") {
    const range = getPresetRange(preset);
    return { preset, ...range };
  }

  const from = params.date_from ? parseSlashDate(params.date_from) : null;
  const to = params.date_to ? parseSlashDate(params.date_to) : null;

  if (from && to) {
    return { preset, from: startOfDay(from), to: endOfDay(to) };
  }

  const fallback = getPresetRange(DEFAULT_DATE_PRESET);
  return { preset: DEFAULT_DATE_PRESET, ...fallback };
}

export function toCreatedAtBounds(from: Date, to: Date) {
  return {
    from: startOfDay(from).toISOString(),
    to: endOfDay(to).toISOString(),
  };
}

export function getDefaultDateParams(): Record<string, string> {
  const { from, to } = getPresetRange(DEFAULT_DATE_PRESET);
  return {
    date_preset: DEFAULT_DATE_PRESET,
    date_from: formatSlashDate(from),
    date_to: formatSlashDate(to),
  };
}
