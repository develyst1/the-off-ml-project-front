import type { SupportCase } from "@/types/app/offMlProject";

export function mergeCaseDetail(previous: SupportCase | null, incoming: SupportCase): SupportCase {
  if (!previous || previous.id !== incoming.id) return incoming;

  const previousAnalysis = previous.currentAnalysis;
  const incomingAnalysis = incoming.currentAnalysis;
  const currentAnalysis = !incomingAnalysis
    ? previousAnalysis
    : !previousAnalysis
      ? incomingAnalysis
      : incomingAnalysis.analysisVersion > previousAnalysis.analysisVersion
        || (incomingAnalysis.analysisVersion === previousAnalysis.analysisVersion
          && new Date(incomingAnalysis.createdAt ?? 0).getTime() >= new Date(previousAnalysis.createdAt ?? 0).getTime())
          ? incomingAnalysis
          : previousAnalysis;
  const messagesById = new Map(previous.conversation.map((message) => [message.id, message]));
  for (const message of incoming.conversation) messagesById.set(message.id, message);
  const matchesCurrentAnalysis = (feedback: SupportCase["aiFeedback"]) => Boolean(
    feedback
    && currentAnalysis
    && feedback.analysisId === currentAnalysis.id
    && feedback.analysisVersion === currentAnalysis.analysisVersion,
  );
  const aiFeedback = matchesCurrentAnalysis(incoming.aiFeedback)
    ? incoming.aiFeedback
    : matchesCurrentAnalysis(previous.aiFeedback)
      ? previous.aiFeedback
      : undefined;

  return {
    ...previous,
    ...incoming,
    currentAnalysis,
    aiFeedback,
    caseUnderstandingFeedback: aiFeedback?.issueUnderstanding,
    solutionSelectionFeedback: aiFeedback?.solutionSelection,
    conversation: [...messagesById.values()],
  };
}
