import type { Metadata } from "next";
import { TeacherResultsView } from "@/components/teacher-results";

export const metadata: Metadata = { title: "Teacher results" };
export const instant = false;

export default function TeacherResultsPage() {
  return <TeacherResultsView />;
}
