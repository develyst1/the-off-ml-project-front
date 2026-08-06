"use client";

import { Button, Card, Group, Skeleton, Stack, Text, Textarea } from "@mantine/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { SupportCase } from "@/types/app/offMlProject";
import { CaseConversationHeader } from "./CaseConversationHeader";
import { ConversationEmptyState } from "./ConversationEmptyState";
import { ConversationFilters } from "./ConversationFilters";
import { ConversationTimeline } from "./ConversationTimeline";
import { conversationOccurredAt, getConversationContent, getConversationMeta, isConversationMessage, matchesDeliveryStatus, matchesMessageType } from "./conversation.config";
import type { ConversationDeliveryStatus, ConversationFilter, ConversationMessage, ConversationMessageType, ConversationRange, ConversationSort, ConversationViewMode } from "./types";
import { useRealtimeEvents, type CaseAnalysisUpdatedEvent, type ConversationMessageCreatedEvent } from "@/hooks/useRealtimeEvents";

const PAGE_SIZE = 7;

interface CaseConversationProps {
  error?: string;
  isLoading?: boolean;
  item: SupportCase;
  onRetry?: () => void;
  onReply?: (text: string) => Promise<void>;
}

function isInRange(message: ConversationMessage, range: ConversationRange) {
  if (range === "all") return true;
  const timestamp = new Date(conversationOccurredAt(message)).getTime();
  if (Number.isNaN(timestamp)) return false;
  if (range === "today") {
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" });
    return day.format(new Date(timestamp)) === day.format(new Date());
  }
  const days = range === "7d" ? 7 : 30;
  return timestamp >= Date.now() - days * 24 * 60 * 60 * 1000;
}

export function CaseConversation({ error, isLoading = false, item, onRetry, onReply }: CaseConversationProps) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ConversationFilter>("all");
  const [messageType, setMessageType] = useState<ConversationMessageType>("all");
  const [deliveryStatus, setDeliveryStatus] = useState<ConversationDeliveryStatus>("all");
  const [sort, setSort] = useState<ConversationSort>("oldest");
  const [range, setRange] = useState<ConversationRange>("all");
  const [viewMode, setViewMode] = useState<ConversationViewMode>("CONVERSATION_ONLY");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messages = useMemo(() => item.conversation ?? [], [item.conversation]);
  const rawMessageRetentionExpired = messages.length === 0 && item.rawMessageTimelineExpired === true;
  const conversationCount = useMemo(() => messages.filter(isConversationMessage).length, [messages]);
  const systemEventCount = useMemo(() => messages.filter((message) => getConversationMeta(message).isSystemEvent).length, [messages]);

  const handleRealtimeMessage = useCallback((event: ConversationMessageCreatedEvent) => {
    if (event.userId !== item.customerId || event.caseId !== item.id) return;
    onRetry?.();
  }, [item.customerId, item.id, onRetry]);

  const handleRealtimeReconnect = useCallback(() => {
    onRetry?.();
  }, [onRetry]);

  const handleRealtimeAnalysisUpdated = useCallback((event: CaseAnalysisUpdatedEvent) => {
    if (event.caseId !== item.id) return;
    onRetry?.();
  }, [item.id, onRetry]);

  useRealtimeEvents({
    onCaseAnalysisUpdated: handleRealtimeAnalysisUpdated,
    onConversationMessageCreated: handleRealtimeMessage,
    onReconnected: handleRealtimeReconnect,
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const rangedMessages = useMemo(() => messages.filter((message) => isInRange(message, range)), [messages, range]);
  const visibleViewMessages = useMemo(
    () => viewMode === "CONVERSATION_ONLY" ? rangedMessages.filter(isConversationMessage) : rangedMessages,
    [rangedMessages, viewMode],
  );

  const filteredMessages = useMemo(() => {
    const normalizedSearch = search.toLocaleLowerCase();
    return visibleViewMessages
      .filter((message) => {
        const meta = getConversationMeta(message);
        if (filter !== "all" && meta.filter !== filter) return false;
        if (!matchesMessageType(message, messageType) || !matchesDeliveryStatus(message, deliveryStatus)) return false;
        if (!normalizedSearch) return true;
        return [item.caseNumber, meta.label, meta.actionLabel, message.senderType, message.messageType, "ทีม Tech", getConversationContent(message)]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase()
          .includes(normalizedSearch);
      })
      .sort((left, right) => {
        const leftTime = new Date(conversationOccurredAt(left)).getTime() || 0;
        const rightTime = new Date(conversationOccurredAt(right)).getTime() || 0;
        return sort === "oldest" ? leftTime - rightTime : rightTime - leftTime;
      });
  }, [deliveryStatus, filter, item.caseNumber, messageType, search, sort, visibleViewMessages]);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisibleCount(PAGE_SIZE), 0);
    return () => window.clearTimeout(timer);
  }, [deliveryStatus, filter, item.id, messageType, range, search, sort, viewMode]);

  const hasActiveFilters = Boolean(searchInput.trim()) || filter !== "all" || messageType !== "all" || deliveryStatus !== "all" || range !== "all";
  const visibleMessages = sort === "oldest"
    ? filteredMessages.slice(Math.max(filteredMessages.length - visibleCount, 0))
    : filteredMessages.slice(0, visibleCount);
  const latestMatchingMessageId = filteredMessages.reduce<ConversationMessage | undefined>((latest, message) => {
    if (!latest || new Date(conversationOccurredAt(message)).getTime() > new Date(conversationOccurredAt(latest)).getTime()) return message;
    return latest;
  }, undefined)?.id;
  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setFilter("all");
    setMessageType("all");
    setDeliveryStatus("all");
    setRange("all");
    setSort("oldest");
    setViewMode("CONVERSATION_ONLY");
  };

  if (isLoading) {
    return <Card padding="md" radius="md" withBorder><Stack gap="sm"><Skeleton height={70} radius="md" /><Skeleton height={96} radius="md" /><Skeleton height={52} radius="md" /><Skeleton height={78} radius="md" /></Stack></Card>;
  }

  if (error) {
    return <Card padding="md" radius="md" withBorder><Stack gap="sm"><CaseConversationHeader conversationCount={conversationCount} systemEventCount={systemEventCount} totalCount={messages.length} viewMode={viewMode} /><ConversationEmptyState kind="error" onRetry={onRetry} /></Stack></Card>;
  }

  return (
    <Card className="caseConversationSection" padding="md" radius="md" withBorder>
      <Stack gap="sm">
        <CaseConversationHeader conversationCount={conversationCount} systemEventCount={systemEventCount} totalCount={messages.length} viewMode={viewMode} />
        <ConversationFilters
          deliveryStatus={deliveryStatus}
          filter={filter}
          messageType={messageType}
          onClear={clearFilters}
          onDeliveryStatusChange={setDeliveryStatus}
          onFilterChange={setFilter}
          onMessageTypeChange={setMessageType}
          onRangeChange={setRange}
          onSearchChange={setSearchInput}
          onSortChange={setSort}
          onViewModeChange={setViewMode}
          range={range}
          search={searchInput}
          sort={sort}
          viewMode={viewMode}
        />
        {rawMessageRetentionExpired ? <ConversationEmptyState kind="retention" /> : <ConversationTimeline
          hasActiveFilters={hasActiveFilters}
          isConversationOnly={viewMode === "CONVERSATION_ONLY"}
          latestMessageId={latestMatchingMessageId}
          messages={visibleMessages}
          onLoadMore={() => setVisibleCount((count) => Math.min(count + PAGE_SIZE, filteredMessages.length))}
          sort={sort}
          totalMatching={filteredMessages.length}
        />}
        {onReply ? <Stack gap={6} pt="xs">
          <Text fw={600} size="sm">กำลังส่งข้อความในเคส {item.caseNumber}</Text>
          <Group align="flex-end" wrap="nowrap">
            <Textarea autosize disabled={["closed", "resolved", "sent_to_customer"].includes(item.status)} minRows={2} onChange={(event) => setReplyText(event.currentTarget.value)} placeholder="พิมพ์ข้อความถึงผู้ใช้งาน" style={{ flex: 1 }} value={replyText} />
            <Button disabled={!replyText.trim() || ["closed", "resolved", "sent_to_customer"].includes(item.status)} loading={isSending} onClick={() => void (async () => { setIsSending(true); try { await onReply(replyText.trim()); setReplyText(""); } finally { setIsSending(false); } })()}>ส่ง</Button>
          </Group>
        </Stack> : null}
      </Stack>
    </Card>
  );
}
