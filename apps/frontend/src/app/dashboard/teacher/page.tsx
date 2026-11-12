import type { Metadata } from "next";
import { PortalDashboard } from "@/components/school-extras";
import { TeacherDashboardView } from "@/components/teacher-dashboard";
import { isApiMode } from "@/services";

export const metadata: Metadata = { title: "Teacher portal" };

export default function TeacherPortalPage() {
  return isApiMode ? (
    <TeacherDashboardView />
  ) : (
    <PortalDashboard role="teacher" />
  );
}
