import type { ActivityEvent } from "./repository/types";

export function isUrgent(event: ActivityEvent): boolean {
  return event.kind === "ticket_new" && event.priority === "urgent";
}

export function isUnread(event: ActivityEvent): boolean {
  return event.readAt === null;
}
