import assert from "node:assert/strict";
import test from "node:test";
import type { SupportCase } from "@/types/app/offMlProject";
import { mergeCaseDetail } from "./case-detail-state";

function makeCase(overrides: Partial<SupportCase> = {}) {
  return {
    id: "case-1",
    conversation: [],
    currentAnalysis: { id: "analysis-1", analysisVersion: 1, createdAt: "2026-08-11T00:00:00.000Z", sourceMessageIds: ["message-1"] },
    ...overrides,
  } as SupportCase;
}

test("keeps the current analysis when a realtime reply response is partial", () => {
  const previous = makeCase({ conversation: [{ id: "message-1" }] as SupportCase["conversation"] });
  const incoming = makeCase({ currentAnalysis: undefined, conversation: [{ id: "message-2" }] as SupportCase["conversation"] });

  const merged = mergeCaseDetail(previous, incoming);

  assert.equal(merged.currentAnalysis?.id, "analysis-1");
  assert.equal(merged.currentAnalysis?.analysisVersion, 1);
  assert.deepEqual(merged.conversation.map((message) => message.id), ["message-1", "message-2"]);
});

test("replaces the current analysis only when a newer version arrives", () => {
  const previous = makeCase();
  const incoming = makeCase({
    currentAnalysis: { id: "analysis-2", analysisVersion: 2, createdAt: "2026-08-11T00:01:00.000Z", sourceMessageIds: ["message-1", "message-2"] },
  });

  const merged = mergeCaseDetail(previous, incoming);

  assert.equal(merged.currentAnalysis?.id, "analysis-2");
  assert.equal(merged.currentAnalysis?.analysisVersion, 2);
});
