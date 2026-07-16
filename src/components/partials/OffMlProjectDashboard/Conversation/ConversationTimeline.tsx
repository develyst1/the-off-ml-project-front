import { Button, Stack } from "@mantine/core";
import { ConversationEmptyState } from "./ConversationEmptyState";
import { ConversationTimelineItem } from "./ConversationTimelineItem";
import type { ConversationMessage } from "./types";

interface ConversationTimelineProps {
  hasActiveFilters: boolean;
  messages: ConversationMessage[];
  onLoadMore: () => void;
  totalMatching: number;
}

export function ConversationTimeline({ hasActiveFilters, messages, onLoadMore, totalMatching }: ConversationTimelineProps) {
  if (totalMatching === 0) return <ConversationEmptyState kind={hasActiveFilters ? "search" : "empty"} />;

  return (
    <Stack className="caseConversationTimeline" gap="sm">
      {messages.map((message, index) => <ConversationTimelineItem isLast={index === messages.length - 1} key={message.id} message={message} />)}
      {messages.length < totalMatching ? (
        <Button onClick={onLoadMore} size="sm" variant="subtle">
          แสดงเพิ่มเติม ({totalMatching - messages.length} ข้อความ)
        </Button>
      ) : null}
    </Stack>
  );
}

