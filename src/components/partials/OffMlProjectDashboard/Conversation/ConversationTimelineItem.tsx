import { Badge, Box, Group, Paper, Stack, Text, ThemeIcon } from "@mantine/core";
import { AppIcon } from "@/components/common";
import { formatConversationDateTime, getConversationContent, getConversationMeta, getConversationStatus } from "./conversation.config";
import type { ConversationMessage } from "./types";

interface ConversationTimelineItemProps {
  isLast: boolean;
  message: ConversationMessage;
}

export function ConversationTimelineItem({ isLast, message }: ConversationTimelineItemProps) {
  const meta = getConversationMeta(message);
  const status = getConversationStatus(message, meta);
  const timestamp = formatConversationDateTime(message.createdAt);

  return (
    <Box className="caseConversationTimelineItem">
      <Box className="caseConversationTimelineRail">
        {!isLast ? <Box className="caseConversationTimelineLine" /> : null}
        <ThemeIcon color={meta.color} radius="xl" size="lg" variant="filled">
          <AppIcon name={meta.icon} size={17} />
        </ThemeIcon>
      </Box>

      <Paper className="caseConversationTimelineCard" p="sm" radius="md" style={{ borderLeftColor: meta.accent }} withBorder>
        <Group className="caseConversationTimelineHeader" gap="xs" justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="wrap">
            <Badge color={meta.color} variant="light">{meta.label}</Badge>
            <Text c="dimmed" size="xs">{meta.actionLabel}</Text>
          </Group>
          <Stack className="caseConversationTimestamp" gap={1}>
            <Group gap={5} justify="flex-end" wrap="nowrap">
              <Box className="caseConversationStatusDot" style={{ backgroundColor: `var(--mantine-color-${status.color}-6)` }} />
              <Text c="dimmed" size="xs">{status.label}</Text>
            </Group>
            <Text c="dimmed" size="xs" ta="right">{timestamp.date}</Text>
            <Text c="dimmed" size="xs" ta="right">{timestamp.time}</Text>
          </Stack>
        </Group>
        <Text className="compactText" mt="xs" size="sm">{getConversationContent(message)}</Text>
      </Paper>
    </Box>
  );
}

