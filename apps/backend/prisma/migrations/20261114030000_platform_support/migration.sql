ALTER TYPE "PlatformPermission" ADD VALUE 'SUPPORT_READ';
ALTER TYPE "PlatformPermission" ADD VALUE 'SUPPORT_UPDATE';

CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');
CREATE TYPE "SupportTicketPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

CREATE TABLE "platform_support_tickets" (
  "id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "title" VARCHAR(120) NOT NULL,
  "description" VARCHAR(4000) NOT NULL,
  "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
  "priority" "SupportTicketPriority" NOT NULL DEFAULT 'NORMAL',
  "created_by_id" UUID NOT NULL,
  "assignee_id" UUID,
  "version" INTEGER NOT NULL DEFAULT 1,
  "resolved_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "platform_support_tickets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "platform_support_tickets_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "platform_support_tickets_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "platform_support_tickets_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "platform_support_tickets_created_at_id_idx" ON "platform_support_tickets" ("created_at" DESC, "id" DESC);
CREATE INDEX "platform_support_tickets_status_resolved_at_idx" ON "platform_support_tickets" ("status", "resolved_at");

CREATE TABLE "platform_support_ticket_events" (
  "id" UUID NOT NULL,
  "ticket_id" UUID NOT NULL,
  "actor_user_id" UUID NOT NULL,
  "action" VARCHAR(32) NOT NULL,
  "from_value" VARCHAR(64),
  "to_value" VARCHAR(64),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platform_support_ticket_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "platform_support_ticket_events_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "platform_support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "platform_support_ticket_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "platform_support_ticket_events_ticket_id_created_at_id_idx" ON "platform_support_ticket_events" ("ticket_id", "created_at" DESC, "id" DESC);
