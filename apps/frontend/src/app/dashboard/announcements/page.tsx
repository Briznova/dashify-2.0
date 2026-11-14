import type { Metadata } from "next";
import { AnnouncementsDirectory } from "@/components/announcements-directory";

export const metadata: Metadata = { title: "Announcements" };
export const instant = false;

export default function AnnouncementsPage() {
  return <AnnouncementsDirectory />;
}
