import type {
  AnalyticsSummary,
  AutoAnswerLogsPage,
  AutoAnswerLogsQuery,
  AutoAnswerSolution,
  AutomationSettings,
  CaseStatus,
  ConfidenceSuggestion,
  InboxUser,
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
    const error = await response.json().catch(() => undefined) as { error?: string; message?: string } | undefined;
    throw new Error(error?.message || error?.error || `Off ML Project API error ${response.status}`);
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

const categoryMeta: Record<string, { key: string; label: string }> = {
  NETWORK_CONNECTION: { key: "NETWORK_CONNECTION", label: "ปัญหาการเชื่อมต่อเครือข่าย" },
  NETWORK_ISSUE: { key: "NETWORK_CONNECTION", label: "ปัญหาการเชื่อมต่อเครือข่าย" },
  NETWORK_CONNECTIVITY: { key: "NETWORK_CONNECTION", label: "ปัญหาการเชื่อมต่อเครือข่าย" },
  "ปัญหาการเชื่อมต่อเครือข่าย": { key: "NETWORK_CONNECTION", label: "ปัญหาการเชื่อมต่อเครือข่าย" },
  LOGIN_ACCESS: { key: "LOGIN_ACCESS", label: "ปัญหาการเข้าสู่ระบบ" },
  LOGIN_ISSUE: { key: "LOGIN_ACCESS", label: "ปัญหาการเข้าสู่ระบบ" },
  LOGIN_FAILURE: { key: "LOGIN_ACCESS", label: "ปัญหาการเข้าสู่ระบบ" },
  "ปัญหาการเข้าสู่ระบบ": { key: "LOGIN_ACCESS", label: "ปัญหาการเข้าสู่ระบบ" },
  STATUS_UPDATE: { key: "STATUS_UPDATE", label: "ปัญหาการอัปเดตสถานะ" },
  "ปัญหาการอัปเดตสถานะ": { key: "STATUS_UPDATE", label: "ปัญหาการอัปเดตสถานะ" },
  HARDWARE_DEVICE: { key: "HARDWARE_DEVICE", label: "ปัญหาฮาร์ดแวร์" },
  "ปัญหาฮาร์ดแวร์": { key: "HARDWARE_DEVICE", label: "ปัญหาฮาร์ดแวร์" },
  SOFTWARE_APPLICATION: { key: "SOFTWARE_APPLICATION", label: "ปัญหาซอฟต์แวร์" },
  "ปัญหาซอฟต์แวร์": { key: "SOFTWARE_APPLICATION", label: "ปัญหาซอฟต์แวร์" },
  DATA_DISPLAY: { key: "DATA_DISPLAY", label: "ปัญหาการแสดงข้อมูล" },
  "ปัญหาการแสดงข้อมูล": { key: "DATA_DISPLAY", label: "ปัญหาการแสดงข้อมูล" },
  OTHER: { key: "OTHER", label: "อื่นๆ" },
};

function getCategoryMeta(category?: string | null) {
  const value = category?.trim();
  if (!value || value === "-" || value.toLowerCase() === "undefined" || value.toLowerCase() === "null") {
    return categoryMeta.OTHER;
  }
  const known = categoryMeta[value.toUpperCase()] ?? categoryMeta[value];
  if (known) return known;
  if (value.startsWith("AI_")) {
    try {
      return { key: value, label: decodeURIComponent(value.slice(3)) };
    } catch {
      return categoryMeta.OTHER;
    }
  }
  return { key: `AI_${encodeURIComponent(value)}`, label: value };
}

function wasDeliveredToCustomer(message: OffMlProjectCaseResponse["messages"][number]) {
  if (message.direction !== "OUTBOUND" || message.channel !== "line") return false;
  return ["SENT", "API_ACCEPTED", "DELIVERED"].includes(message.deliveryStatus?.toUpperCase() ?? "");
}

function messageSentAt(message: OffMlProjectCaseResponse["messages"][number]) {
  return message.deliveredAt ?? message.sentAt ?? message.createdAt;
}

function firstText(caseItem: OffMlProjectCaseResponse, senderType: "CUSTOMER" | "TECH" | "BOT") {
  return latestByCreatedAt(caseItem.messages.filter((message) => message.senderType === senderType))[0]?.originalText;
}

function customerMessages(caseItem: OffMlProjectCaseResponse) {
  return caseItem.messages
    .filter((message) => message.senderType === "CUSTOMER" && message.direction === "INBOUND")
    .sort((left, right) => {
      const leftTime = new Date(left.receivedAt ?? left.createdAt).getTime();
      const rightTime = new Date(right.receivedAt ?? right.createdAt).getTime();
      return leftTime - rightTime;
    });
}

function latestAnalysis(caseItem: OffMlProjectCaseResponse, type: OffMlProjectCaseResponse["analyses"][number]["analysisType"]) {
  return latestByCreatedAt(caseItem.analyses.filter((analysis) => analysis.analysisType === type))[0];
}

function teamActionsFromAnalysis(analysis: OffMlProjectCaseResponse["analyses"][number] | undefined) {
  const rawJson = analysis?.rawJson;
  if (!rawJson || typeof rawJson !== "object" || Array.isArray(rawJson)) return [];

  const actions = (rawJson as { teamActions?: unknown }).teamActions;
  if (!Array.isArray(actions)) return [];

  return [...new Set(actions
    .filter((action): action is string => typeof action === "string")
    .map((action) => action.trim())
    .filter(Boolean))];
}

function customerOutcomeFromAnalysis(
  analysis: OffMlProjectCaseResponse["analyses"][number] | undefined,
): SupportCase["customerOutcome"] {
  const rawJson = analysis?.rawJson;
  if (!rawJson || typeof rawJson !== "object" || Array.isArray(rawJson)) return undefined;

  const { outcome, customerConfirmation } = rawJson as { outcome?: unknown; customerConfirmation?: unknown };
  if ((outcome !== "RESOLVED" && outcome !== "IMPROVED") || typeof customerConfirmation !== "string" || !customerConfirmation.trim()) {
    return undefined;
  }

  return {
    type: outcome as "RESOLVED" | "IMPROVED",
    text: customerConfirmation.trim(),
    confirmedAt: analysis?.createdAt ?? "",
  };
}

const SLA_HOURS = 4;
const SLA_MONITORED_STATUSES = new Set<SupportCase["status"]>([
  "new",
  "analyzing",
  "awaiting_tech",
  "assigned",
  "in_progress",
  "analyzing_solution",
  "awaiting_tech_review",
  "reopened",
  "sla_breach",
]);

function calculateSlaBreached(status: SupportCase["status"], activityAt: string | undefined) {
  if (status === "sla_breach") return true;
  if (!SLA_MONITORED_STATUSES.has(status) || !activityAt) return false;

  const activityTime = new Date(activityAt).getTime();
  return Number.isFinite(activityTime) && Date.now() - activityTime >= SLA_HOURS * 60 * 60 * 1000;
}

export function mapCaseResponse(caseItem: OffMlProjectCaseResponse): SupportCase {
  const customerMessageList = customerMessages(caseItem);
  const initialCustomerMessage = caseItem.initialCustomerMessageId
    ? customerMessageList.find((message) => message.id === caseItem.initialCustomerMessageId)
    : customerMessageList[0];
  const latestCustomerMessage = caseItem.latestCustomerMessageId
    ? customerMessageList.find((message) => message.id === caseItem.latestCustomerMessageId)
    : customerMessageList.at(-1);
  const customerMessage = initialCustomerMessage?.originalText ?? "";
  const latestCustomerText = latestCustomerMessage?.originalText ?? "";
  const techReply = latestByCreatedAt(caseItem.messages.filter((message) => (
    message.senderType === "TECH" && message.messageType !== "CASE_CLOSED" && Boolean(message.originalText.trim())
  )))[0]?.originalText;
  const outboundReply = firstText(caseItem, "BOT");
  const customerAnalysis = latestAnalysis(caseItem, "customer_message");
  const techAnalysis = latestAnalysis(caseItem, "tech_solution");
  const customerOutcomeAnalysis = latestAnalysis(caseItem, "customer_outcome");
  const latestSolution = latestByCreatedAt(caseItem.solutions)[0];
  const confirmedSolution = latestByCreatedAt(caseItem.solutions.filter((solution) => solution.validatedByTeam))[0];
  const customerAcknowledgement = latestByCreatedAt(caseItem.messages.filter((message) => (
    message.messageType === "CASE_ACKNOWLEDGEMENT" && wasDeliveredToCustomer(message)
  )))[0];
  const finalResolution = latestByCreatedAt(caseItem.messages.filter((message) => (
    ["CUSTOMER_REPLY", "RESOLUTION", "CASE_CLOSED"].includes(message.messageType ?? "")
    && wasDeliveredToCustomer(message)
  )))[0];
  const teamActions = teamActionsFromAnalysis(techAnalysis);
  const customerOutcome = customerOutcomeFromAnalysis(customerOutcomeAnalysis);
  const hasCustomerConfirmation = Boolean(customerOutcome && customerOutcomeAnalysis?.messageId && caseItem.messages.some((message) => (
    message.id === customerOutcomeAnalysis.messageId && message.senderType === "CUSTOMER"
  )));
  const latestMessage = latestByCreatedAt(caseItem.messages)[0];
  const latestCloseEvent = latestByCreatedAt(caseItem.messages.filter((message) => (
    message.senderType === "SYSTEM" && message.messageType === "CASE_CLOSED"
  )))[0];
  const closeMetadata = latestCloseEvent?.metadata ?? {};
  const closeSummary = closeMetadata.closeSummary;
  const normalizedCloseSummary = closeSummary && typeof closeSummary === "object"
    && typeof (closeSummary as Record<string, unknown>).cause === "string"
    && typeof (closeSummary as Record<string, unknown>).resolution === "string"
    && typeof (closeSummary as Record<string, unknown>).prevention === "string"
    ? {
      cause: (closeSummary as Record<string, string>).cause,
      resolution: (closeSummary as Record<string, string>).resolution,
      prevention: (closeSummary as Record<string, string>).prevention,
    }
    : undefined;
  const analysisStatus = !customerMessage
    ? "NO_CUSTOMER_MESSAGE"
    : caseItem.aiStatus ?? "AI_LOW_CONFIDENCE";
  const problemSummary = caseItem.problemSummary
    ?? (caseItem.aiStatus === "AI_FAILED"
      ? "AI วิเคราะห์ไม่สำเร็จ"
      : (caseItem.title || customerMessage || "ยังไม่มีข้อมูลสรุปปัญหา"));
  const problemSummaryStatus = caseItem.problemSummaryStatus
    ?? (caseItem.aiStatus === "AI_FAILED" ? "FAILED" : caseItem.problemSummary ? "SUCCESS" : "PENDING");
  const latestOutbound = [...caseItem.messages]
    .filter((message) => message.senderType !== "CUSTOMER" && message.direction === "OUTBOUND")
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
    .at(-1);
  const hasUnreadCustomerMessage = caseItem.hasUnreadCustomerMessage
    ?? Boolean(latestCustomerMessage && (!latestOutbound || new Date(latestCustomerMessage.receivedAt ?? latestCustomerMessage.createdAt).getTime() > new Date(latestOutbound.createdAt).getTime()));
  const slaHours = SLA_HOURS;
  const isSlaBreached = calculateSlaBreached(caseItem.status, latestCustomerMessage?.receivedAt ?? latestCustomerMessage?.createdAt ?? caseItem.updatedAt);
  const resolvedCategory = caseItem.aiStatus === "AI_FAILED"
    ? { key: "OTHER", label: "AI วิเคราะห์ไม่สำเร็จ" }
    : getCategoryMeta(customerAnalysis?.category ?? caseItem.category);

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
    customerAcknowledgedAt: customerAcknowledgement ? messageSentAt(customerAcknowledgement) : undefined,
    resolutionSentAt: finalResolution ? messageSentAt(finalResolution) : undefined,
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
    initialCustomerMessage: customerMessage,
    latestCustomerMessage: latestCustomerText,
    latestCustomerMessageAt: latestCustomerMessage?.receivedAt ?? latestCustomerMessage?.createdAt,
    latestMessage: latestMessage ? {
      text: latestMessage.displayText ?? latestMessage.originalText,
      source: getMessageSource(latestMessage),
      at: latestMessage.sentAt ?? latestMessage.receivedAt ?? latestMessage.processedAt ?? latestMessage.createdAt,
    } : undefined,
    problemSummary,
    problemSummaryStatus,
    problemSummaryGeneratedAt: caseItem.problemSummaryGeneratedAt,
    analysisStatus,
    confidenceReviewStatus: caseItem.confidenceReviewStatus,
    confidenceReviewedAt: caseItem.confidenceReviewedAt,
    confidenceReviewedBy: caseItem.confidenceReviewedBy,
    assignee: caseItem.assigneeName ?? null,
    lastActivityAt: caseItem.updatedAt,
    hasUnreadCustomerMessage,
    isSlaBreached,
    category: resolvedCategory.label,
    categoryKey: resolvedCategory.key,
    aiConfidence: caseItem.aiStatus === "AI_FAILED" ? 0 : customerAnalysis?.confidence ?? caseItem.confidenceScore ?? 0,
    status: caseItem.status,
    createdAt: formatDateTime(caseItem.createdAt),
    slaHours,
    summary: problemSummary,
    teamsThread: [
      "ระบบแจ้งลูกค้า + ข้อความต้นฉบับ + ผลวิเคราะห์โดย AI ไปยัง Teams แล้ว",
      techReply ? `Tech Support ตอบกลับ: ${techReply}` : "รอทีม Tech Support วิเคราะห์และตอบกลับ",
    ],
    conversation: [...caseItem.messages].sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()),
    supportSolution: latestSolution?.solutionSteps.join("\n") || techAnalysis?.summary,
    hasConfirmedTechSolution: Boolean(confirmedSolution),
    confirmedTechSolutionText: confirmedSolution?.rawReplyText,
    teamActions,
    customerOutcome,
    hasCustomerConfirmation,
    closedWithoutTechConfirmation: closeMetadata.closedWithoutTechConfirmation === true,
    closeSummary: normalizedCloseSummary,
    customerReply: latestSolution?.rewrittenCustomerText ?? outboundReply,
    learningStatus: caseItem.learningStatus,
  };
}

function getMessageSource(message: OffMlProjectCaseResponse["messages"][number]): "CUSTOMER" | "LINE_BOT" | "TECH_SUPPORT" | "SYSTEM" {
  if (message.senderType === "CUSTOMER") return "CUSTOMER";
  if (message.senderType === "TECH") return "TECH_SUPPORT";
  if (message.senderType === "BOT" || message.senderType === "AI") return "LINE_BOT";
  return "SYSTEM";
}

export async function getCases(query?: { category?: string; kpi?: string }): Promise<SupportCase[]> {
  const params = new URLSearchParams();
  if (query?.category) params.set("category", query.category);
  if (query?.kpi) params.set("kpi", query.kpi);
  const search = params.size ? `?${params.toString()}` : "";
  const cases = await request<OffMlProjectCaseResponse[]>(`/cases${search}`);
  return cases.map(mapCaseResponse);
}

export async function getInboxUsers(): Promise<InboxUser[]> {
  return request<InboxUser[]>("/inbox");
}

export async function getInboxUser(customerId: string): Promise<InboxUser> {
  return request<InboxUser>(`/inbox/${encodeURIComponent(customerId)}`);
}

export async function sendInboxReply(customerId: string, text: string): Promise<InboxUser> {
  return request<InboxUser>(`/inbox/${encodeURIComponent(customerId)}/reply`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export async function openInboxCase(customerId: string, title?: string): Promise<SupportCase> {
  const caseItem = await request<OffMlProjectCaseResponse>(`/inbox/${encodeURIComponent(customerId)}/open-case`, {
    method: "POST",
    body: JSON.stringify({ title }),
  });
  return mapCaseResponse(caseItem);
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

export async function rewriteAdditionalInfoRequest(caseId: string, text: string): Promise<{ rewrittenMessage: string; rewrittenMessageId?: string; usedFallback?: boolean }> {
  return request<{ rewrittenMessage: string; rewrittenMessageId?: string; usedFallback?: boolean }>(`/cases/${caseId}/rewrite-request-info`, {
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

export async function generateMoreInfoRequest(caseId: string, requestedInformation?: string): Promise<{ suggestedMessage: string; requestedFields: string[]; reason: string; rewrittenMessageId: string; sourceMessageId?: string }> {
  return request<{ suggestedMessage: string; requestedFields: string[]; reason: string; rewrittenMessageId: string; sourceMessageId?: string }>(`/cases/${caseId}/generate-more-info`, {
    method: "POST",
    body: JSON.stringify({ requestedInformation }),
  });
}

export type AiComposeMode = "CUSTOMER_REPLY" | "REQUEST_MORE_INFO";
export type AiRewriteMode = AiComposeMode | "CLOSING_SUMMARY";

export type AiComposeResult = {
  mode: AiComposeMode;
  suggestedMessage: string;
  suggestedMode: AiComposeMode;
  reason: string;
  requestedFields: string[];
  missingInformation: string[];
  rewrittenMessageId: string;
  sourceMessageId?: string;
};

export async function composeAiMessage(caseId: string, input: { mode: AiComposeMode; supportInstruction?: string; requestedInformation?: string }): Promise<AiComposeResult> {
  return request<AiComposeResult>(`/cases/${caseId}/ai-compose`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function closeCaseWithReply(caseId: string, text: string, closedWithoutTechConfirmation = false, closeSummary?: { cause: string; resolution: string; prevention: string }): Promise<SupportCase> {
  const caseItem = await request<OffMlProjectCaseResponse>(`/cases/${caseId}/close`, {
    method: "POST",
    body: JSON.stringify({ text, closedBy: "Tech Support Console", closedWithoutTechConfirmation, closeSummary }),
  });
  return mapCaseResponse(caseItem);
}

export async function rewriteCustomerReply(caseId: string, text: string, mode: "NORMAL_REPLY" | "CLOSING_REPLY") {
  return request<{ rewrittenMessage: string }>(`/cases/${caseId}/rewrite-reply`, {
    method: "POST",
    body: JSON.stringify({ text, mode }),
  });
}

export async function reopenCase(caseId: string, reopenReason: string): Promise<SupportCase> {
  const caseItem = await request<OffMlProjectCaseResponse>(`/cases/${caseId}/reopen`, {
    method: "POST",
    body: JSON.stringify({ reopenedBy: "Tech Support Console", reopenReason }),
  });
  return mapCaseResponse(caseItem);
}

export async function getConfidenceSuggestions(): Promise<ConfidenceSuggestion[]> {
  return request<ConfidenceSuggestion[]>("/confidence/suggestions");
}

export async function reviewConfidenceSuggestion(input: {
  caseId: string;
  id: string;
  solutionId?: string;
  reviewStage: "QUALITY" | "AUTO_ANSWER";
  result: "approved" | "rejected";
  rejectionReason?: "CASE_UNDERSTANDING" | "SOLUTION_SELECTION" | "INSUFFICIENT_CUSTOMER_INFO" | "BETTER_SOLUTION";
  additionalExplanation?: string;
  correctedSolution?: string;
}) {
  return request<{ caseId: string; id: string; result: "approved" | "rejected" }>(`/confidence/suggestions/${input.id}/review`, {
    method: "POST",
    body: JSON.stringify({
      caseId: input.caseId,
      solutionId: input.solutionId,
      reviewStage: input.reviewStage,
      result: input.result,
      rejectionReason: input.rejectionReason,
      additionalExplanation: input.additionalExplanation,
      correctedSolution: input.correctedSolution,
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

export async function getAutoAnswerLogs(query: AutoAnswerLogsQuery = {}): Promise<AutoAnswerLogsPage> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return request<AutoAnswerLogsPage>(`/automation/logs${suffix}`);
}

export async function getTeamsStatus(): Promise<{ connected: boolean; mode: "incoming_webhook" | "mock" }> {
  return request<{ connected: boolean; mode: "incoming_webhook" | "mock" }>("/integrations/teams/status");
}
