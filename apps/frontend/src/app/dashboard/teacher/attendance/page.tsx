import type { Metadata } from "next";
import { TeacherAttendanceView } from "@/components/teacher-attendance";

export const metadata: Metadata = { title: "Teacher attendance" };
export const instant = false;

export default function TeacherAttendancePage() {
  return <TeacherAttendanceView />;
}
