import { Box, Button, Stack, Text } from "@mantine/core";
import { ConversationEmptyState } from "./ConversationEmptyState";
import { conversationDateKey, formatConversationDateLabel } from "./conversation.config";
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
    <Stack className="caseConversationTimeline" gap={6}>
      {messages.map((message, index) => {
        const previous = messages[index - 1];
        const showDateSeparator = !previous || conversationDateKey(previous.createdAt) !== conversationDateKey(message.createdAt);
        return (
          <Box key={message.id}>
            {showDateSeparator ? <Text className="caseConversationDateSeparator" c="dimmed" size="xs">{formatConversationDateLabel(message.createdAt)}</Text> : null}
            <ConversationTimelineItem isLast={index === messages.length - 1} message={message} />
          </Box>
        );
      })}
      {messages.length < totalMatching ? <Button onClick={onLoadMore} size="sm" variant="subtle">แสดงเพิ่มเติม ({totalMatching - messages.length} รายการ)</Button> : null}
    </Stack>
  );
}
