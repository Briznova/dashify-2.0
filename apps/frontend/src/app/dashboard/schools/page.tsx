import type { Metadata } from "next";
import { SchoolsDirectory } from "@/components/school-dashboard";
import { PlatformSchoolsDirectory } from "@/components/platform-schools-directory";
import { isApiMode } from "@/services";

export const metadata: Metadata = { title: "Schools" };

export default function SchoolsPage() {
  return isApiMode ? <PlatformSchoolsDirectory /> : <SchoolsDirectory />;
}
