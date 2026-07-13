export type CaseStatus =
  | "awaiting_tech"
  | "awaiting_confirmation"
  | "resolved"
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
