import type { Metadata } from "next";
import { ClassDetails } from "@/components/class-details";

export const metadata: Metadata = { title: "Class details" };

export default async function ClassDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClassDetails classId={id} />;
}
