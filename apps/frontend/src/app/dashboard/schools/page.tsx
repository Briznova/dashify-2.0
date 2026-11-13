import type { Metadata } from "next";
import { PlatformSchoolsDirectory } from "@/components/platform-schools-directory";

export const metadata: Metadata = { title: "Schools" };

export default function SchoolsPage() {
  return <PlatformSchoolsDirectory />;
}
