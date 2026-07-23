import { OffMlProjectDashboardContent } from "@/components/partials/OffMlProjectDashboard";

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;

  return <OffMlProjectDashboardContent caseId={caseId} />;
}
