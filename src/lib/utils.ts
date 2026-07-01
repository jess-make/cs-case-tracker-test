import { formatDistanceToNow, parseISO } from "date-fns";
import { zhTW } from "date-fns/locale";
import {
  formatTaipeiDateOnly,
  formatTaipeiDateTime,
} from "@/lib/taipei-time";

export function formatDate(date: string | null | undefined): string {
  if (!date) return "—";
  return formatTaipeiDateTime(date);
}

export function formatDateOnly(date: string | null | undefined): string {
  if (!date) return "—";
  return formatTaipeiDateOnly(date);
}

export function formatRelative(date: string | null | undefined): string {
  if (!date) return "—";
  return formatDistanceToNow(parseISO(date), { addSuffix: true, locale: zhTW });
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
