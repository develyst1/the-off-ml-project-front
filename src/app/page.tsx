import { OffMlProjectDashboardContent } from "@/components/partials/OffMlProjectDashboard";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;

  return <OffMlProjectDashboardContent initialTab={tab} key={tab ?? "inbox"} />;
}
