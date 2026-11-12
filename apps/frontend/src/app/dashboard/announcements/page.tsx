import type { Metadata } from "next";
import { AnnouncementsDirectory } from "@/components/announcements-directory";

export const metadata: Metadata = { title: "Announcements" };

export default function AnnouncementsPage() {
  return <AnnouncementsDirectory />;
}
