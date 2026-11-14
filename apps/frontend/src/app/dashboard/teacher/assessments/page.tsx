import type { Metadata } from "next";
import { TeacherAssessmentsView } from "@/components/teacher-assessments";

export const metadata: Metadata = { title: "Assignments and exams" };
export const instant = false;

export default function TeacherAssessmentsPage() {
  return <TeacherAssessmentsView />;
}
