import { redirect } from "next/navigation";
import { AppShellNav } from "@/components/AppShellNav";
import { getSession } from "@/lib/session";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return <AppShellNav session={session}>{children}</AppShellNav>;
}
