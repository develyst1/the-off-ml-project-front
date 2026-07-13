export type CaseStatus =
  | "new"
  | "analyzing"
  | "awaiting_tech"
  | "tech_replied"
  | "analyzing_solution"
  | "awaiting_confirmation"
  | "resolved"
  | "sent_to_customer"
  | "closed"
  | "sent"
  | "sla_breach";

export interface SupportCase {
  id: string;
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
  direction: "inbound_customer" | "outbound_customer" | "inbound_tech" | "outbound_tech";
  channel: "line" | "ms_teams" | "system";
  originalText: string;
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
  customerId: string;
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
  customer: string;
  answerText: string;
  solutionId: string;
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
