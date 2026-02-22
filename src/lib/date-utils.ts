import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import { it } from "date-fns/locale";

export function timeAgo(date: string | Date | null | undefined): string {
  if (!date) return "Mai";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "Mai";
  return formatDistanceToNow(d, { locale: it, addSuffix: true });
}

export function smartDate(date: string | Date | null | undefined): string {
  if (!date) return "Mai";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "Mai";
  if (isToday(d)) return `Oggi, ${format(d, "HH:mm", { locale: it })}`;
  if (isYesterday(d)) return `Ieri, ${format(d, "HH:mm", { locale: it })}`;
  return format(d, "d MMM yyyy", { locale: it });
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";
  return format(d, "d MMM yyyy", { locale: it });
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";
  return format(d, "d MMM yyyy, HH:mm", { locale: it });
}
