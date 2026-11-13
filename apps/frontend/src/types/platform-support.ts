export const supportStatuses = ["OPEN", "IN_PROGRESS", "RESOLVED"] as const;
export const supportPriorities = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
export type SupportStatus = (typeof supportStatuses)[number];
export type SupportPriority = (typeof supportPriorities)[number];
export type SupportAction = "SET_STATUS" | "SET_PRIORITY" | "CLAIM" | "RELEASE";

export type SupportTicket = {
  id: string;
  schoolId: string;
  school: { id: string; name: string; code: string };
  title: string;
  description: string;
  status: SupportStatus;
  priority: SupportPriority;
  createdById: string;
  assigneeId: string | null;
  version: number;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SupportEvent = {
  id: string;
  actorUserId: string;
  action: string;
  fromValue: string | null;
  toValue: string | null;
  createdAt: string;
};

export type SupportTicketDetail = SupportTicket & { events: SupportEvent[] };
export type SupportTicketPage = { data: SupportTicket[]; nextCursor: string | null };
