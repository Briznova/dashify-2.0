import type { Metadata } from "next";
import { Suspense } from "react";
import { PlatformSchoolDetail } from "@/components/platform-school-detail";

export const metadata: Metadata = { title: "School detail" };

async function SchoolDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlatformSchoolDetail schoolId={id} />;
}

export default function PlatformSchoolDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<div role="status">Loading school detail…</div>}>
      <SchoolDetail params={params} />
    </Suspense>
  );
}
