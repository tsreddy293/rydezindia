import type { ActionPriority } from "@/lib/admin/dashboard-types";

export const PRIORITY_STYLES: Record<
  ActionPriority,
  { border: string; bg: string; text: string; badge: string; dot: string }
> = {
  urgent: {
    border: "border-red-200",
    bg: "bg-red-50",
    text: "text-red-800",
    badge: "bg-red-100 text-red-700",
    dot: "bg-red-500",
  },
  high: {
    border: "border-orange-200",
    bg: "bg-orange-50",
    text: "text-orange-800",
    badge: "bg-orange-100 text-orange-700",
    dot: "bg-orange-500",
  },
  medium: {
    border: "border-amber-200",
    bg: "bg-amber-50",
    text: "text-amber-800",
    badge: "bg-amber-100 text-amber-700",
    dot: "bg-amber-400",
  },
  completed: {
    border: "border-emerald-200",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    badge: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
  },
};

export function priorityLabel(priority: ActionPriority): string {
  const labels: Record<ActionPriority, string> = {
    urgent: "Urgent",
    high: "High",
    medium: "Medium",
    completed: "Done",
  };
  return labels[priority];
}
