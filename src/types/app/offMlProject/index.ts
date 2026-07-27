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

export type MessageSource = "CUSTOMER" | "LINE_BOT" | "TECH_SUPPORT" | "SYSTEM";
export type CaseEventType = "CASE_RECEIVED" | "AI_ANALYZED" | "TEAMS_SENT" | "TECH_REPLIED" | "LINE_REPLY_SENT" | "CASE_CLOSED" | "CASE_REOPENED";

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
  customerAcknowledgedAt?: string;
  resolutionSentAt?: string;
  lineSentAt?: string;
  lineDeliveredAt?: string;
  closedAt?: string;
  closedBy?: string;
  teamsDeliveryStatus?: "not_sent" | "accepted" | "failed";
  teamsDeliveryAt?: string;
  teamsDeliveryError?: string;
  customerName: string;
  lineUserId: string;
  originalText: string;
  initialCustomerMessage: string;
  latestCustomerMessage: string;
  latestCustomerMessageAt?: string;
  latestMessage?: { text: string; source: MessageSource; at?: string };
  problemSummary: string;
  problemSummaryStatus: "PENDING" | "SUCCESS" | "FAILED";
  problemSummaryGeneratedAt?: string;
  analysisStatus: "AI_SUCCESS" | "AI_LOW_CONFIDENCE" | "AI_FAILED" | "NO_CUSTOMER_MESSAGE";
  confidenceReviewStatus?: "PENDING" | "APPROVED" | "REJECTED";
  confidenceReviewedAt?: string;
  confidenceReviewedBy?: string;
  assignee?: string | null;
  lastActivityAt: string;
  hasUnreadCustomerMessage: boolean;
  isSlaBreached: boolean;
  category: string;
  categoryKey: string;
  aiConfidence: number;
  status: CaseStatus;
  createdAt: string;
  slaHours: number;
  summary: string;
  teamsThread: string[];
  conversation: OffMlProjectMessageResponse[];
  supportSolution?: string;
  hasConfirmedTechSolution?: boolean;
  confirmedTechSolutionText?: string;
  teamActions?: string[];
  customerOutcome?: {
    type: "RESOLVED" | "IMPROVED";
    text: string;
    confirmedAt: string;
  };
  customerReply?: string;
  hasCustomerConfirmation?: boolean;
  closedWithoutTechConfirmation?: boolean;
  closeSummary?: { cause: string; resolution: string; prevention: string };
  learningStatus?: AiLearningStatus;
}

export interface AiLearningStatus {
  caseUnderstandingConfidence?: number;
  caseDiscriminationConfidence?: number;
  caseUnderstandingThreshold?: number;
  caseDiscriminationThreshold?: number;
  autoAnswerEligible?: boolean;
  solutionUsageCount?: number;
  confirmedCount?: number;
  additionalConfirmationsNeeded?: number;
}

export interface OffMlProjectCustomerResponse {
  id: string;
  lineUserId: string;
  displayName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InboxMessage {
  id: string;
  customerId: string;
  direction: "INBOUND" | "OUTBOUND";
  senderType: "CUSTOMER" | "TECH";
  text: string;
  externalMessageId?: string;
  webhookEventId?: string;
  createdAt: string;
}

export interface InboxUser {
  customer: OffMlProjectCustomerResponse;
  latestMessage?: InboxMessage;
  messages: InboxMessage[];
  cases: OffMlProjectCaseResponse[];
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
  metadata?: Record<string, unknown>;
  externalMessageId?: string;
  createdAt: string;
}

export interface OffMlProjectAnalysisResponse {
  id: string;
  caseId: string;
  messageId: string;
  analysisType: "customer_message" | "customer_outcome" | "tech_solution" | "customer_rewrite" | "case_match" | "tech_message_review";
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
  closedAt?: string;
  closedBy?: string;
  customerId: string;
  teamsDeliveryStatus?: "not_sent" | "accepted" | "failed";
  teamsDeliveryAt?: string;
  teamsDeliveryError?: string;
  initialCustomerMessageId?: string;
  latestCustomerMessageId?: string;
  problemSummary?: string;
  problemSummaryGeneratedAt?: string;
  problemSummarySourceMessageId?: string;
  problemSummaryVersion?: number;
  problemSummaryStatus?: "PENDING" | "SUCCESS" | "FAILED";
  confidenceReviewStatus?: "PENDING" | "APPROVED" | "REJECTED";
  confidenceReviewedAt?: string;
  confidenceReviewedBy?: string;
  assigneeName?: string;
  hasUnreadCustomerMessage?: boolean;
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
  learningStatus?: AiLearningStatus;
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
  reviewStage: "QUALITY" | "AUTO_ANSWER";
  reviewHint: string;
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
  caseId?: string;
  caseNumber: string;
  customer: string;
  answerText: string;
  eventType: string;
  status: string;
  solutionText?: string;
  teamsNotified: boolean;
}

export interface AutoAnswerLogsQuery {
  page?: number;
  pageSize?: 10 | 20 | 50 | 100;
  search?: string;
  eventType?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface AutoAnswerLogsPage {
  items: AutoAnswerLog[];
  totalItems: number;
  totalPages: number;
  page: number;
  pageSize: number;
}

export interface AnalyticsSummary {
  total: number;
  solvedFromExistingSolutionPct: number;
  overSla: number;
  readyForAutoAnswer: number;
  categories: Array<{ key: string; label: string; count: number; value: number }>;
  confidenceDistribution: Array<{ label: string; value: number }>;
}

export interface AutomationSettings {
  enabled: boolean;
  caseUnderstandingThreshold: number;
  caseDiscriminationThreshold: number;
  emergencyDisabledAt?: string;
  updatedAt: string;
}
