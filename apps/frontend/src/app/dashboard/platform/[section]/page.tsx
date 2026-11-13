import { notFound } from "next/navigation";
import { PlatformPreview } from "@/components/platform-preview";
import { isPlatformPage } from "@/lib/platform-pages";

export default async function PlatformPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!isPlatformPage(section)) notFound();
  return <PlatformPreview page={section} />;
}
