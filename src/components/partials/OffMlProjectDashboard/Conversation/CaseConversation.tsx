"use client";

import { Card, Skeleton, Stack } from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import type { SupportCase } from "@/types/app/offMlProject";
import { CaseConversationHeader } from "./CaseConversationHeader";
import { ConversationFilters } from "./ConversationFilters";
import { ConversationEmptyState } from "./ConversationEmptyState";
import { ConversationSummary } from "./ConversationSummary";
import { ConversationTimeline } from "./ConversationTimeline";
import { getConversationContent, getConversationMeta } from "./conversation.config";
import type { ConversationFilter, ConversationMessage, ConversationRange, ConversationSort } from "./types";

const PAGE_SIZE = 10;

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
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ConversationFilter>("all");
  const [sort, setSort] = useState<ConversationSort>("oldest");
  const [range, setRange] = useState<ConversationRange>("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const messages = item.conversation ?? [];

  const rangedMessages = useMemo(() => messages.filter((message) => isInRange(message, range)), [messages, range]);

  const filteredMessages = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    return rangedMessages
      .filter((message) => {
        const meta = getConversationMeta(message);
        if (filter !== "all" && meta.filter !== filter) return false;
        if (!normalizedSearch) return true;

        return [item.caseNumber, meta.label, meta.actionLabel, message.messageType, getConversationContent(message)]
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
  }, [filter, item.caseNumber, rangedMessages, search, sort]);

  const counts = useMemo(() => {
    const initial = { total: 0, customer: 0, bot: 0, system: 0, tech: 0, ai: 0 };
    return rangedMessages.reduce((result, message) => {
      result.total += 1;
      const key = getConversationMeta(message).filter;
      if (key !== "other") result[key] += 1;
      return result;
    }, initial);
  }, [rangedMessages]);

  const lastUpdatedAt = useMemo(() => {
    return messages.reduce<string | undefined>((latest, message) => {
      if (!latest || new Date(message.createdAt).getTime() > new Date(latest).getTime()) return message.createdAt;
      return latest;
    }, item.createdAt);
  }, [item.createdAt, messages]);

  useEffect(() => setVisibleCount(PAGE_SIZE), [filter, range, search, sort, item.id]);

  const hasActiveFilters = Boolean(search.trim()) || filter !== "all" || range !== "all";
  const visibleMessages = filteredMessages.slice(0, visibleCount);

  if (isLoading) {
    return (
      <Card padding="lg" radius="md" withBorder>
        <Stack gap="md">
          <CaseConversationHeader />
          <Skeleton height={96} radius="md" />
          <Skeleton height={52} radius="md" />
          <Skeleton height={88} radius="md" />
          <Skeleton height={88} radius="md" />
        </Stack>
      </Card>
    );
  }

  if (error) {
    return (
      <Card padding="lg" radius="md" withBorder>
        <Stack gap="md">
          <CaseConversationHeader />
          <ConversationEmptyState kind="error" onRetry={onRetry} />
        </Stack>
      </Card>
    );
  }

  return (
    <Card padding="lg" radius="md" withBorder>
      <Stack gap="md">
        <CaseConversationHeader />
        <ConversationSummary
          caseNumber={item.caseNumber}
          counts={counts}
          lastUpdatedAt={lastUpdatedAt}
          onRangeChange={setRange}
          range={range}
        />
        <ConversationFilters
          filter={filter}
          onFilterChange={setFilter}
          onSearchChange={setSearch}
          onSortChange={setSort}
          search={search}
          sort={sort}
        />
        <ConversationTimeline
          hasActiveFilters={hasActiveFilters}
          messages={visibleMessages}
          onLoadMore={() => setVisibleCount((count) => count + PAGE_SIZE)}
          totalMatching={filteredMessages.length}
        />
      </Stack>
    </Card>
  );
}
