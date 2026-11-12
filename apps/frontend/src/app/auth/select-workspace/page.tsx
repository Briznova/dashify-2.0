import type { Metadata } from "next";
import { AuthFlow } from "@/components/auth-flow";

export const metadata: Metadata = { title: "Choose workspace" };

export default function SelectWorkspacePage() {
  return <AuthFlow mode="select-workspace" />;
}
