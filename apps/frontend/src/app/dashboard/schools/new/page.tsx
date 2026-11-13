import type { Metadata } from "next";
import { PlatformSchoolCreate } from "@/components/platform-school-create";

export const metadata: Metadata = { title: "Create school" };

export default function CreatePlatformSchoolPage() {
  return <PlatformSchoolCreate />;
}
