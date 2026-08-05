"use client";

import { ActionIcon, Box, Button, Indicator, Stack, Text, Tooltip } from "@mantine/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppIcon } from "@/components/common";
import { ConversationEmptyState } from "./ConversationEmptyState";
import { conversationDateKey, conversationOccurredAt, formatConversationDateLabel, getConversationMeta } from "./conversation.config";
import { ConversationTimelineItem } from "./ConversationTimelineItem";
import type { ConversationMessage, ConversationSort } from "./types";

const LATEST_THRESHOLD = 100;

interface ConversationTimelineProps {
  hasActiveFilters: boolean;
  isConversationOnly: boolean;
  latestMessageId?: string;
  messages: ConversationMessage[];
  onLoadMore: () => void;
  sort: ConversationSort;
  totalMatching: number;
}

export function ConversationTimeline({ hasActiveFilters, isConversationOnly, latestMessageId, messages, onLoadMore, sort, totalMatching }: ConversationTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const latestMessageIdRef = useRef<string | undefined>(undefined);
  const isNearLatestRef = useRef(true);
  const [isNearLatest, setIsNearLatest] = useState(true);
  const [newMessageCount, setNewMessageCount] = useState(0);

  const updateScrollPosition = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;

    const distanceToLatest = sort === "oldest"
      ? container.scrollHeight - container.scrollTop - container.clientHeight
      : container.scrollTop;
    const nextIsNearLatest = distanceToLatest <= LATEST_THRESHOLD;
    isNearLatestRef.current = nextIsNearLatest;
    setIsNearLatest(nextIsNearLatest);
    if (nextIsNearLatest) setNewMessageCount(0);
  }, [sort]);

  const scrollToLatest = useCallback((behavior: ScrollBehavior = "smooth") => {
    const container = scrollRef.current;
    if (!container) return;
    const shouldReduceMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    container.scrollTo({
      top: sort === "oldest" ? container.scrollHeight : 0,
      behavior: shouldReduceMotion ? "auto" : behavior,
    });
    isNearLatestRef.current = true;
    setIsNearLatest(true);
    setNewMessageCount(0);
  }, [sort]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!latestMessageId) {
        latestMessageIdRef.current = undefined;
        setNewMessageCount(0);
        return;
      }

      const previousLatestMessageId = latestMessageIdRef.current;
      latestMessageIdRef.current = latestMessageId;
      if (!previousLatestMessageId) {
        scrollToLatest("auto");
        return;
      }
      if (previousLatestMessageId !== latestMessageId) {
        if (isNearLatestRef.current) scrollToLatest();
        else setNewMessageCount((count) => count + 1);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [latestMessageId, scrollToLatest]);

  if (totalMatching === 0) {
    return <ConversationEmptyState kind={hasActiveFilters ? "search" : isConversationOnly ? "conversation" : "empty"} />;
  }

  const remainingCount = totalMatching - messages.length;
  const loadPreviousButton = remainingCount > 0 ? (
    <Button onClick={onLoadMore} size="sm" variant="subtle">
      ดูข้อความก่อนหน้า {Math.min(7, remainingCount)} รายการ
    </Button>
  ) : null;

  return (
    <Stack className="caseConversationTimeline" gap={6}>
      <Box className="caseConversationTimelineViewport">
        <Box className="caseConversationTimelineScroll" onScroll={updateScrollPosition} ref={scrollRef}>
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
        {!isNearLatest ? (
          <Tooltip label="ไปยังข้อความล่าสุด" withArrow>
            <Indicator color="red" disabled={newMessageCount === 0} label={newMessageCount > 9 ? "9+" : newMessageCount} offset={3} position="top-end" size={16}>
              <ActionIcon aria-label="ไปยังข้อความล่าสุด" className="caseConversationGoLatestFloating" onClick={() => scrollToLatest()} radius="xl" size={38} variant="default">
                <AppIcon name="arrow-down" size={18} />
              </ActionIcon>
            </Indicator>
          </Tooltip>
        ) : null}
      </Box>
    </Stack>
  );
}
