import { OffMlProjectDashboardContent } from "@/components/partials/OffMlProjectDashboard";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; user?: string }>;
}) {
  const { tab, user } = await searchParams;

  return <OffMlProjectDashboardContent initialInboxUserId={user} initialTab={tab} key={`${tab ?? "inbox"}:${user ?? ""}`} />;
}
