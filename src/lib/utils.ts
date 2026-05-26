import { format, formatDistanceToNow, isPast, parseISO } from "date-fns";
import { zhTW } from "date-fns/locale";

export function formatDate(date: string | null | undefined): string {
  if (!date) return "—";
  return format(parseISO(date), "yyyy/MM/dd HH:mm", { locale: zhTW });
}

export function formatRelative(date: string | null | undefined): string {
  if (!date) return "—";
  return formatDistanceToNow(parseISO(date), { addSuffix: true, locale: zhTW });
}

export function isOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate || status === "closed") return false;
  return isPast(parseISO(dueDate));
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
