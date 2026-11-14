import type { Metadata } from "next";
import { TeacherDashboardView } from "@/components/teacher-dashboard";

export const metadata: Metadata = { title: "Teacher workspace" };
export const instant = false;

export default function TeacherPortalPage() {
  return <TeacherDashboardView />;
}
