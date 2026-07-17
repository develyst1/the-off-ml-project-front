import type {
  AnalyticsSummary,
  AutoAnswerLog,
  AutoAnswerSolution,
  AutomationSettings,
  CaseStatus,
  ConfidenceSuggestion,
  OffMlProjectCaseResponse,
  SupportCase,
} from "@/types/app/offMlProject";

type ApiResponse<T> = {
  data: T;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_OFF_ML_PROJECT_API_BASE_URL ?? "http://localhost:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => undefined) as { error?: string } | undefined;
    throw new Error(error?.error || `Off ML Project API error ${response.status}`);
  }

  const body = (await response.json()) as ApiResponse<T>;
  return body.data;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function latestByCreatedAt<T extends { createdAt: string }>(items: T[]) {
  return [...items].sort((left, right) => {
    const leftTime = new Date(left.createdAt).getTime();
    const rightTime = new Date(right.createdAt).getTime();
    return rightTime - leftTime;
  });
}

function firstText(caseItem: OffMlProjectCaseResponse, senderType: "CUSTOMER" | "TECH" | "BOT") {
  return latestByCreatedAt(caseItem.messages.filter((message) => message.senderType === senderType))[0]?.originalText;
}

function latestAnalysis(caseItem: OffMlProjectCaseResponse, type: OffMlProjectCaseResponse["analyses"][number]["analysisType"]) {
  return latestByCreatedAt(caseItem.analyses.filter((analysis) => analysis.analysisType === type))[0];
}

export function mapCaseResponse(caseItem: OffMlProjectCaseResponse): SupportCase {
  const customerMessage = firstText(caseItem, "CUSTOMER") ?? "";
  const techReply = firstText(caseItem, "TECH");
  const outboundReply = firstText(caseItem, "BOT");
  const customerAnalysis = latestAnalysis(caseItem, "customer_message");
  const techAnalysis = latestAnalysis(caseItem, "tech_solution");
  const latestSolution = latestByCreatedAt(caseItem.solutions)[0];

  return {
    id: caseItem.id,
    caseNumber: caseItem.caseNumber,
    aiStatus: caseItem.aiStatus,
    dataStatus: caseItem.dataStatus,
    customerSentAt: caseItem.customerSentAt,
    caseCreatedAt: caseItem.createdAt,
    systemReceivedAt: caseItem.systemReceivedAt,
    aiAnalyzedAt: caseItem.aiAnalyzedAt,
    teamsSentAt: caseItem.teamsSentAt,
    techRepliedAt: caseItem.techRepliedAt,
    lineSentAt: caseItem.lineSentAt,
    lineDeliveredAt: caseItem.lineDeliveredAt,
    closedAt: caseItem.closedAt,
    closedBy: caseItem.closedBy,
    teamsDeliveryStatus: caseItem.teamsDeliveryStatus,
    teamsDeliveryAt: caseItem.teamsDeliveryAt,
    teamsDeliveryError: caseItem.teamsDeliveryError,
    customerName: caseItem.customer.displayName ?? caseItem.customer.lineUserId,
    lineUserId: caseItem.customer.lineUserId,
    originalText: customerMessage,
    category: caseItem.aiStatus === "AI_FAILED" ? "วิเคราะห์ไม่สำเร็จ" : customerAnalysis?.category ?? caseItem.category ?? "-",
    aiConfidence: customerAnalysis?.confidence ?? caseItem.confidenceScore ?? 0,
    status: caseItem.status,
    createdAt: formatDateTime(caseItem.createdAt),
    slaHours: 4,
    summary: !customerMessage
      ? "ไม่สามารถวิเคราะห์ได้ เนื่องจากไม่พบข้อความต้นฉบับจากลูกค้า"
      : caseItem.aiStatus === "AI_FAILED"
        ? "AI วิเคราะห์ไม่สำเร็จ กรุณาตรวจสอบอีกครั้ง"
      : customerAnalysis?.summary ?? "ยังไม่มีผลวิเคราะห์โดย AI",
    teamsThread: [
      "ระบบแจ้งลูกค้า + ข้อความต้นฉบับ + ผลวิเคราะห์โดย AI ไปยัง Teams แล้ว",
      techReply ? `Tech Support ตอบกลับ: ${techReply}` : "รอทีม Tech Support วิเคราะห์และตอบกลับ",
    ],
    conversation: [...caseItem.messages].sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()),
    supportSolution: latestSolution?.solutionSteps.join("\n") || techAnalysis?.summary,
    customerReply: latestSolution?.rewrittenCustomerText ?? outboundReply,
  };
}

export async function getCases(): Promise<SupportCase[]> {
  const cases = await request<OffMlProjectCaseResponse[]>("/cases");
  return cases.map(mapCaseResponse);
}

export async function getCase(caseId: string): Promise<SupportCase> {
  const caseItem = await request<OffMlProjectCaseResponse>(`/cases/${caseId}`);
  return mapCaseResponse(caseItem);
}

export async function updateCaseStatus(caseId: string, status: CaseStatus): Promise<SupportCase> {
  const caseItem = await request<OffMlProjectCaseResponse>(`/cases/${caseId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

  return mapCaseResponse(caseItem);
}

export async function acceptCase(caseId: string): Promise<SupportCase> {
  const caseItem = await request<OffMlProjectCaseResponse>(`/cases/${caseId}/accept`, { method: "POST" });
  return mapCaseResponse(caseItem);
}

export async function requestAdditionalInfo(caseId: string, text: string, sourceMessageId?: string): Promise<SupportCase> {
  const caseItem = await request<OffMlProjectCaseResponse>(`/cases/${caseId}/request-info`, {
    method: "POST",
    body: JSON.stringify({ text, sourceMessageId }),
  });
  return mapCaseResponse(caseItem);
}

export async function rewriteAdditionalInfoRequest(caseId: string, text: string): Promise<{ rewrittenMessage: string; rewrittenMessageId: string }> {
  return request<{ rewrittenMessage: string; rewrittenMessageId: string }>(`/cases/${caseId}/rewrite-request-info`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export async function replyToCustomer(caseId: string, text: string): Promise<SupportCase> {
  const caseItem = await request<OffMlProjectCaseResponse>(`/cases/${caseId}/reply`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
  return mapCaseResponse(caseItem);
}

export async function closeCaseWithReply(caseId: string, text: string): Promise<SupportCase> {
  const caseItem = await request<OffMlProjectCaseResponse>(`/cases/${caseId}/close`, {
    method: "POST",
    body: JSON.stringify({ text, closedBy: "Tech Support Console" }),
  });
  return mapCaseResponse(caseItem);
}

export async function rewriteCustomerReply(caseId: string, text: string, mode: "NORMAL_REPLY" | "CLOSING_REPLY") {
  return request<{ rewrittenMessage: string }>(`/cases/${caseId}/rewrite-reply`, {
    method: "POST",
    body: JSON.stringify({ text, mode }),
  });
}

export async function reopenCase(caseId: string): Promise<SupportCase> {
  const caseItem = await request<OffMlProjectCaseResponse>(`/cases/${caseId}/reopen`, {
    method: "POST",
    body: JSON.stringify({ reopenedBy: "Tech Support Console" }),
  });
  return mapCaseResponse(caseItem);
}

export async function getConfidenceSuggestions(): Promise<ConfidenceSuggestion[]> {
  return request<ConfidenceSuggestion[]>("/confidence/suggestions");
}

export async function reviewConfidenceSuggestion(input: {
  caseId: string;
  id: string;
  result: "approved" | "rejected";
}) {
  return request<{ caseId: string; id: string; result: "approved" | "rejected" }>(`/confidence/suggestions/${input.id}/review`, {
    method: "POST",
    body: JSON.stringify({
      caseId: input.caseId,
      result: input.result,
    }),
  });
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  return request<AnalyticsSummary>("/analytics/summary");
}

export async function getAutomationSettings(): Promise<AutomationSettings> {
  return request<AutomationSettings>("/automation/settings");
}

export async function updateAutomationSettings(input: { emergencyDisable?: boolean; enabled?: boolean }): Promise<AutomationSettings> {
  return request<AutomationSettings>("/automation/settings", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function getAutoAnswerSolutions(): Promise<AutoAnswerSolution[]> {
  return request<AutoAnswerSolution[]>("/automation/solutions");
}

export async function getAutoAnswerLogs(): Promise<AutoAnswerLog[]> {
  return request<AutoAnswerLog[]>("/automation/logs");
}

export async function getTeamsStatus(): Promise<{ connected: boolean; mode: "incoming_webhook" | "mock" }> {
  return request<{ connected: boolean; mode: "incoming_webhook" | "mock" }>("/integrations/teams/status");
}
