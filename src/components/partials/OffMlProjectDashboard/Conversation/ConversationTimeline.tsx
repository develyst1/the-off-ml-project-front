import { Box, Button, Group, Stack, Text } from "@mantine/core";
import { ConversationEmptyState } from "./ConversationEmptyState";
import { conversationDateKey, conversationOccurredAt, formatConversationDateLabel, getConversationMeta } from "./conversation.config";
import { ConversationTimelineItem } from "./ConversationTimelineItem";
import type { ConversationMessage, ConversationSort } from "./types";

interface ConversationTimelineProps {
  hasActiveFilters: boolean;
  isConversationOnly: boolean;
  latestMessageId?: string;
  messages: ConversationMessage[];
  onGoToLatest: () => void;
  onLoadMore: () => void;
  sort: ConversationSort;
  totalMatching: number;
}

export function ConversationTimeline({ hasActiveFilters, isConversationOnly, latestMessageId, messages, onGoToLatest, onLoadMore, sort, totalMatching }: ConversationTimelineProps) {
  const toolbar = (
    <Group className="caseConversationTimelineToolbar" justify="space-between" gap="sm" wrap="wrap">
      <Group gap="xs" wrap="wrap">
        {latestMessageId ? (
          <Button leftSection={<Text component="span">↓</Text>} onClick={onGoToLatest} size="xs" variant="light">
            ไปยังข้อความล่าสุด
          </Button>
        ) : null}
      </Group>
    </Group>
  );

  if (totalMatching === 0) return <Stack gap="xs">{toolbar}<ConversationEmptyState kind={hasActiveFilters ? "search" : isConversationOnly ? "conversation" : "empty"} /></Stack>;

  const remainingCount = totalMatching - messages.length;
  const loadPreviousButton = remainingCount > 0 ? (
    <Button onClick={onLoadMore} size="sm" variant="subtle">
      โหลดข้อความก่อนหน้าอีก {Math.min(10, remainingCount)} รายการ
    </Button>
  ) : null;

  return (
    <Stack className="caseConversationTimeline" gap={6}>
      {toolbar}
      <Box className="caseConversationTimelineScroll">
      {sort === "oldest" ? loadPreviousButton : null}
      {messages.map((message, index) => {
        const previous = messages[index - 1];
        const showDateSeparator = !previous || conversationDateKey(conversationOccurredAt(previous)) !== conversationDateKey(conversationOccurredAt(message));
        const previousMeta = previous ? getConversationMeta(previous) : undefined;
        const currentMeta = getConversationMeta(message);
        const isGroupedWithPrevious = Boolean(
          previous
          && !showDateSeparator
          && !previousMeta?.isSystemEvent
          && !currentMeta.isSystemEvent
          && previousMeta?.filter === currentMeta.filter
          && previous.channel === message.channel
          && previous.senderType === message.senderType,
        );
        return (
          <Box key={message.id}>
            {showDateSeparator ? <Text className="caseConversationDateSeparator" c="dimmed" size="xs">{formatConversationDateLabel(conversationOccurredAt(message))}</Text> : null}
            <ConversationTimelineItem isGroupedWithPrevious={isGroupedWithPrevious} isLast={index === messages.length - 1} isLatest={message.id === latestMessageId} message={message} />
          </Box>
        );
      })}
      {sort === "newest" ? loadPreviousButton : null}
      </Box>
    </Stack>
  );
}
