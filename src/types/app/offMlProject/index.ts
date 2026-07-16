export type CaseStatus =
  | "new"
  | "analyzing"
  | "awaiting_tech"
  | "assigned"
  | "tech_replied"
  | "analyzing_solution"
  | "awaiting_confirmation"
  | "resolved"
  | "sent_to_customer"
  | "closed"
  | "reopened"
  | "in_progress"
  | "awaiting_customer_info"
  | "awaiting_tech_review"
  | "sent"
  | "sla_breach";

export interface SupportCase {
  id: string;
  caseNumber: string;
  aiStatus?: "AI_SUCCESS" | "AI_LOW_CONFIDENCE" | "AI_FAILED";
  dataStatus?: "COMPLETE" | "DATA_INCOMPLETE";
  customerSentAt?: string;
  caseCreatedAt?: string;
  systemReceivedAt?: string;
  aiAnalyzedAt?: string;
  teamsSentAt?: string;
  techRepliedAt?: string;
  lineSentAt?: string;
  lineDeliveredAt?: string;
  teamsDeliveryStatus?: "not_sent" | "accepted" | "failed";
  teamsDeliveryAt?: string;
  teamsDeliveryError?: string;
  customerName: string;
  lineUserId: string;
  originalText: string;
  category: string;
  aiConfidence: number;
  status: CaseStatus;
  createdAt: string;
  slaHours: number;
  summary: string;
  teamsThread: string[];
  conversation: OffMlProjectMessageResponse[];
  supportSolution?: string;
  customerReply?: string;
}

export interface OffMlProjectCustomerResponse {
  id: string;
  lineUserId: string;
  displayName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OffMlProjectMessageResponse {
  id: string;
  caseId: string;
  direction: "INBOUND" | "OUTBOUND" | "INTERNAL";
  channel: "line" | "ms_teams" | "system";
  originalText: string;
  senderType?: "CUSTOMER" | "BOT" | "AI" | "TECH" | "SYSTEM";
  messageType?: string;
  displayText?: string;
  isVisibleToCustomer?: boolean;
  deliveryStatus?: "RECEIVED" | "PROCESSING" | "PROCESSED" | "PENDING" | "SENT" | "API_ACCEPTED" | "DELIVERED" | "FAILED" | "SKIPPED" | "pending" | "sent" | "delivered" | "failed";
  receivedAt?: string;
  processedAt?: string;
  sentAt?: string;
  deliveredAt?: string;
  failedAt?: string;
  externalMessageId?: string;
  createdAt: string;
}

export interface OffMlProjectAnalysisResponse {
  id: string;
  caseId: string;
  messageId: string;
  analysisType: "customer_message" | "tech_solution" | "customer_rewrite" | "case_match";
  summary?: string;
  category?: string;
  confidence: number;
  rawJson: unknown;
  createdAt: string;
}

export interface OffMlProjectSolutionResponse {
  id: string;
  caseId: string;
  rawReplyText: string;
  rootCause?: string;
  solutionSteps: string[];
  rewrittenCustomerText: string;
  confidence: number;
  validatedByTeam: boolean;
  createdAt: string;
}

export interface OffMlProjectCaseResponse {
  id: string;
  caseNumber: string;
  title?: string;
  aiStatus?: "AI_SUCCESS" | "AI_LOW_CONFIDENCE" | "AI_FAILED";
  dataStatus?: "COMPLETE" | "DATA_INCOMPLETE";
  customerSentAt?: string;
  caseCreatedAt?: string;
  systemReceivedAt?: string;
  aiAnalyzedAt?: string;
  teamsSentAt?: string;
  techRepliedAt?: string;
  lineSentAt?: string;
  lineDeliveredAt?: string;
  customerId: string;
  teamsDeliveryStatus?: "not_sent" | "accepted" | "failed";
  teamsDeliveryAt?: string;
  teamsDeliveryError?: string;
  status: CaseStatus;
  category?: string;
  priority?: "low" | "medium" | "high" | "critical";
  confidenceScore?: number;
  teamsThreadId?: string;
  createdAt: string;
  updatedAt: string;
  customer: OffMlProjectCustomerResponse;
  messages: OffMlProjectMessageResponse[];
  analyses: OffMlProjectAnalysisResponse[];
  solutions: OffMlProjectSolutionResponse[];
}

export interface ConfidenceSuggestion {
  id: string;
  caseId: string;
  caseNumber: string;
  customerName: string;
  suggestedSolutionId: string;
  category: string;
  originalText: string;
  solutionText: string;
  caseUnderstandingConfidence: number;
  caseDiscriminationConfidence: number;
}

export interface AutoAnswerSolution {
  id: string;
  category: string;
  solutionText: string;
  caseUnderstandingConfidence: number;
  caseDiscriminationConfidence: number;
  status: "ready" | "watching";
}

export interface AutoAnswerLog {
  id: string;
  time: string;
  caseNumber: string;
  customer: string;
  answerText: string;
  solutionText?: string;
  teamsNotified: boolean;
}

export interface AnalyticsSummary {
  total: number;
  solvedFromExistingSolutionPct: number;
  overSla: number;
  readyForAutoAnswer: number;
  categories: Array<{ label: string; value: number }>;
  confidenceDistribution: Array<{ label: string; value: number }>;
}

export interface AutomationSettings {
  enabled: boolean;
  caseUnderstandingThreshold: number;
  caseDiscriminationThreshold: number;
  emergencyDisabledAt?: string;
  updatedAt: string;
}
