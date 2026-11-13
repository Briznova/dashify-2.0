import { notFound } from "next/navigation";
import { PlatformPreview } from "@/components/platform-preview";
import { PlatformAuditLog } from "@/components/platform-audit-log";
import { PlatformSettings } from "@/components/platform-settings";
import { PlatformSupport } from "@/components/platform-support";
import { PlatformSchoolAdminCreate } from "@/components/platform-school-admin-create";
import { isPlatformPage } from "@/lib/platform-pages";

export default async function PlatformPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ id?: string | string[] }>;
}) {
  const { section } = await params;
  if (!isPlatformPage(section)) notFound();
  if (section === "audit-log") return <PlatformAuditLog />;
  if (section === "settings") return <PlatformSettings />;
  if (section === "support") return <PlatformSupport />;
  if (section === "create-school-admin") {
    const { id } = await searchParams;
    return <PlatformSchoolAdminCreate initialSchoolId={typeof id === "string" ? id : undefined} />;
  }
  if (section === "support-detail") {
    const { id } = await searchParams;
    return <PlatformSupport ticketId={typeof id === "string" ? id : ""} />;
  }
  return <PlatformPreview page={section} />;
}
