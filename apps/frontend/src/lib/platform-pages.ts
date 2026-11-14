import type { IconName } from "@/components/ui/icon";

export const platformPages = {
  "create-school-admin": {
    title: "Create school admin",
    description: "Invite an administrator to begin setting up a school.",
  },
  "invitation-status": {
    title: "Invitation status",
    description: "Follow the school administrator invitation and onboarding process.",
  },
  subscriptions: {
    title: "Subscriptions",
    description: "Monitor school subscriptions, trials and upcoming renewals.",
    icon: "clipboard",
  },
  plans: {
    title: "Manage plans",
    description: "Review the plans available to school subscribers.",
  },
  billing: {
    title: "Billing and invoices",
    description: "Review platform billing, invoices and payment follow-up.",
    icon: "wallet",
  },
  users: {
    title: "Platform users",
    description: "Review platform team access and invitations.",
    icon: "users",
  },
  support: {
    title: "Support",
    description: "Review and manage requests from schools.",
    icon: "mail",
  },
  "support-detail": {
    title: "Support ticket detail",
    description: "Review the status and assignment of a support request.",
  },
  "audit-log": {
    title: "Audit log",
    description: "Review platform activity and security events.",
    icon: "file",
  },
  settings: {
    title: "Platform settings",
    description: "Review platform security and operational configuration.",
    icon: "settings",
  },
  "school-setup": {
    title: "School setup",
    description: "Review the school administrator setup workflow.",
    icon: "building",
  },
} satisfies Record<string, { title: string; description: string; icon?: IconName }>;

export type PlatformPage = keyof typeof platformPages;

export function isPlatformPage(value: string): value is PlatformPage {
  return Object.prototype.hasOwnProperty.call(platformPages, value);
}
