"use client";

import { Card, Skeleton, Stack } from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import type { SupportCase } from "@/types/app/offMlProject";
import { CaseConversationHeader } from "./CaseConversationHeader";
import { ConversationEmptyState } from "./ConversationEmptyState";
import { ConversationFilters } from "./ConversationFilters";
import { ConversationSummary } from "./ConversationSummary";
import { ConversationTimeline } from "./ConversationTimeline";
import { getConversationContent, getConversationMeta, matchesDeliveryStatus, matchesMessageType } from "./conversation.config";
import type { ConversationDeliveryStatus, ConversationFilter, ConversationMessage, ConversationMessageType, ConversationRange, ConversationSort } from "./types";

const PAGE_SIZE = 10;
const HIDE_SYSTEM_EVENTS_KEY = "off-ml-hide-system-events";

interface CaseConversationProps {
  error?: string;
  isLoading?: boolean;
  item: SupportCase;
  onRetry?: () => void;
}

function isInRange(message: ConversationMessage, range: ConversationRange) {
  if (range === "all") return true;
  const timestamp = new Date(message.createdAt).getTime();
  if (Number.isNaN(timestamp)) return false;
  if (range === "today") {
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" });
    return day.format(new Date(timestamp)) === day.format(new Date());
  }
  const days = range === "7d" ? 7 : 30;
  return timestamp >= Date.now() - days * 24 * 60 * 60 * 1000;
}

export function CaseConversation({ error, isLoading = false, item, onRetry }: CaseConversationProps) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ConversationFilter>("all");
  const [messageType, setMessageType] = useState<ConversationMessageType>("all");
  const [deliveryStatus, setDeliveryStatus] = useState<ConversationDeliveryStatus>("all");
  const [sort, setSort] = useState<ConversationSort>("oldest");
  const [range, setRange] = useState<ConversationRange>("all");
  const [hideSystemEvents, setHideSystemEvents] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const messages = item.conversation ?? [];

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    try {
      setHideSystemEvents(window.sessionStorage.getItem(HIDE_SYSTEM_EVENTS_KEY) === "true");
    } catch {
      setHideSystemEvents(false);
    }
  }, []);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(HIDE_SYSTEM_EVENTS_KEY, String(hideSystemEvents));
    } catch {
      // Session storage may be unavailable in private browsing.
    }
  }, [hideSystemEvents]);

  const rangedMessages = useMemo(() => messages.filter((message) => isInRange(message, range)), [messages, range]);

  const filteredMessages = useMemo(() => {
    const normalizedSearch = search.toLocaleLowerCase();
    return rangedMessages
      .filter((message) => {
        const meta = getConversationMeta(message);
        if (hideSystemEvents && meta.isSystemEvent) return false;
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
        const leftTime = new Date(left.createdAt).getTime() || 0;
        const rightTime = new Date(right.createdAt).getTime() || 0;
        return sort === "oldest" ? leftTime - rightTime : rightTime - leftTime;
      });
  }, [deliveryStatus, filter, hideSystemEvents, item.caseNumber, messageType, rangedMessages, search, sort]);

  const counts = useMemo(() => {
    const initial = { total: 0, customer: 0, bot: 0, system: 0, tech: 0, ai: 0 };
    return rangedMessages.reduce((result, message) => {
      result.total += 1;
      const key = getConversationMeta(message).filter;
      if (key !== "other") result[key] += 1;
      return result;
    }, initial);
  }, [rangedMessages]);

  const lastUpdatedAt = useMemo(() => messages.reduce<string | undefined>((latest, message) => {
    if (!latest || new Date(message.createdAt).getTime() > new Date(latest).getTime()) return message.createdAt;
    return latest;
  }, item.createdAt), [item.createdAt, messages]);

  const latestCustomerAt = useMemo(() => messages
    .filter((message) => message.senderType === "CUSTOMER")
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0]?.createdAt, [messages]);

  useEffect(() => setVisibleCount(PAGE_SIZE), [deliveryStatus, filter, hideSystemEvents, item.id, messageType, range, search, sort]);

  const hasActiveFilters = Boolean(searchInput.trim()) || filter !== "all" || messageType !== "all" || deliveryStatus !== "all" || range !== "all" || hideSystemEvents;
  const visibleMessages = filteredMessages.slice(0, visibleCount);
  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setFilter("all");
    setMessageType("all");
    setDeliveryStatus("all");
    setRange("all");
    setSort("oldest");
    setHideSystemEvents(false);
  };

  if (isLoading) {
    return <Card padding="md" radius="md" withBorder><Stack gap="sm"><Skeleton height={70} radius="md" /><Skeleton height={96} radius="md" /><Skeleton height={52} radius="md" /><Skeleton height={78} radius="md" /></Stack></Card>;
  }

  if (error) {
    return <Card padding="md" radius="md" withBorder><Stack gap="sm"><CaseConversationHeader status={item.status} latestCustomerAt={latestCustomerAt} /><ConversationEmptyState kind="error" onRetry={onRetry} /></Stack></Card>;
  }

  return (
    <Card className="caseConversationSection" padding="md" radius="md" withBorder>
      <Stack gap="sm">
        <CaseConversationHeader latestCustomerAt={latestCustomerAt} status={item.status} />
        <ConversationSummary activeFilter={filter} caseNumber={item.caseNumber} counts={counts} lastUpdatedAt={lastUpdatedAt} onFilterChange={setFilter} onRangeChange={setRange} range={range} />
        <ConversationFilters
          deliveryStatus={deliveryStatus}
          filter={filter}
          hideSystemEvents={hideSystemEvents}
          messageType={messageType}
          onClear={clearFilters}
          onDeliveryStatusChange={setDeliveryStatus}
          onFilterChange={setFilter}
          onHideSystemEventsChange={setHideSystemEvents}
          onMessageTypeChange={setMessageType}
          onSearchChange={setSearchInput}
          onSortChange={setSort}
          search={searchInput}
          sort={sort}
        />
        <ConversationTimeline hasActiveFilters={hasActiveFilters} messages={visibleMessages} onLoadMore={() => setVisibleCount((count) => count + PAGE_SIZE)} totalMatching={filteredMessages.length} />
      </Stack>
    </Card>
  );
}
