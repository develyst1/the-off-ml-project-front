"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  ActionIcon,
  AppShell,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Collapse,
  Drawer,
  Divider,
  Flex,
  Group,
  Modal,
  NavLink,
  Pagination,
  Paper,
  Progress,
  ScrollArea,
  Select,
  Skeleton,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
  Title,
  Tooltip,
} from "@mantine/core";
import { AppIcon } from "@/components/common";
import type { IconName } from "@/components/common/AppIcon";
import {
  getAnalyticsSummary,
  getAutoAnswerLogs,
  getAutoAnswerSolutions,
  getAutomationSettings,
  getCase,
  getCases,
  getConfidenceSuggestions,
  composeAiMessage,
  acceptCase,
  reviewConfidenceSuggestion,
  updateAutomationSettings,
  requestAdditionalInfo,
  replyToCustomer,
  rewriteAdditionalInfoRequest,
  rewriteCustomerReply,
  closeCaseWithReply,
  reopenCase,
  saveCaseAiFeedback,
  refreshCaseExtractedSolution,
} from "@/services/offMlProject.service";
import type { AiComposeMode, AiComposeResult, AiRewriteMode } from "@/services/offMlProject.service";
import type {
  AnalyticsSummary,
  AutoAnswerLog,
  AutoAnswerLogsPage,
  AutoAnswerLogsQuery,
  AutoAnswerSolution,
  AutomationSettings,
  CaseStatus,
  ConfidenceSuggestion,
  SupportCase,
} from "@/types/app/offMlProject";
import { CaseConversation } from "./Conversation/CaseConversation";
import { OFF_ML_PROJECT_TABS } from "./OffMlProjectDashboard.config";
import InboxWorkspace from "./InboxWorkspace";

const statusMeta: Record<CaseStatus, { label: string; color: string }> = {
  new: { label: "เคสใหม่", color: "gray" },
  analyzing: { label: "AI กำลังวิเคราะห์", color: "blue" },
  awaiting_tech: { label: "รอทีม Tech ตอบ", color: "yellow" },
  assigned: { label: "ทีม Tech Support รับเคสแล้ว", color: "blue" },
  tech_replied: { label: "ทีม Tech Support ตอบแล้ว", color: "blue" },
  analyzing_solution: { label: "AI กำลังวิเคราะห์คำตอบ", color: "blue" },
  awaiting_confirmation: { label: "รอยืนยัน AI แนะนำ", color: "blue" },
  awaiting_customer_info: { label: "รอผู้ใช้งานให้ข้อมูล", color: "orange" },
  awaiting_tech_review: { label: "รอตรวจสอบข้อความก่อนส่ง", color: "yellow" },
  resolved: { label: "แก้ไขแล้ว", color: "green" },
  sent_to_customer: { label: "ส่งคำตอบให้ผู้ใช้งานแล้ว", color: "green" },
  closed: { label: "ปิดเคสแล้ว", color: "green" },
  reopened: { label: "เปิดเคสกลับมาตรวจสอบ", color: "orange" },
  in_progress: { label: "กำลังดำเนินการ", color: "blue" },
  sent: { label: "ส่งข้อความแล้ว", color: "green" },
  sla_breach: { label: "เกิน SLA", color: "red" },
};

const fallbackStatusMeta = { label: "ไม่ทราบสถานะ", color: "gray" };

function getRootTab(value: string | null) {
  return value === "cases" || OFF_ML_PROJECT_TABS.some((tab) => tab.value === value) ? value : "inbox";
}

const autoAnswerLogEventLabels: Record<string, string> = {
  CASE_ACKNOWLEDGEMENT: "รับเรื่อง",
  CUSTOMER_REPLY: "ตอบผู้ใช้งาน",
  REQUEST_MORE_INFO: "ขอข้อมูลเพิ่ม",
  STATUS_UPDATE: "อัปเดตสถานะ",
  CASE_CLOSED: "ปิดเคส",
};

function getStatusMeta(status: CaseStatus) {
  return statusMeta[status] ?? fallbackStatusMeta;
}

const WAITING_TECH_STATUS = statusMeta.awaiting_tech.label;

function displayCategory(category?: string | null) {
  const value = category?.trim();
  if (!value || value === "-" || value.toLowerCase() === "undefined" || value.toLowerCase() === "null") {
    return "ยังไม่ระบุหมวดหมู่";
  }

  return value;
}

function normalizeAnalyticsCategoryKey(keyValue?: string | null, labelValue?: string | null) {
  const key = keyValue?.trim() ?? "";
  const label = labelValue?.trim() ?? "";
  const decode = (value: string) => {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  };
  const normalizedKey = decode(key).toLowerCase();
  const normalizedLabel = decode(label).toLowerCase();
  const otherAliases = new Set([
    "",
    "-",
    "null",
    "undefined",
    "other",
    "อื่นๆ",
    "ยังไม่ระบุหมวดหมู่",
  ]);

  return otherAliases.has(normalizedKey) || otherAliases.has(normalizedLabel)
    ? "OTHER"
    : key.toUpperCase();
}

function formatEventTime(value?: string) {
  if (!value) return "ยังไม่มีข้อมูล";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "ข้อมูลเวลาไม่ถูกต้อง";
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(date);
}

function formatEventDate(value?: string) {
  if (!value) return "ยังไม่มีข้อมูล";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "ข้อมูลเวลาไม่ถูกต้อง";
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeZone: "Asia/Bangkok",
  }).format(date);
}

function formatEventClock(value?: string) {
  if (!value) return "ยังไม่มีข้อมูล";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "ข้อมูลเวลาไม่ถูกต้อง";
  return new Intl.DateTimeFormat("th-TH", {
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(date);
}

const EMPTY_ANALYTICS_SUMMARY: AnalyticsSummary = {
  total: 0,
  solvedFromExistingSolutionPct: 0,
  overSla: 0,
  readyForAutoAnswer: 0,
  categories: [],
  confidenceDistribution: [
    { label: "0-59%", value: 0 },
    { label: "60-89%", value: 0 },
    { label: "90-97%", value: 0 },
    { label: "98-100%", value: 0 },
  ],
};

const EMPTY_AUTO_ANSWER_LOGS_PAGE: AutoAnswerLogsPage = {
  items: [],
  totalItems: 0,
  totalPages: 0,
  page: 1,
  pageSize: 10,
};

function confidenceColor(value: number) {
  if (value >= 90) return "green";
  if (value >= 70) return "orange";
  return "red";
}

function confidenceLabel(value: number) {
  if (value >= 90) return `สูง ${value}%`;
  if (value >= 70) return `ควรตรวจสอบ ${value}%`;
  return `ต่ำ ${value}%`;
}

function timeFilterLabel(value: string) {
  if (value === "1") return "24 ชั่วโมง";
  return `${value} วัน`;
}

function relativeTime(value?: string) {
  if (!value) return "ยังไม่มีข้อมูล";
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return "ข้อมูลเวลาไม่ถูกต้อง";
  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60000));
  if (minutes < 1) return "เมื่อสักครู่นี้";
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
  return `${Math.floor(hours / 24)} วันที่แล้ว`;
}

function teamsDeliveryMeta(item: SupportCase) {
  if (item.teamsDeliveryStatus === "failed") {
    return { color: "red", label: "ส่งเข้า Teams ไม่สำเร็จ" };
  }

  if (item.teamsDeliveryStatus === "accepted") {
    return { color: "green", label: "ส่งเข้า Teams สำเร็จ" };
  }

  if (!item.teamsDeliveryStatus && item.status !== "new" && item.status !== "analyzing") {
    return { color: "yellow", label: "ยังไม่ทราบผลการส่ง Teams" };
  }

  return { color: "gray", label: "กำลังเตรียมส่งเข้า Teams" };
}

function MetricCard({
  active = false,
  icon,
  isLoading = false,
  label,
  muted = false,
  onClick,
  value,
  color,
}: {
  active?: boolean;
  icon: IconName;
  isLoading?: boolean;
  label: string;
  muted?: boolean;
  onClick?: () => void;
  value: string;
  color: string;
}) {
  return (
    <Card
      aria-pressed={onClick ? active : undefined}
      className={`metricCard ${active ? "metricCardActive" : ""} ${muted ? "metricCardMuted" : ""}`}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!onClick) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      padding="lg"
      radius="md"
      role={onClick ? "button" : undefined}
      style={onClick ? { cursor: "pointer" } : undefined}
      tabIndex={onClick ? 0 : undefined}
      withBorder
    >
      <Group gap="md" wrap="nowrap">
        <ThemeIcon color={color} radius="md" size={42} variant="light">
          <AppIcon name={icon} />
        </ThemeIcon>
        <Box>
          {isLoading ? <>
            <Skeleton height={28} mb={6} width={48} />
            <Skeleton height={14} width={112} />
          </> : <>
            <Title order={2}>{value}</Title>
            <Text c="dimmed" size="sm">
              {label}
            </Text>
          </>}
        </Box>
      </Group>
    </Card>
  );
}

const DEFAULT_CASE_INBOX_FILTERS = {
  search: "",
  status: null as string | null,
  category: null as string | null,
  confidence: "all",
  time: "all",
  scope: "all",
  sort: "priority",
  unreadOnly: false,
  slaOnly: false,
  page: 1,
} as const;

type CaseInboxKpi = "waiting-tech" | "awaiting-confirmation" | "closed-this-month" | "sla";

function CaseInbox({
  cases,
  drillDown,
  error,
  isLoading,
  onOpenCase,
  onRefresh,
  selectedCaseId,
}: {
  cases: SupportCase[];
  drillDown?: { category?: string; confidence?: string; requestId: number };
  error?: string;
  isLoading: boolean;
  onOpenCase: (item: SupportCase) => void;
  onRefresh: () => void;
  selectedCaseId?: string;
}) {
  const [search, setSearch] = useState<string>(DEFAULT_CASE_INBOX_FILTERS.search);
  const [statusFilter, setStatusFilter] = useState<string | null>(DEFAULT_CASE_INBOX_FILTERS.status);
  const categoryFromUrl = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("category");
  const kpiFromUrl = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("kpi") as CaseInboxKpi | null;
  const [categoryFilter, setCategoryFilter] = useState<string | null>(drillDown?.category ?? categoryFromUrl ?? DEFAULT_CASE_INBOX_FILTERS.category);
  const [activeKpi, setActiveKpi] = useState<CaseInboxKpi | null>(kpiFromUrl);
  const [confidenceFilter, setConfidenceFilter] = useState<string>(drillDown?.confidence ?? DEFAULT_CASE_INBOX_FILTERS.confidence);
  const [timeFilter, setTimeFilter] = useState<string>(DEFAULT_CASE_INBOX_FILTERS.time);
  const [timeFilterReference, setTimeFilterReference] = useState<number | null>(null);
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  const [unreadOnly, setUnreadOnly] = useState<boolean>(DEFAULT_CASE_INBOX_FILTERS.unreadOnly);
  const [slaOnly, setSlaOnly] = useState<boolean>(DEFAULT_CASE_INBOX_FILTERS.slaOnly);
  const [caseScope, setCaseScope] = useState<string>(DEFAULT_CASE_INBOX_FILTERS.scope);
  const [sortMode, setSortMode] = useState<string>(DEFAULT_CASE_INBOX_FILTERS.sort);
  const [casePage, setCasePage] = useState<number>(DEFAULT_CASE_INBOX_FILTERS.page);
  const [casePageSize, setCasePageSize] = useState<10 | 20 | 50>(10);
  const [filtersOpen, setFiltersOpen] = useState(Boolean(drillDown));
  const updateInboxQuery = (input: { category?: string | null; kpi?: CaseInboxKpi | null }) => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", "cases");
    const nextCategory = input.category === undefined ? categoryFilter : input.category;
    const nextKpi = input.kpi === undefined ? activeKpi : input.kpi;
    if (nextCategory) url.searchParams.set("category", nextCategory);
    else url.searchParams.delete("category");
    if (nextKpi) url.searchParams.set("kpi", nextKpi);
    else url.searchParams.delete("kpi");
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
    onRefresh();
  };

  const closedStatuses = new Set<CaseStatus>(["resolved", "closed", "sent_to_customer", "sent"]);
  const priorityOrder: Partial<Record<CaseStatus, number>> = {
    sla_breach: 0,
    awaiting_tech: 1,
    in_progress: 2,
    analyzing: 2,
    analyzing_solution: 2,
    awaiting_customer_info: 3,
    closed: 5,
    resolved: 5,
    sent_to_customer: 5,
    sent: 5,
  };
  const categories = [...new Map(cases.map((item) => [item.categoryKey, item.category])).entries()]
    .map(([value, label]) => ({ value, label }));
  const statusOptions = Object.entries(statusMeta).map(([value, meta]) => ({ value, label: meta.label }));

  const filteredCases = cases
    .filter((item) => {
      const searchable = [item.caseNumber, item.customerName, item.problemSummary, item.initialCustomerMessage, item.latestCustomerMessage, item.categoryKey, item.category]
        .join(" ")
        .toLocaleLowerCase();
      if (search.trim() && !searchable.includes(search.trim().toLocaleLowerCase())) return false;
      if (statusFilter && item.status !== statusFilter) return false;
      if (categoryFilter && item.categoryKey !== categoryFilter) return false;
      if (unreadOnly && !item.hasUnreadCustomerMessage) return false;
      if (slaOnly && !item.isSlaBreached) return false;
      if (caseScope === "open" && closedStatuses.has(item.status)) return false;
      if (caseScope === "closed" && !closedStatuses.has(item.status)) return false;
      if (confidenceFilter !== "all") {
        const confidence = item.aiConfidence;
        const inRange = confidenceFilter === "0-59" ? confidence < 60
          : confidenceFilter === "60-89" ? confidence >= 60 && confidence < 90
            : confidenceFilter === "90-97" ? confidence >= 90 && confidence < 98
              : confidenceFilter === "98-100" ? confidence >= 98
                : false;
        if (!inRange || item.analysisStatus === "AI_FAILED" || item.analysisStatus === "NO_CUSTOMER_MESSAGE") return false;
      }
      if (timeFilter !== "all") {
        const activityAt = new Date(item.lastActivityAt).getTime();
        if (timeFilter === "today" && timeFilterReference !== null) {
          const today = new Date(timeFilterReference);
          today.setHours(0, 0, 0, 0);
          if (activityAt < today.getTime()) return false;
        } else if (timeFilter === "custom") {
          const from = customDateFrom ? new Date(`${customDateFrom}T00:00:00`).getTime() : undefined;
          const to = customDateTo ? new Date(`${customDateTo}T23:59:59.999`).getTime() : undefined;
          if ((from !== undefined && activityAt < from) || (to !== undefined && activityAt > to)) return false;
        } else {
          const days = Number(timeFilter);
          if (timeFilterReference !== null && timeFilterReference - activityAt > days * 24 * 60 * 60 * 1000) return false;
        }
      }
      return true;
    })
    .sort((left, right) => {
      if (sortMode === "oldest") return new Date(left.lastActivityAt).getTime() - new Date(right.lastActivityAt).getTime();
      if (sortMode === "latest") return new Date(right.lastActivityAt).getTime() - new Date(left.lastActivityAt).getTime();
      if (left.isSlaBreached !== right.isSlaBreached) return left.isSlaBreached ? -1 : 1;
      const priorityDifference = (priorityOrder[left.status] ?? 4) - (priorityOrder[right.status] ?? 4);
      return priorityDifference || new Date(right.lastActivityAt).getTime() - new Date(left.lastActivityAt).getTime();
    });

  const caseTotalPages = Math.max(1, Math.ceil(filteredCases.length / casePageSize));
  const currentCasePage = Math.min(casePage, caseTotalPages);
  const visibleCases = filteredCases.slice((currentCasePage - 1) * casePageSize, currentCasePage * casePageSize);

  const hasFilters = Boolean(
    search !== DEFAULT_CASE_INBOX_FILTERS.search
    || statusFilter !== DEFAULT_CASE_INBOX_FILTERS.status
    || categoryFilter !== DEFAULT_CASE_INBOX_FILTERS.category
    || activeKpi !== null
    || unreadOnly !== DEFAULT_CASE_INBOX_FILTERS.unreadOnly
    || slaOnly !== DEFAULT_CASE_INBOX_FILTERS.slaOnly
    || confidenceFilter !== DEFAULT_CASE_INBOX_FILTERS.confidence
    || timeFilter !== DEFAULT_CASE_INBOX_FILTERS.time
    || Boolean(customDateFrom || customDateTo)
    || caseScope !== DEFAULT_CASE_INBOX_FILTERS.scope
    || sortMode !== DEFAULT_CASE_INBOX_FILTERS.sort,
  );
  const resetFilters = () => {
    setSearch(DEFAULT_CASE_INBOX_FILTERS.search);
    setStatusFilter(DEFAULT_CASE_INBOX_FILTERS.status);
    setCategoryFilter(DEFAULT_CASE_INBOX_FILTERS.category);
    setActiveKpi(null);
    updateInboxQuery({ category: null, kpi: null });
    setConfidenceFilter(DEFAULT_CASE_INBOX_FILTERS.confidence);
    setTimeFilter(DEFAULT_CASE_INBOX_FILTERS.time);
    setTimeFilterReference(null);
    setCustomDateFrom("");
    setCustomDateTo("");
    setUnreadOnly(DEFAULT_CASE_INBOX_FILTERS.unreadOnly);
    setSlaOnly(DEFAULT_CASE_INBOX_FILTERS.slaOnly);
    setCaseScope(DEFAULT_CASE_INBOX_FILTERS.scope);
    setSortMode(DEFAULT_CASE_INBOX_FILTERS.sort);
    setCasePage(DEFAULT_CASE_INBOX_FILTERS.page);
    setFiltersOpen(false);
  };

  const waitingCount = cases.filter((item) => item.status === "awaiting_tech").length;
  const confirmationCount = cases.filter((item) => item.status === "awaiting_confirmation").length;
  const closedCount = cases.filter((item) => ["resolved", "closed", "sent_to_customer", "sent"].includes(item.status)).length;
  const slaCount = cases.filter((item) => item.isSlaBreached).length;

  const handleSummaryFilter = (filter: CaseInboxKpi) => {
    const nextKpi = activeKpi === filter ? null : filter;
    setActiveKpi(nextKpi);
    updateInboxQuery({ kpi: nextKpi });
    if (filter === "waiting-tech") {
      setStatusFilter(nextKpi ? "awaiting_tech" : null);
      setCasePage(1);
      return;
    }
    if (filter === "awaiting-confirmation") {
      setStatusFilter(nextKpi ? "awaiting_confirmation" : null);
      setCasePage(1);
      return;
    }
    if (filter === "closed-this-month") {
      setCaseScope(nextKpi ? "closed" : DEFAULT_CASE_INBOX_FILTERS.scope);
      setCasePage(1);
      return;
    }
    setSlaOnly(Boolean(nextKpi));
    setCasePage(1);
  };

  return (
    <Stack gap="lg">
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        <MetricCard active={activeKpi === "waiting-tech"} color="blue" icon="inbox" isLoading={isLoading} label="รอตรวจสอบ" onClick={() => handleSummaryFilter("waiting-tech")} value={String(waitingCount)} />
        <MetricCard active={activeKpi === "awaiting-confirmation"} color="yellow" icon="brain" isLoading={isLoading} label="รอทีมยืนยันคำแนะนำ AI" onClick={() => handleSummaryFilter("awaiting-confirmation")} value={String(confirmationCount)} />
        <MetricCard active={activeKpi === "sla"} color="red" icon="alert" isLoading={isLoading} label="เกิน SLA" onClick={() => handleSummaryFilter("sla")} value={String(slaCount)} />
        <MetricCard active={activeKpi === "closed-this-month"} color="green" icon="check" isLoading={isLoading} label="ปิดแล้วเดือนนี้" onClick={() => handleSummaryFilter("closed-this-month")} value={String(closedCount)} />
      </SimpleGrid>

      {error ? (
        <Alert color="red" radius="md" title="เชื่อมต่อ backend ไม่สำเร็จ" variant="light">
          <Group justify="space-between">
            <Text>{error}</Text>
            <Button onClick={onRefresh} size="xs" variant="light">
              โหลดใหม่
            </Button>
          </Group>
        </Alert>
      ) : null}

      <Card padding="lg" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <Title order={3}>รายการเคส</Title>
          <Tooltip label="Confidence คือระดับความมั่นใจของ AI จากการวิเคราะห์ข้อความผู้ใช้งาน" multiline w={260}>
            <Text c="dimmed" size="xs" style={{ alignItems: "center", cursor: "help", display: "inline-flex", gap: 4 }}>
              AI วิเคราะห์ <AppIcon name="info" size={14} />
            </Text>
          </Tooltip>
        </Group>

        <Box className="caseInboxFilters" mb="md">
          <Box className="caseInboxFilterToolbar">
            <TextInput
              aria-label="ค้นหารายการเคส"
              className="caseInboxFilterSearch"
              onChange={(event) => { setSearch(event.currentTarget.value); setCasePage(1); }}
              placeholder="เลขเคส ชื่อผู้ใช้งาน หรือปัญหาที่แจ้ง"
              value={search}
            />
            <Button
              aria-expanded={filtersOpen}
              leftSection={<AppIcon name="settings" size={15} />}
              onClick={() => setFiltersOpen((current) => !current)}
              variant={hasFilters ? "light" : "default"}
            >
              ตัวกรอง{hasFilters ? "*" : ""}
            </Button>
            <Select
              aria-label="เรียงลำดับรายการเคส"
              data={[{ value: "priority", label: "เรียงตามความสำคัญ" }, { value: "latest", label: "ล่าสุดก่อน" }, { value: "oldest", label: "เก่าสุดก่อน" }]}
              onChange={(value) => { setSortMode(value ?? DEFAULT_CASE_INBOX_FILTERS.sort); setCasePage(1); }}
              value={sortMode}
              w={190}
            />
            <Button disabled={!hasFilters} onClick={resetFilters} variant="subtle">รีเซ็ต</Button>
          </Box>
          <Collapse expanded={filtersOpen}>
            <Paper className="caseInboxFilterPanel" p="md" radius="md" withBorder>
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="sm">
                <Select clearable data={statusOptions} label="สถานะ" onChange={(value) => { setStatusFilter(value); setCasePage(1); }} placeholder="ทั้งหมด" value={statusFilter} />
                <Select clearable data={categories} label="หมวดหมู่" onChange={(value) => { setCategoryFilter(value); setCasePage(1); updateInboxQuery({ category: value }); }} placeholder="ทั้งหมด" value={categoryFilter} />
                <Select data={[{ value: "all", label: "ทุกระดับ" }, { value: "0-59", label: "ต่ำกว่า 60%" }, { value: "60-89", label: "ควรตรวจสอบ 60-89%" }, { value: "90-97", label: "สูง 90-97%" }, { value: "98-100", label: "สูงมาก 98-100%" }]} label="Confidence" onChange={(value) => { setConfidenceFilter(value ?? DEFAULT_CASE_INBOX_FILTERS.confidence); setCasePage(1); }} value={confidenceFilter} />
                <Select data={[{ value: "all", label: "ทุกช่วงเวลา" }, { value: "today", label: "วันนี้" }, { value: "7", label: "7 วัน" }, { value: "30", label: "30 วัน" }, { value: "custom", label: "กำหนดเอง" }]} label="ช่วงเวลา" onChange={(value) => { const nextValue = value ?? DEFAULT_CASE_INBOX_FILTERS.time; setTimeFilter(nextValue); setTimeFilterReference(nextValue !== "all" && nextValue !== "custom" ? Date.now() : null); setCasePage(1); }} value={timeFilter} />
                {timeFilter === "custom" ? <Group align="flex-end" gap="sm" wrap="nowrap"><TextInput label="ตั้งแต่วันที่" onChange={(event) => { setCustomDateFrom(event.currentTarget.value); setCasePage(1); }} type="date" value={customDateFrom} /><TextInput label="ถึงวันที่" onChange={(event) => { setCustomDateTo(event.currentTarget.value); setCasePage(1); }} type="date" value={customDateTo} /></Group> : null}
                <Select data={[{ value: "open", label: "เคสที่เปิดอยู่" }, { value: "closed", label: "เคสที่ปิดแล้ว" }, { value: "all", label: "ทุกเคส" }]} label="แสดงเคส" onChange={(value) => { setCaseScope(value ?? DEFAULT_CASE_INBOX_FILTERS.scope); setCasePage(1); }} value={caseScope} />
                <Group align="flex-end" gap="lg" wrap="wrap">
                  <Switch checked={unreadOnly} label="เฉพาะข้อความใหม่" onChange={(event) => { setUnreadOnly(event.currentTarget.checked); setCasePage(1); }} />
                  <Switch checked={slaOnly} label="เฉพาะเคสเกิน SLA" onChange={(event) => { setSlaOnly(event.currentTarget.checked); setCasePage(1); }} />
                </Group>
              </SimpleGrid>
            </Paper>
          </Collapse>
          <Flex align="center" className="caseInboxFilterSummary" gap="xs" justify="space-between" wrap="wrap">
            <Group gap="xs" wrap="wrap">
              {search ? <Button onClick={() => { setSearch(DEFAULT_CASE_INBOX_FILTERS.search); setCasePage(1); }} size="compact-xs" variant="light">ค้นหา: {search} ×</Button> : null}
              {statusFilter ? <Button onClick={() => { setStatusFilter(null); setCasePage(1); }} size="compact-xs" variant="light">สถานะ: {getStatusMeta(statusFilter as CaseStatus).label} ×</Button> : null}
              {categoryFilter ? <Button onClick={() => { setCategoryFilter(null); setCasePage(1); updateInboxQuery({ category: null }); }} size="compact-xs" variant="light">หมวดหมู่: {categories.find((category) => category.value === categoryFilter)?.label ?? categoryFilter} ×</Button> : null}
              {activeKpi ? <Button color={activeKpi === "sla" ? "red" : undefined} onClick={() => handleSummaryFilter(activeKpi)} size="compact-xs" variant="light">{activeKpi === "waiting-tech" ? "สถานะ: รอตรวจสอบ" : activeKpi === "awaiting-confirmation" ? "สถานะ: รอทีมยืนยันคำแนะนำ AI" : activeKpi === "closed-this-month" ? "สถานะ: ปิดแล้วเดือนนี้" : "สถานะ: เกิน SLA"} ×</Button> : null}
              {confidenceFilter !== "all" ? <Button onClick={() => { setConfidenceFilter(DEFAULT_CASE_INBOX_FILTERS.confidence); setCasePage(1); }} size="compact-xs" variant="light">Confidence: {confidenceFilter} ×</Button> : null}
              {timeFilter !== "all" ? <Button onClick={() => { setTimeFilter(DEFAULT_CASE_INBOX_FILTERS.time); setTimeFilterReference(null); setCustomDateFrom(""); setCustomDateTo(""); setCasePage(1); }} size="compact-xs" variant="light">ช่วงเวลา: {timeFilter === "today" ? "วันนี้" : timeFilter === "custom" ? "กำหนดเอง" : timeFilterLabel(timeFilter)} ×</Button> : null}
              {caseScope !== "all" ? <Button onClick={() => { setCaseScope(DEFAULT_CASE_INBOX_FILTERS.scope); setCasePage(1); }} size="compact-xs" variant="light">แสดงเคส: {caseScope === "open" ? "เปิดอยู่" : "ปิดแล้ว"} ×</Button> : null}
              {unreadOnly ? <Button onClick={() => { setUnreadOnly(false); setCasePage(1); }} size="compact-xs" variant="light">ข้อความใหม่ ×</Button> : null}
              {slaOnly ? <Button color="red" onClick={() => { setSlaOnly(false); setCasePage(1); }} size="compact-xs" variant="light">เกิน SLA ×</Button> : null}
            </Group>
            {isLoading ? <Skeleton height={14} width={180} /> : <Text c="dimmed" size="xs">แสดง {filteredCases.length === 0 ? 0 : ((currentCasePage - 1) * casePageSize) + 1}–{Math.min(currentCasePage * casePageSize, filteredCases.length)} จากทั้งหมด {filteredCases.length} เคส</Text>}
          </Flex>
        </Box>

        <ScrollArea className="caseInboxTableScroll" type="auto">
          <Table className="caseInboxTable" highlightOnHover verticalSpacing="sm" style={{ tableLayout: "fixed", width: "100%" }}>
            <colgroup>
              <col style={{ width: 180 }} />
              <col />
              <col style={{ width: 220 }} />
              <col style={{ width: 160 }} />
              <col style={{ width: 150 }} />
              <col style={{ width: 120 }} />
            </colgroup>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>ผู้ใช้งาน / เลขเคส</Table.Th>
                <Table.Th>ปัญหาที่แจ้ง</Table.Th>
                <Table.Th ta="center">หมวดหมู่</Table.Th>
                <Table.Th ta="center">
                  <Tooltip label="ระดับความมั่นใจของ AI จากการวิเคราะห์ข้อความผู้ใช้งาน">
                    <span style={{ alignItems: "center", display: "inline-flex", gap: 4 }}>AI วิเคราะห์ <AppIcon name="info" size={14} /></span>
                  </Tooltip>
                </Table.Th>
                <Table.Th ta="center">สถานะ</Table.Th>
                <Table.Th ta="center">Action</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {isLoading ? Array.from({ length: 5 }, (_, index) => (
                <Table.Tr key={`case-loading-${index}`}>
                  {Array.from({ length: 6 }, (_, cellIndex) => (
                    <Table.Td key={cellIndex}><Skeleton height={cellIndex === 1 ? 34 : 20} /></Table.Td>
                  ))}
                </Table.Tr>
              )) : visibleCases.map((item) => {
                const caseStatusMeta = getStatusMeta(item.status);

                return (
                <Table.Tr
                  className={`caseInboxRow${selectedCaseId === item.id ? " isSelected" : ""}${item.hasUnreadCustomerMessage ? " hasUnread" : ""}${item.isSlaBreached ? " isSlaBreached" : ""}`}
                  key={item.id}
                >
                  <Table.Td>
                    <Text fw={700}>{item.customerName}</Text>
                    <Text c="dimmed" size="xs">
                      เคส {item.caseNumber}
                    </Text>
                    <Text c="dimmed" size="xs">อัปเดต {relativeTime(item.lastActivityAt)}</Text>
                    {item.hasUnreadCustomerMessage ? <Badge color="blue" mt={4} size="xs" variant="light">ข้อความใหม่</Badge> : null}
                  </Table.Td>
                  <Table.Td className="tableCellText">
                    <Text fw={item.hasUnreadCustomerMessage ? 700 : 600} lineClamp={1} style={{ overflowWrap: "anywhere" }} title={item.problemSummary}>{item.problemSummary}</Text>
                    {item.problemSummaryStatus === "SUCCESS" ? <Badge color="violet" mt={4} size="xs" variant="light">AI สรุป</Badge> : null}
                    {item.latestMessage?.text && item.latestMessage.text !== item.problemSummary && item.latestMessage.text !== item.initialCustomerMessage ? (
                      <Group gap={4} mt={4} wrap="nowrap">
                        <Badge color={item.latestMessage.source === "CUSTOMER" ? "blue" : item.latestMessage.source === "TECH_SUPPORT" ? "indigo" : item.latestMessage.source === "LINE_BOT" ? "green" : "gray"} size="xs" variant="light">
                          {item.latestMessage.source === "CUSTOMER" ? "ผู้ใช้งาน" : item.latestMessage.source === "TECH_SUPPORT" ? "Tech Support" : item.latestMessage.source === "LINE_BOT" ? "LINE Bot" : "ระบบ"}
                        </Badge>
                        <Text c="dimmed" lineClamp={1} size="xs" title={item.latestMessage.text}>{item.latestMessage.text}</Text>
                      </Group>
                    ) : null}
                  </Table.Td>
                  <Table.Td ta="center">
                    <Badge variant="light">{item.category}</Badge>
                  </Table.Td>
                  <Table.Td>
                    {item.analysisStatus === "AI_FAILED" || item.analysisStatus === "NO_CUSTOMER_MESSAGE" ? <Text c="dimmed">-</Text> : (
                      <Stack align="center" gap={4}>
                        <Text c={confidenceColor(item.aiConfidence)} fw={700} size="sm">{confidenceLabel(item.aiConfidence)}</Text>
                        <Progress color={confidenceColor(item.aiConfidence)} miw={88} size="xs" value={item.aiConfidence} />
                      </Stack>
                    )}
                  </Table.Td>
                  <Table.Td ta="center">
                    <Badge color={caseStatusMeta.color} variant="light">
                      {caseStatusMeta.label}
                    </Badge>
                    {item.isSlaBreached && item.status !== "sla_breach" ? <Badge color="red" mt={4} size="xs" variant="light">เกิน SLA</Badge> : null}
                  </Table.Td>
                  <Table.Td ta="center">
                    <Button aria-label={`เปิดเคส ${item.caseNumber}`} fullWidth onClick={(event) => { event.stopPropagation(); onOpenCase(item); }} size="xs" variant="light">
                      ดูเคส
                    </Button>
                  </Table.Td>
                </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </ScrollArea>
        {!isLoading && visibleCases.length === 0 ? (
          <Paper bg="gray.0" mt="md" p="lg" radius="md">
            <Text fw={700}>{cases.length === 0 ? "ยังไม่มีเคสจาก backend" : "ไม่พบเคสตามตัวกรอง"}</Text>
            <Text c="dimmed" size="sm">
              {cases.length === 0 ? "เมื่อมีข้อมูลจาก POST /webhooks/line รายการเคสจะแสดงในตารางนี้" : "ลองเปลี่ยนตัวกรองหรือล้างตัวกรองเพื่อดูรายการอื่น"}
            </Text>
            {cases.length > 0 && hasFilters ? <Button mt="sm" onClick={resetFilters} size="xs" variant="light">ล้างตัวกรอง</Button> : null}
          </Paper>
        ) : null}
        {caseTotalPages > 1 ? (
          <Flex className="caseInboxPagination" align="center" justify="space-between" mt="md" gap="sm" wrap="wrap">
            <Text c="dimmed" size="sm">
              แสดง {((currentCasePage - 1) * casePageSize) + 1}–{Math.min(currentCasePage * casePageSize, filteredCases.length)} จากทั้งหมด {filteredCases.length} เคส
            </Text>
            <Group className="caseInboxPaginationControls" gap="sm" wrap="wrap">
              <Select
                aria-label="จำนวนเคสต่อหน้า"
                data={["10", "20", "50"]}
                onChange={(value) => {
                  setCasePageSize((Number(value) || 10) as 10 | 20 | 50);
                  setCasePage(1);
                }}
                value={String(casePageSize)}
                w={92}
              />
              <Pagination
                boundaries={1}
                className="caseInboxPaginationNav"
                disabled={isLoading}
                getControlProps={(control) => {
                  const labels = {
                    first: "ไปหน้าแรก",
                    previous: "หน้าก่อนหน้า",
                    next: "หน้าถัดไป",
                    last: "ไปหน้าสุดท้าย",
                  } as const;
                  return { "aria-label": labels[control], title: labels[control] };
                }}
                getItemProps={(page) => ({
                  "aria-label": `ไปหน้า ${page}`,
                  ...(page === currentCasePage ? { "aria-current": "page" } : {}),
                })}
                onChange={setCasePage}
                radius="md"
                siblings={1}
                size="sm"
                total={caseTotalPages}
                value={currentCasePage}
                withEdges
              />
            </Group>
          </Flex>
        ) : null}
      </Card>
    </Stack>
  );
}

export { CaseInbox };

function CaseDetail({
  item,
  isLoading,
  initialAction,
  onInitialActionHandled,
  onAcceptCase,
  onReply,
  onCloseCase,
  onRewriteAi,
  onReopenCase,
  onRequestInfo,
  onSaveAiFeedback,
  onRefreshSolution,
  onBackToInbox,
}: {
  item: SupportCase | null;
  isLoading: boolean;
  initialAction?: "accept" | "request-info";
  onInitialActionHandled: () => void;
  onAcceptCase: () => Promise<void>;
  onReply: (text: string) => Promise<void>;
  onCloseCase: (text: string, closedWithoutTechConfirmation?: boolean, closeSummary?: { cause: string; resolution: string; prevention: string }) => Promise<void>;
  onComposeAi: (mode: AiComposeMode, supportInstruction?: string, requestedInformation?: string) => Promise<AiComposeResult>;
  onRewriteAi: (mode: AiRewriteMode, text: string) => Promise<{ rewrittenMessage: string; rewrittenMessageId?: string; usedFallback?: boolean }>;
  onReopenCase: (reason: string) => Promise<void>;
  onRequestInfo: (text: string, sourceMessageId?: string) => Promise<void>;
  onSaveAiFeedback: (input: { analysisId: string; analysisVersion: number; feedbackType: "ISSUE_UNDERSTANDING" | "SOLUTION_SELECTION"; result: "CORRECT" | "INCORRECT" }) => Promise<void>;
  onRefreshSolution: () => Promise<void>;
  onBackToInbox: () => void;
}) {
  const teamsAction = "ยังไม่มีการดำเนินการจากปุ่มในการ์ด Teams";
  const [actionState, setActionState] = useState<"idle" | "accepting" | "requesting" | "replying" | "closing" | "reopening" | "rewriting">("idle");
  const [actionError, setActionError] = useState<string>();
  const [actionNotice, setActionNotice] = useState<string>();
  const [feedbackSaving, setFeedbackSaving] = useState<Partial<Record<"caseUnderstandingFeedback" | "solutionSelectionFeedback", boolean>>>({});
  const [feedbackError, setFeedbackError] = useState<string>();
  const [isRefreshingSolution, setIsRefreshingSolution] = useState(false);
  const [analysisToastVisible, setAnalysisToastVisible] = useState(false);
  const [requestInfoDraftMessageId, setRequestInfoDraftMessageId] = useState<string>();
  const [customerReplyDraft, setCustomerReplyDraft] = useState("");
  const [requestInfoDraft, setRequestInfoDraft] = useState("");
  const [actionMode, setActionMode] = useState<"CUSTOMER_REPLY" | "REQUEST_MORE_INFO">("CUSTOMER_REPLY");
  const [composerTab, setComposerTab] = useState<"reply" | "request-info" | "close">("reply");
  const [closeCause, setCloseCause] = useState("");
  const [closeResolution, setCloseResolution] = useState("");
  const [closePrevention, setClosePrevention] = useState("");
  const [closeValidationAttempted, setCloseValidationAttempted] = useState(false);
  const [closeTouchedFields, setCloseTouchedFields] = useState<Record<"cause" | "resolution" | "prevention" | "message", boolean>>({
    cause: false,
    resolution: false,
    prevention: false,
    message: false,
  });
  const [closeConfirmationOpen, setCloseConfirmationOpen] = useState(false);
  const [closeMessageText, setCloseMessageText] = useState("");
  const [closeMessageManuallyEdited, setCloseMessageManuallyEdited] = useState(false);
  const [closeSummaryOverwriteOpen, setCloseSummaryOverwriteOpen] = useState(false);
  const [closeToastVisible, setCloseToastVisible] = useState(false);
  const [teamsThreadOpen, setTeamsThreadOpen] = useState(false);
  const [expandedReferenceCaseId, setExpandedReferenceCaseId] = useState<string>();
  const [reopenConfirmationOpen, setReopenConfirmationOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState("ผู้ใช้งานยังพบปัญหา");
  const handledInitialAction = useRef(false);

  useEffect(() => {
    if (!item || !initialAction || handledInitialAction.current) return;
    handledInitialAction.current = true;
    const timer = window.setTimeout(() => {
      if (initialAction === "request-info") {
        setActionMode("REQUEST_MORE_INFO");
        setComposerTab("request-info");
        onInitialActionHandled();
        return;
      }

      setActionState("accepting");
      void onAcceptCase()
        .then(() => setActionNotice(`รับเคส ${item.caseNumber} สำเร็จแล้ว`))
        .catch((error) => setActionError(error instanceof Error ? error.message : "รับเคสไม่สำเร็จ กรุณาลองใหม่"))
        .finally(() => setActionState("idle"));
      onInitialActionHandled();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [initialAction, item, onAcceptCase, onInitialActionHandled]);

  useEffect(() => {
    if (!closeToastVisible) return;
    const timer = window.setTimeout(() => setCloseToastVisible(false), 4500);
    return () => window.clearTimeout(timer);
  }, [closeToastVisible]);

  useEffect(() => {
    if (!analysisToastVisible) return;
    const timer = window.setTimeout(() => setAnalysisToastVisible(false), 4500);
    return () => window.clearTimeout(timer);
  }, [analysisToastVisible]);

  if (!item) {
    return (
      <Card padding="lg" radius="md" withBorder>
        <Title order={3}>{isLoading ? "กำลังโหลดรายละเอียดเคส..." : "ไม่พบรายละเอียดเคส"}</Title>
        <Text c="dimmed" mt="xs">
          {isLoading ? "กำลังดึงข้อมูลล่าสุดของเคสจากระบบ" : "ไม่พบเคสที่ต้องการ หรือเคสอาจถูกลบออกจากระบบแล้ว"}
        </Text>
      </Card>
    );
  }

  const currentStatusMeta = getStatusMeta(item.status);
  const statusLabel = item.status === "awaiting_tech" ? WAITING_TECH_STATUS : currentStatusMeta.label;
  const teamsMeta = teamsDeliveryMeta(item);
  const isActionRunning = actionState !== "idle";
  const isClosed = item.status === "closed" || item.status === "resolved";
  const extractedSolution = item.supportSolution && item.supportSolution !== "NO_ACTIONABLE_SOLUTION"
    ? item.supportSolution
    : "กำลังตรวจสอบ / ยังไม่มีวิธีแก้ที่ยืนยันแล้ว";
  const hasSuggestedSolution = Boolean(item.supportSolution && item.supportSolution !== "NO_ACTIONABLE_SOLUTION");
  const latestConversationAt = Math.max(0, ...item.conversation
    .filter((message) => message.channel === "line")
    .map((message) => new Date(message.receivedAt ?? message.sentAt ?? message.deliveredAt ?? message.createdAt).getTime()));
  const hasUnanalyzedConversation = latestConversationAt > new Date(item.solutionAnalyzedAt ?? 0).getTime();
  const hasTeamsTechReply = item.conversation.some((message) => (
    message.senderType === "TECH"
    && message.channel === "ms_teams"
    && message.messageType !== "CASE_CLOSED"
    && Boolean(message.originalText.trim())
    && new Date(message.receivedAt ?? message.sentAt ?? message.createdAt).getTime() >= new Date(item.caseCreatedAt ?? item.createdAt).getTime()
  ));
  const hasLineTechReply = item.conversation.some((message) => (
    message.senderType === "TECH"
    && message.channel === "line"
    && message.messageType !== "CASE_CLOSED"
    && Boolean(message.originalText.trim())
  ));
  const hasLegacyCloseMetadataInSolution = /ปิดเคส\s+OFF-\d{4}-\d+/u.test(item.supportSolution ?? "");
  const canRefreshSolution = hasUnanalyzedConversation || (hasLineTechReply && (!hasSuggestedSolution || hasLegacyCloseMetadataInSolution));
  const referenceMessages = item.referenceMessages ?? [];
  const referenceMessagesExpanded = expandedReferenceCaseId === item.id;
  const visibleReferenceMessages = referenceMessagesExpanded ? referenceMessages : referenceMessages.slice(0, 3);
  const caseStatusMessage = item.teamsDeliveryStatus === "failed"
    ? `ส่งเคสเข้า Microsoft Teams ไม่สำเร็จ: ${item.teamsDeliveryError ?? "ไม่ทราบสาเหตุ"}`
    : isClosed
      ? hasTeamsTechReply
        ? "ปิดเคสแล้ว โดยมีคำตอบจากทีม Tech ใน Microsoft Teams"
        : hasLineTechReply
          ? "ปิดเคสแล้ว จากข้อมูลที่ทีม Tech ตอบผ่าน LINE"
          : "ปิดเคสแล้ว"
      : item.status === "new" || item.status === "analyzing"
        ? teamsMeta.label
        : hasTeamsTechReply
          ? item.status === "resolved"
            ? "ได้รับคำตอบจากทีม Tech แล้ว AI วิเคราะห์เสร็จ และกำลังส่งคำตอบกลับผู้ใช้งานทาง LINE"
            : item.status === "sent_to_customer"
              ? "ได้รับคำตอบจากทีม Tech แล้ว และส่งคำตอบกลับผู้ใช้งานทาง LINE แล้ว"
              : "ได้รับคำตอบจากทีม Tech แล้ว ตอนนี้กำลังวิเคราะห์วิธีแก้ปัญหา"
          : "รอคำตอบจากทีม Tech Support";
  const saveAiFeedback = async (field: "caseUnderstandingFeedback" | "solutionSelectionFeedback", value: "CORRECT" | "INCORRECT") => {
    if (feedbackSaving[field]) return;
    if (!item?.currentAnalysis) {
      setFeedbackError("ยังไม่มีผลวิเคราะห์ที่สามารถประเมินได้");
      return;
    }
    setFeedbackSaving((current) => ({ ...current, [field]: true }));
    setFeedbackError(undefined);
    try {
      await onSaveAiFeedback({
        analysisId: item.currentAnalysis.id,
        analysisVersion: item.currentAnalysis.analysisVersion,
        feedbackType: field === "caseUnderstandingFeedback" ? "ISSUE_UNDERSTANDING" : "SOLUTION_SELECTION",
        result: value,
      });
    } catch (error) {
      setFeedbackError(error instanceof Error ? error.message : "บันทึกผลการตรวจของทีม Tech ไม่สำเร็จ");
    } finally {
      setFeedbackSaving((current) => ({ ...current, [field]: false }));
    }
  };
  const latestTeamsTechMessage = [...item.conversation]
    .filter((message) => (
      message.senderType === "TECH"
      && message.channel === "ms_teams"
      && message.messageType !== "CASE_CLOSED"
      && Boolean(message.originalText.trim())
      && new Date(message.receivedAt ?? message.sentAt ?? message.createdAt).getTime() >= new Date(item.caseCreatedAt ?? item.createdAt).getTime()
    ))
    .at(-1);

  const runAction = async (action: "accepting" | "requesting" | "replying" | "closing" | "reopening", successMessage: string, handler: () => Promise<void>) => {
    setActionState(action);
    setActionError(undefined);
    setActionNotice(undefined);

    try {
      await handler();
      setActionNotice(successMessage);
      return true;
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "ดำเนินการไม่สำเร็จ กรุณาลองใหม่");
      return false;
    } finally {
      setActionState("idle");
    }
  };

  const submitReply = async () => {
    const text = (actionMode === "REQUEST_MORE_INFO" ? requestInfoDraft : customerReplyDraft).trim();
    if (!text) {
      setActionError("กรุณากรอกข้อความที่จะส่ง");
      return;
    }

    const completed = await runAction(
      actionMode === "REQUEST_MORE_INFO" ? "requesting" : "replying",
      actionMode === "REQUEST_MORE_INFO" ? `ส่งคำขอข้อมูลเพิ่มเติมสำหรับเคส ${item.caseNumber} แล้ว` : `ส่งข้อความให้ผู้ใช้งานสำหรับเคส ${item.caseNumber} แล้ว`,
      () => actionMode === "REQUEST_MORE_INFO" ? onRequestInfo(text, requestInfoDraftMessageId) : onReply(text),
    );
    if (completed) {
      if (actionMode === "REQUEST_MORE_INFO") setRequestInfoDraft("");
      else setCustomerReplyDraft("");
      setRequestInfoDraftMessageId(undefined);
    }
  };

  const submitCloseCase = async () => {
    if (!closeCause.trim() || !closeResolution.trim() || !closePrevention.trim() || !closeMessageText.trim()) {
      setCloseValidationAttempted(true);
      return;
    }
    if (hasUnanalyzedConversation) {
      setActionError("มีบทสนทนาใหม่ที่ยังไม่ได้วิเคราะห์ กรุณาอัปเดตผลวิเคราะห์ก่อนปิดเคส");
      setCloseConfirmationOpen(false);
      return;
    }
    const message = closeCustomerMessage.trim();
    const completed = await runAction(
      "closing",
      "ปิดเคสและแจ้งผู้ใช้งานทาง LINE แล้ว",
      () => onCloseCase(message, false, {
        cause: closeCause.trim(),
        resolution: closeResolution.trim(),
        prevention: closePrevention.trim(),
      }),
    );
    if (completed) {
      setCloseConfirmationOpen(false);
      setCloseCause("");
      setCloseResolution("");
      setClosePrevention("");
      setCloseMessageText("");
      setCloseMessageManuallyEdited(false);
      setCloseValidationAttempted(false);
      setCloseTouchedFields({ cause: false, resolution: false, prevention: false, message: false });
      setActionMode("CUSTOMER_REPLY");
      setComposerTab("reply");
      setCloseToastVisible(true);
    }
  };

  const buildCloseMessage = () => [
    `สาเหตุที่เกิด: ${closeCause.trim()}`,
    `วิธีแก้ไข: ${closeResolution.trim()}`,
    `วิธีป้องกันในอนาคต: ${closePrevention.trim()}`,
  ].join("\n\n");

  const openCloseConfirmation = () => {
    if (!closeCause.trim() || !closeResolution.trim() || !closePrevention.trim() || !closeMessageText.trim()) {
      setCloseValidationAttempted(true);
      return;
    }
    setActionError(undefined);
    setCloseConfirmationOpen(true);
  };

  const closeSummaryComplete = Boolean(closeCause.trim() && closeResolution.trim() && closePrevention.trim());
  const closeCustomerMessage = closeMessageText.trim();
  const showCloseFieldError = (field: "cause" | "resolution" | "prevention" | "message") => closeValidationAttempted || closeTouchedFields[field];
  const createCloseSummaryWithAi = async (overwriteExisting = false) => {
    if (!closeSummaryComplete || isActionRunning) return;
    if (!overwriteExisting && closeMessageManuallyEdited && closeCustomerMessage) {
      setCloseSummaryOverwriteOpen(true);
      return;
    }

    setActionState("rewriting");
    setActionError(undefined);
    setActionNotice(undefined);
    try {
      const rewritten = await onRewriteAi("CLOSING_SUMMARY", buildCloseMessage());
      if (!rewritten.rewrittenMessage.trim()) throw new Error("AI ไม่สามารถสร้างข้อความสรุปได้ในขณะนี้");
      setCloseMessageText(rewritten.rewrittenMessage);
      setCloseMessageManuallyEdited(false);
      setActionNotice("AI สร้างข้อความสรุปแล้ว กรุณาตรวจสอบก่อนยืนยันปิดเคส");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "AI ไม่สามารถสร้างข้อความสรุปได้ในขณะนี้");
    } finally {
      setActionState("idle");
    }
  };
  const markCloseFieldTouched = (field: "cause" | "resolution" | "prevention" | "message") => {
    setCloseTouchedFields((current) => ({ ...current, [field]: true }));
  };
  const resetComposerDrafts = () => {
    setCloseCause("");
    setCloseResolution("");
    setClosePrevention("");
    setCloseMessageText("");
    setCloseMessageManuallyEdited(false);
    setCloseValidationAttempted(false);
    setCloseTouchedFields({ cause: false, resolution: false, prevention: false, message: false });
    setActionError(undefined);
    setActionNotice(undefined);
  };
  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    if (isActionRunning) return;
    if (composerTab === "close") {
      if (closeSummaryComplete && closeCustomerMessage) openCloseConfirmation();
      else setCloseValidationAttempted(true);
      return;
    }
    if ((composerTab === "request-info" ? requestInfoDraft : customerReplyDraft).trim()) void submitReply();
  };
  const closeCaseSummaryForm = (
    <Stack gap="sm">
      <Textarea
        autosize
        error={showCloseFieldError("cause") && !closeCause.trim() ? "กรุณาระบุสาเหตุที่เกิด" : undefined}
        label="สาเหตุที่เกิด"
        minRows={1}
        onChange={(event) => setCloseCause(event.currentTarget.value)}
        onBlur={() => markCloseFieldTouched("cause")}
        onKeyDown={handleComposerKeyDown}
        placeholder="สรุปสาเหตุของปัญหา"
        required
        value={closeCause}
      />
      <Textarea
        autosize
        error={showCloseFieldError("resolution") && !closeResolution.trim() ? "กรุณาระบุวิธีแก้ไข" : undefined}
        label="วิธีแก้ไข"
        minRows={1}
        onChange={(event) => setCloseResolution(event.currentTarget.value)}
        onBlur={() => markCloseFieldTouched("resolution")}
        onKeyDown={handleComposerKeyDown}
        placeholder="อธิบายสิ่งที่ดำเนินการแก้ไข"
        required
        value={closeResolution}
      />
      <Textarea
        autosize
        error={showCloseFieldError("prevention") && !closePrevention.trim() ? "กรุณาระบุวิธีป้องกันในอนาคต" : undefined}
        label="วิธีป้องกันในอนาคต"
        minRows={1}
        onChange={(event) => setClosePrevention(event.currentTarget.value)}
        onBlur={() => markCloseFieldTouched("prevention")}
        onKeyDown={handleComposerKeyDown}
        placeholder="ระบุแนวทางป้องกันปัญหาในครั้งถัดไป"
        required
        value={closePrevention}
      />
      <Box>
        <Button
          disabled={!closeSummaryComplete || isActionRunning}
          leftSection={<AppIcon name="brain" size={15} />}
          loading={actionState === "rewriting"}
          onClick={() => void createCloseSummaryWithAi()}
          size="xs"
          variant="outline"
        >
          ช่วยเรียบเรียงสรุปด้วย AI
        </Button>
        {!closeSummaryComplete ? (
          <Text c="dimmed" mt={4} size="xs">กรอกสาเหตุ วิธีแก้ไข และวิธีป้องกันให้ครบก่อนสร้างข้อความสรุป</Text>
        ) : <Text c="dimmed" mt={4} size="xs">AI จะสร้างร่างข้อความจากข้อมูลที่กรอก คุณสามารถแก้ไขก่อนยืนยันปิดเคสได้</Text>}
      </Box>
      {closeSummaryComplete ? (
        <Textarea
          autosize
          error={showCloseFieldError("message") && !closeCustomerMessage ? "กรุณาระบุข้อความสรุปที่จะส่งให้ผู้ใช้งาน" : undefined}
          label="ข้อความที่จะส่งผ่าน LINE"
          minRows={1}
          onBlur={() => markCloseFieldTouched("message")}
          onChange={(event) => {
            setCloseMessageText(event.currentTarget.value);
            setCloseMessageManuallyEdited(true);
          }}
          onKeyDown={handleComposerKeyDown}
          placeholder="ข้อความสรุปจะสร้างจากข้อมูลด้านบน และสามารถแก้ไขได้"
          value={closeMessageText}
        />
      ) : null}
    </Stack>
  );

  return (
    <Stack gap="lg">
      <Box className="caseDetailHeader">
        <Button mb={4} onClick={onBackToInbox} size="xs" variant="subtle">
          ← กลับไปหน้า Inbox
        </Button>
        <Group className="caseDetailHeaderTitle" gap="xs" wrap="wrap">
          <Title order={2}>เคส {item.caseNumber}</Title>
          <Badge color={currentStatusMeta.color} variant="light">{statusLabel}</Badge>
          {item.aiStatus !== "AI_FAILED" ? <Badge color={confidenceColor(item.aiConfidence)} variant="light">AI {item.aiConfidence}%</Badge> : null}
          {item.isSlaBreached ? <Badge color="red" variant="light">เกิน SLA</Badge> : null}
        </Group>
        <Group className="caseDetailHeaderSummary" gap={6} mt={4} wrap="wrap">
          <Text c="dimmed" size="xs">ผู้ใช้งาน: {item.customerName}</Text>
          {isClosed ? <>
            {item.closedAt ? <><Text c="dimmed" size="xs">·</Text><Text c="dimmed" size="xs">ปิดเมื่อ: {formatEventTime(item.closedAt)}</Text></> : null}
            {item.closedBy ? <><Text c="dimmed" size="xs">·</Text><Text c="dimmed" size="xs">ปิดโดย: {item.closedBy}</Text></> : null}
          </> : <>
            <Text c="dimmed" size="xs">·</Text>
            <Text c="dimmed" size="xs">ทีม: {item.assignee || "ยังไม่มีผู้รับผิดชอบ"}</Text>
            <Text c="dimmed" size="xs">·</Text>
            <Text c="dimmed" size="xs">ข้อความล่าสุด: {formatEventTime(item.lastActivityAt)}</Text>
          </>}
        </Group>
        {isClosed ? (
          <Group className="caseDetailStatusContext" gap="xs" mt={6} wrap="nowrap">
            <AppIcon name="message" size={15} />
            <Text size="xs">{caseStatusMessage}</Text>
          </Group>
        ) : null}
      </Box>

      {!isClosed ? <Alert className="caseDetailStatusAlert" color="blue" icon={<AppIcon name="message" />} radius="md" variant="light">{caseStatusMessage}</Alert> : null}

      <Box className="caseDetailSummaryGrid">
        <Card className="caseReferenceCard" padding="lg" radius="md" withBorder>
          <Title mb="sm" order={3}>
            ข้อมูลผู้ใช้งานและปัญหาที่แจ้ง
          </Title>
          {item.caseDetail !== undefined ? (
            <Stack gap="sm">
              <Box>
                <Text c="dimmed" fw={700} size="sm">หัวข้อ</Text>
                <Text className="compactText" mt={4}>{item.caseSubject ?? "ไม่ระบุมา"}</Text>
              </Box>
              <Box>
                <Text c="dimmed" fw={700} size="sm">รายละเอียด</Text>
                <Paper bg="gray.0" mt={6} p="md" radius="md">
                  <Text className="compactText">{item.caseDetail}</Text>
                </Paper>
              </Box>
              <Box>
                <Text c="dimmed" fw={700} size="sm">ข้อความที่นำมาอ้างอิง</Text>
                {referenceMessages.length ? (
                  <Stack className="caseReferenceMessages" gap="xs" mt={6}>
                    {visibleReferenceMessages.map((message, index) => (
                      <Paper key={message.id} bg="gray.0" p="sm" radius="md">
                        <Group justify="space-between" wrap="nowrap">
                          <Group gap="xs" wrap="nowrap">
                            <Badge color={message.senderType === "CUSTOMER" ? "blue" : message.senderType === "TECH" ? "indigo" : "gray"} size="xs" variant="light">
                              {`${index + 1}. ${message.senderType === "CUSTOMER" ? "ผู้ใช้งาน" : message.senderType === "TECH" ? "ทีม Tech" : message.senderType === "BOT" ? "LINE Bot" : "ระบบ"}`}
                            </Badge>
                          </Group>
                          <Text c="dimmed" size="xs">{formatEventTime(message.createdAt)}</Text>
                        </Group>
                        <Text className="compactText" mt={4} size="sm">{message.text}</Text>
                      </Paper>
                    ))}
                  </Stack>
                ) : <Text c="dimmed" mt={4} size="sm">ไม่ระบุมา</Text>}
                {referenceMessages.length > 3 ? (
                  <Button mt="xs" onClick={() => setExpandedReferenceCaseId((current) => current === item.id ? undefined : item.id)} size="xs" variant="subtle">
                    {referenceMessagesExpanded ? "ย่อข้อความอ้างอิง" : `ดูข้อความอ้างอิงทั้งหมด (${referenceMessages.length})`}
                  </Button>
                ) : null}
              </Box>
            </Stack>
          ) : (
            <Paper bg="gray.0" p="md" radius="md">
              {item.originalText ? (
                <Text className="compactText">{item.originalText}</Text>
              ) : (
                <Alert color="red" title="ไม่พบข้อความต้นฉบับของผู้ใช้งาน">
                  กรุณาตรวจสอบข้อมูล LINE webhook
                </Alert>
              )}
            </Paper>
          )}
          <Stack gap={4} mt="sm">
            <Text c="dimmed" size="xs">ส่งจาก LINE: {formatEventTime(item.customerSentAt)}</Text>
            <Text c="dimmed" size="xs">ระบบรับข้อความ: {formatEventTime(item.systemReceivedAt)}</Text>
          </Stack>
        </Card>

        <Card className="caseAiAnalysisCard" padding={20} radius="md" withBorder>
          <Group align="center" justify="space-between" mb="xs" wrap="wrap">
            <Title order={3}>ผลวิเคราะห์โดย AI</Title>
            <Tooltip label={canRefreshSolution ? "อัปเดตผลวิเคราะห์จากบทสนทนาล่าสุด" : "ยังไม่มีข้อความใหม่ให้วิเคราะห์"} withArrow>
              <Button color="blue" disabled={!canRefreshSolution || isRefreshingSolution} leftSection={<AppIcon name="sparkles" size={15} />} loading={isRefreshingSolution} onClick={() => void (async () => {
                setIsRefreshingSolution(true);
                setActionError(undefined);
                try {
                  await onRefreshSolution();
                  setAnalysisToastVisible(true);
                } catch (error) {
                  setActionError(error instanceof Error ? error.message : "อัปเดตผลวิเคราะห์ไม่สำเร็จ");
                } finally {
                  setIsRefreshingSolution(false);
                }
              })()} size="xs" variant="light">
                {isRefreshingSolution ? "กำลังอัปเดตผลวิเคราะห์..." : "อัปเดตผลวิเคราะห์"}
              </Button>
            </Tooltip>
          </Group>
            <SimpleGrid cols={1} mb="sm">
            <Box>
              <Text c="dimmed" fw={700} size="sm">
                หมวดหมู่
              </Text>
              <Badge color="blue" mt={6} variant="light">
                {item.category}
              </Badge>
            </Box>
          </SimpleGrid>
          <Divider my="sm" />
          <Text fw={700} size="sm">ผลการตรวจของทีม Tech</Text>
          <Text c="dimmed" fw={700} mt="sm" size="sm">
            สรุปผลวิเคราะห์
          </Text>
          <Text className="compactText" mt={6}>
            {item.summary}
          </Text>
          <Box className="caseAiFeedbackSection" mt="xs">
            <Group justify="space-between" wrap="wrap">
              <Box>
                <Text size="sm">AI เข้าใจเคสถูกต้องหรือไม่</Text>
                <Text c={item.caseUnderstandingFeedback === "CORRECT" ? "green" : item.caseUnderstandingFeedback === "INCORRECT" ? "red" : "dimmed"} size="xs">
                  {item.caseUnderstandingFeedback === "CORRECT" ? "ทีม Tech ระบุว่าเข้าใจเคสถูกต้อง" : item.caseUnderstandingFeedback === "INCORRECT" ? "ทีม Tech ระบุว่าเข้าใจเคสไม่ถูกต้อง" : "ยังไม่ได้ตรวจสอบ"}
                </Text>
              </Box>
              <Group gap={4}>
                <Tooltip label="เข้าใจเคสถูกต้อง" withArrow>
                  <ActionIcon aria-label="เข้าใจเคสถูกต้อง" color={item.caseUnderstandingFeedback === "CORRECT" ? "green" : "gray"} disabled={!item.currentAnalysis || Boolean(feedbackSaving.caseUnderstandingFeedback)} loading={Boolean(feedbackSaving.caseUnderstandingFeedback)} onClick={() => void saveAiFeedback("caseUnderstandingFeedback", "CORRECT")} size="sm" variant={item.caseUnderstandingFeedback === "CORRECT" ? "filled" : "subtle"}>
                    <AppIcon name="thumb-up" size={15} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="เข้าใจเคสไม่ถูกต้อง" withArrow>
                  <ActionIcon aria-label="เข้าใจเคสไม่ถูกต้อง" color={item.caseUnderstandingFeedback === "INCORRECT" ? "red" : "gray"} disabled={!item.currentAnalysis || Boolean(feedbackSaving.caseUnderstandingFeedback)} loading={Boolean(feedbackSaving.caseUnderstandingFeedback)} onClick={() => void saveAiFeedback("caseUnderstandingFeedback", "INCORRECT")} size="sm" variant={item.caseUnderstandingFeedback === "INCORRECT" ? "filled" : "subtle"}>
                    <AppIcon name="thumb-down" size={15} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>
          </Box>
          <Divider my="sm" />
          <Text c="dimmed" fw={700} size="sm">วิธีแก้ที่สกัดได้</Text>
          <Text className="compactText" lineClamp={3} mt={4} size="sm">{extractedSolution}</Text>
          <Text c="dimmed" mt="xs" size="xs">อัปเดตล่าสุด {formatEventTime(item.solutionAnalyzedAt)}</Text>
          <Box className="caseAiFeedbackSection" mt="xs">
            <Group justify="space-between" wrap="wrap">
              <Box>
                <Text size="sm">AI เลือกวิธีแก้ถูกต้องหรือไม่</Text>
                <Text c={item.solutionSelectionFeedback === "CORRECT" ? "green" : item.solutionSelectionFeedback === "INCORRECT" ? "red" : "dimmed"} size="xs">
                  {!hasSuggestedSolution ? "ยังไม่มีวิธีแก้จาก AI ให้ตรวจสอบ" : item.solutionSelectionFeedback === "CORRECT" ? "ทีม Tech ระบุว่าเลือกวิธีแก้ถูกต้อง" : item.solutionSelectionFeedback === "INCORRECT" ? "ทีม Tech ระบุว่าเลือกวิธีแก้ไม่ถูกต้อง" : "ยังไม่ได้ตรวจสอบ"}
                </Text>
              </Box>
              <Group gap={4}>
                <Tooltip label="เลือกวิธีแก้ถูกต้อง" withArrow>
                  <ActionIcon aria-label="เลือกวิธีแก้ถูกต้อง" color={hasSuggestedSolution && item.solutionSelectionFeedback === "CORRECT" ? "green" : "gray"} disabled={!item.currentAnalysis || !hasSuggestedSolution || Boolean(feedbackSaving.solutionSelectionFeedback)} loading={Boolean(feedbackSaving.solutionSelectionFeedback)} onClick={() => void saveAiFeedback("solutionSelectionFeedback", "CORRECT")} size="sm" variant={hasSuggestedSolution && item.solutionSelectionFeedback === "CORRECT" ? "filled" : "subtle"}>
                    <AppIcon name="thumb-up" size={15} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="เลือกวิธีแก้ไม่ถูกต้อง" withArrow>
                  <ActionIcon aria-label="เลือกวิธีแก้ไม่ถูกต้อง" color={item.solutionSelectionFeedback === "INCORRECT" ? "red" : "gray"} disabled={!item.currentAnalysis || Boolean(feedbackSaving.solutionSelectionFeedback)} loading={Boolean(feedbackSaving.solutionSelectionFeedback)} onClick={() => void saveAiFeedback("solutionSelectionFeedback", "INCORRECT")} size="sm" variant={item.solutionSelectionFeedback === "INCORRECT" ? "filled" : "subtle"}>
                    <AppIcon name="thumb-down" size={15} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>
            {feedbackError ? <Alert color="red" mt="sm" title="บันทึกผลการตรวจไม่สำเร็จ">{feedbackError}</Alert> : null}
          </Box>
          <Text c="dimmed" mt="xs" size="xs">วิเคราะห์เสร็จเมื่อ: {formatEventTime(item.aiAnalyzedAt)}</Text>
        </Card>
      </Box>

      <Box className="caseDetailEngagementGrid">
        <Box className="caseConversationColumn">
          <CaseConversation item={item} onReply={onReply} />
        </Box>
        <Box className="caseDetailActionColumn">
        <Card className="caseTeamsThreadCard" padding="lg" radius="md" style={{ minWidth: 0 }} withBorder>
          <Group align="flex-start" justify="space-between" mb="md">
            <Box>
              <Title order={3}>เธรดที่ส่งให้ทีม Tech Support ใน MS Teams</Title>
              <Text c="dimmed" size="sm">
                แสดงสิ่งที่ระบบส่งเข้า Teams และสถานะหลังทีมส่งคำตอบกลับ
              </Text>
            </Box>
            <Group gap="xs">
              <Badge color={teamsMeta.color} variant="light">{teamsMeta.label}</Badge>
              <Button aria-expanded={teamsThreadOpen} onClick={() => setTeamsThreadOpen((current) => !current)} size="xs" variant="light">
                {teamsThreadOpen ? "ซ่อนเธรด" : "เปิดเธรด"}
              </Button>
            </Group>
          </Group>

          <Collapse expanded={teamsThreadOpen}>
          <Paper className="teamsPreview" radius="lg" withBorder>
            <Box className="teamsHeader">
              <Group gap="sm">
                <Avatar color="violet" radius="md" size={36}>
                  TS
                </Avatar>
                <Box>
                  <Text fw={800}>Tech Support Channel</Text>
                  <Text c="dimmed" size="xs">
                    เธรด: เคส {item.caseNumber} · Off ML Project
                  </Text>
                </Box>
              </Group>
              <Badge color={currentStatusMeta.color} variant="light">
                {statusLabel}
              </Badge>
            </Box>

            <Stack gap="md" p="md">
              <Box>
                <Title order={4}>ตัวอย่างการ์ดเคสที่ส่งไป Microsoft Teams</Title>
                <Text c="dimmed" size="sm">
                  ระบบส่งรายละเอียดเคสไปยัง Microsoft Teams แล้ว
                </Text>
                <Text c="dimmed" mt={4} size="xs">
                  ทีม Tech Support สามารถตอบกลับจาก Microsoft Teams หรือจากหน้าเว็บ ระบบจะนำคำตอบจากทีมไปวิเคราะห์และใช้สร้างร่างข้อความตอบผู้ใช้งานต่อไป
                </Text>
                <Text c="dimmed" mt={4} size="xs">
                  ด้านล่างเป็นตัวอย่างรูปแบบการ์ดที่ส่งไปยัง Microsoft Teams
                </Text>
              </Box>
              <Group align="flex-start" gap="sm" wrap="nowrap">
                <Avatar color="blue" radius="xl" size={34}>
                  AI
                </Avatar>
                <Paper className="teamsMessage" radius="md" withBorder>
                  <Group justify="space-between" mb="xs">
                    <Text fw={800}>Off ML Project</Text>
                    <Text c="dimmed" size="xs">
                      {item.createdAt}
                    </Text>
                  </Group>
                  <Text fw={700} mb="xs">
                    การ์ดเคสใหม่: เคส {item.caseNumber}
                  </Text>
                  <Paper bg="gray.0" p="sm" radius="md">
                    <Stack gap={6}>
                      <Group justify="space-between">
                        <Text c="dimmed" size="sm">
                          ผู้ใช้งาน
                        </Text>
                        <Text fw={700} size="sm">
                          {item.customerName}
                        </Text>
                      </Group>
                      <Group justify="space-between">
                        <Text c="dimmed" size="sm">
                          หมวดหมู่
                        </Text>
                        <Badge color="blue" variant="light">
                          {item.category}
                        </Badge>
                      </Group>
                      <Group justify="space-between">
                        <Text c="dimmed" size="sm">
                          ความมั่นใจของ AI
                        </Text>
                        <Badge color={confidenceColor(item.aiConfidence)} variant="light">
                          {item.aiConfidence}%
                        </Badge>
                      </Group>
                    </Stack>
                  </Paper>
                  <Text className="compactText" mt="sm" size="sm">
                    ข้อความผู้ใช้งาน: {item.originalText}
                  </Text>
                  <Text className="compactText" mt="xs" size="sm">
                    ผลวิเคราะห์โดย AI: {item.summary}
                  </Text>                </Paper>
              </Group>

              <Group align="flex-start" gap="sm" wrap="nowrap">
                <Avatar color="gray" radius="xl" size={34}>
                  SP
                </Avatar>
                <Paper className="teamsReplyPending" radius="md">
                  <Text fw={700} size="sm">
                    {latestTeamsTechMessage ? "ทีม Tech ตอบกลับแล้ว" : item.status === "awaiting_customer_info" ? "รอผู้ใช้งานส่งข้อมูลเพิ่มเติม" : WAITING_TECH_STATUS}
                  </Text>
                  <Text c="dimmed" size="sm">
                  คำตอบจากทีมส่งได้ทั้งใน Microsoft Teams หรือจากหน้าเว็บ ระบบจะส่งต่อให้ AI วิเคราะห์วิธีแก้เหมือนกัน
                  </Text>
                </Paper>
              </Group>

              <Paper className="teamsComposer" radius="md">
                <Text fw={700} size="sm">
                  {teamsAction}
                </Text>
                <Text c="dimmed" mt={4} size="sm">
                  ช่องทางตอบกลับ: Microsoft Teams หรือหน้าเว็บ
                </Text>
              </Paper>
            </Stack>
          </Paper>
          </Collapse>
      </Card>

      <Card className={`caseCloseCaseCard${isClosed ? " caseCloseCaseCard--closed" : ""}`} padding={isClosed ? 16 : "md"} radius="md" withBorder>
        <Stack gap={isClosed ? "xs" : "md"}>
          <Group gap={isClosed ? "xs" : "sm"}>
            <ThemeIcon color={isClosed ? "green" : "red"} radius="xl" variant="light">
              <AppIcon name="check" />
            </ThemeIcon>
            <Box>
              <Text fw={800}>{isClosed ? "ปิดเคสแล้ว" : "ปิดเคส"}</Text>
              {!isClosed ? <Text c="dimmed" size="xs">กรอกข้อมูลให้ครบก่อนยืนยันปิดเคส</Text> : null}
            </Box>
          </Group>

          {isClosed ? (
            <Box className="caseClosedComposer">
              <Text size="sm">ส่งข้อความสรุปและปิดเคสให้ผู้ใช้งานแล้ว</Text>
              <Text c="dimmed" mt={4} size="xs">
                ปิดเคสเมื่อ {formatEventTime(item.closedAt)}{item.closedBy ? ` · โดย ${item.closedBy}` : ""}
              </Text>
              <Button
                disabled={isActionRunning}
                loading={actionState === "reopening"}
                mt="sm"
                onClick={() => setReopenConfirmationOpen(true)}
                size="xs"
                variant="outline"
              >
                เปิดเคสอีกครั้ง
              </Button>
            </Box>
          ) : (
            <>
              {closeCaseSummaryForm}
              <Group className="caseCloseCaseActions" gap="xs" justify="flex-end" mt="md" wrap="wrap">
                <Button disabled={isActionRunning} onClick={resetComposerDrafts} size="xs" variant="default">
                  ยกเลิก
                </Button>
                <Button
                  color="red"
                  disabled={!closeSummaryComplete || !closeCustomerMessage || isActionRunning}
                  loading={actionState === "closing"}
                  onClick={openCloseConfirmation}
                  size="xs"
                >
                  ยืนยันปิดเคส
                </Button>
              </Group>
            </>
          )}
          {actionError ? <Alert color="red" mt="sm" title="ดำเนินการไม่สำเร็จ">{actionError}</Alert> : null}
          {actionNotice ? <Alert color="green" mt="sm">{actionNotice}</Alert> : null}
        </Stack>
      </Card>

      </Box>
      </Box>
      <Modal
        opened={closeSummaryOverwriteOpen}
        onClose={() => actionState === "idle" && setCloseSummaryOverwriteOpen(false)}
        title="แทนที่ข้อความสรุปเดิม"
      >
        <Text>มีข้อความสรุปที่แก้ไขไว้แล้ว ต้องการให้ AI สร้างข้อความใหม่มาแทนที่ใช่ไหม?</Text>
        <Group justify="flex-end" mt="md">
          <Button disabled={actionState !== "idle"} onClick={() => setCloseSummaryOverwriteOpen(false)} variant="default">กลับไปแก้ไข</Button>
          <Button
            disabled={actionState !== "idle"}
            loading={actionState === "rewriting"}
            onClick={() => {
              setCloseSummaryOverwriteOpen(false);
              void createCloseSummaryWithAi(true);
            }}
          >
            สร้างแทนที่
          </Button>
        </Group>
      </Modal>
      <Modal
        opened={closeConfirmationOpen}
        onClose={() => actionState === "idle" && setCloseConfirmationOpen(false)}
        title="ยืนยันการปิดเคส"
      >
        <Text>
          ระบบจะส่งข้อความสรุปให้ผู้ใช้งานผ่าน LINE และเปลี่ยนสถานะเคสเป็นปิดเคสแล้ว
        </Text>
        <Paper bg="gray.0" mt="md" p="sm" radius="sm" withBorder>
          <Text c="dimmed" size="xs">ข้อความที่จะส่งผ่าน LINE</Text>
          <Text mt={4} style={{ whiteSpace: "pre-wrap" }}>{closeCustomerMessage}</Text>
        </Paper>
        {actionError ? <Alert color="red" mt="md" title="ดำเนินการไม่สำเร็จ">{actionError}</Alert> : null}
        <Group justify="flex-end" mt="md">
          <Button disabled={actionState !== "idle"} onClick={() => setCloseConfirmationOpen(false)} variant="default">
            กลับไปแก้ไข
          </Button>
          <Button color="red" disabled={actionState !== "idle"} loading={actionState === "closing"} onClick={() => void submitCloseCase()}>
            {actionState === "closing" ? "กำลังปิดเคส..." : "ยืนยันปิดเคส"}
          </Button>
        </Group>
      </Modal>
      <Modal
        opened={reopenConfirmationOpen}
        onClose={() => actionState === "idle" && setReopenConfirmationOpen(false)}
        title="ยืนยันการเปิดเคสอีกครั้ง"
      >
        <Text>ต้องการเปิดเคส {item.caseNumber} กลับมาดำเนินการต่อใช่ไหม?</Text>
        <Text c="dimmed" mt="xs" size="sm">สถานะเคสจะกลับเป็นเปิดอยู่ เพื่อให้ทีม Tech Support ตรวจสอบต่อ</Text>
        <Select
          data={["ผู้ใช้งานยังพบปัญหา", "ปิดเคสผิด", "มีข้อมูลใหม่", "อื่น ๆ"]}
          label="เหตุผลที่เปิดเคสอีกครั้ง"
          mt="md"
          onChange={(value) => setReopenReason(value ?? "อื่น ๆ")}
          value={reopenReason}
        />
        <Group justify="flex-end" mt="md">
          <Button disabled={actionState !== "idle"} onClick={() => setReopenConfirmationOpen(false)} variant="default">
            ยกเลิก
          </Button>
          <Button
            disabled={actionState !== "idle"}
            loading={actionState === "reopening"}
            onClick={() => {
              void runAction("reopening", `เปิดเคส ${item.caseNumber} อีกครั้งแล้ว`, () => onReopenCase(reopenReason))
                .then((completed) => {
                  if (completed) setReopenConfirmationOpen(false);
                });
            }}
          >
            เปิดเคสอีกครั้ง
          </Button>
        </Group>
      </Modal>
      {closeToastVisible ? <Box className="caseConversationCopyToast" role="status">ปิดเคสและแจ้งผู้ใช้งานทาง LINE แล้ว</Box> : null}
      {analysisToastVisible ? <Box className="caseConversationCopyToast" role="status">อัปเดตผลวิเคราะห์ล่าสุดแล้ว</Box> : null}
    </Stack>
  );
}

function ConfidenceReview({
  error,
  isLoading,
  onRetry,
  onReview,
  suggestions,
}: {
  error?: string;
  isLoading: boolean;
  onRetry: () => void;
  onReview: (item: ConfidenceSuggestion, result: "approved" | "rejected", feedback?: { understandingIncorrect: boolean; solutionIncorrect: boolean; explanation: string }) => Promise<void>;
  suggestions: ConfidenceSuggestion[];
}) {
  const REVIEW_PAGE_SIZE = 10;
  const [reviewedSuggestions, setReviewedSuggestions] = useState<Record<string, "approved" | "rejected">>({});
  const [rejectedSuggestion, setRejectedSuggestion] = useState<ConfidenceSuggestion | null>(null);
  const [understandingIncorrect, setUnderstandingIncorrect] = useState(false);
  const [solutionIncorrect, setSolutionIncorrect] = useState(false);
  const [rejectionExplanation, setRejectionExplanation] = useState("");
  const [reviewPage, setReviewPage] = useState(1);

  const reviewPageCount = Math.max(1, Math.ceil(suggestions.length / REVIEW_PAGE_SIZE));
  const safeReviewPage = Math.min(reviewPage, reviewPageCount);
  const visibleSuggestions = suggestions.slice((safeReviewPage - 1) * REVIEW_PAGE_SIZE, safeReviewPage * REVIEW_PAGE_SIZE);

  const reviewSuggestion = async (item: ConfidenceSuggestion, result: "approved" | "rejected") => {
    await onReview(item, result);
    setReviewedSuggestions((current) => ({ ...current, [item.id]: result }));
  };

  const submitRejection = async () => {
    if (!rejectedSuggestion || (!understandingIncorrect && !solutionIncorrect)) return;
    await onReview(rejectedSuggestion, "rejected", { understandingIncorrect, solutionIncorrect, explanation: rejectionExplanation });
    setReviewedSuggestions((current) => ({ ...current, [rejectedSuggestion.id]: "rejected" }));
    setRejectedSuggestion(null);
    setUnderstandingIncorrect(false);
    setSolutionIncorrect(false);
    setRejectionExplanation("");
  };

  return (
    <Stack className="confidenceReviewPage" gap="md">
      <Alert className="confidenceReviewNotice" color="blue" icon={<AppIcon name="brain" />} radius="md" variant="light">
        ตรวจความถูกต้องของคำแนะนำ AI เพื่อปรับ Confidence
      </Alert>
      {isLoading ? (
        <Stack gap="sm">
          {[0, 1].map((item) => (
            <Card className="confidenceReviewCard" key={item} padding="md" radius="md" withBorder>
              <Stack gap="sm">
                <Group justify="space-between">
                  <Skeleton height={20} width="38%" />
                  <Skeleton height={22} width="24%" />
                </Group>
                <Skeleton height={14} width="72%" />
                <SimpleGrid cols={{ base: 1, md: 2 }}>
                  <Skeleton height={92} />
                  <Stack gap="sm">
                    <Skeleton height={24} />
                    <Skeleton height={24} />
                  </Stack>
                </SimpleGrid>
                <Group justify="flex-end"><Skeleton height={32} width={110} /><Skeleton height={32} width={140} /></Group>
              </Stack>
            </Card>
          ))}
        </Stack>
      ) : error ? (
        <Alert color="red" title="โหลดรายการตรวจสอบไม่สำเร็จ" variant="light">
          <Group justify="space-between" mt="xs">
            <Text size="sm">{error}</Text>
            <Button onClick={onRetry} size="compact-sm" variant="light">โหลดอีกครั้ง</Button>
          </Group>
        </Alert>
      ) : suggestions.length === 0 ? (
        <Card className="confidenceReviewEmpty" padding="lg" radius="md" withBorder>
          <Stack align="center" gap="xs" ta="center">
            <ThemeIcon color="blue" radius="xl" size={42} variant="light"><AppIcon name="check" /></ThemeIcon>
            <Title order={3}>ยังไม่มีเคสที่รอตรวจสอบ</Title>
            <Text c="dimmed" maw={520}>
              เมื่อ AI แนะนำวิธีแก้ ระบบจะแสดงเคสที่ต้องให้ทีมตรวจสอบความถูกต้องที่นี่
            </Text>
          </Stack>
        </Card>
      ) : (
        <Stack gap="sm">
          {visibleSuggestions.map((item) => (
        <Card className="confidenceReviewCard" key={item.id} padding="md" radius="md" withBorder>
          <Group align="flex-start" justify="space-between">
            <Box>
              <Title order={4}>{item.caseNumber} · {item.customerName}</Title>
              <Text c="dimmed" mt={4}>{item.originalText}</Text>
            </Box>
            <Group gap="xs">
              {reviewedSuggestions[item.id] ? (
                <Badge color={reviewedSuggestions[item.id] === "approved" ? "green" : "red"} variant="light">
                  {reviewedSuggestions[item.id] === "approved" ? "ยืนยันแล้ว" : "ปฏิเสธแล้ว"}
                </Badge>
              ) : null}
              <Badge color={item.reviewStage === "AUTO_ANSWER" ? "green" : "yellow"} variant="light">
                {item.reviewStage === "AUTO_ANSWER" ? "พร้อมพิจารณา Auto-answer" : "ตรวจคุณภาพ AI"}
              </Badge>
              <Badge color="blue" variant="light">{item.category}</Badge>
            </Group>
          </Group>
          <SimpleGrid cols={{ base: 1, md: 2 }} mt="sm">
            <Paper bg="gray.0" p="md" radius="md">
              <Text c="dimmed" fw={700} size="sm">Solution ที่ AI แนะนำ</Text>
              <Text>{item.solutionText}</Text>
              <Text c="dimmed" mt="xs" size="xs">อ้างอิง {item.suggestedSolutionId}</Text>
            </Paper>
            <Stack gap="sm">
              <Box>
                <Group justify="space-between">
                  <Text size="sm">ความมั่นใจในการเข้าใจเคส</Text>
                  <Text fw={700} size="sm">{item.caseUnderstandingConfidence}%</Text>
                </Group>
                <Progress value={item.caseUnderstandingConfidence} />
              </Box>
              <Box>
                <Group justify="space-between">
                  <Text size="sm">ความมั่นใจในการแยกเคสและเลือกวิธีแก้</Text>
                  <Text fw={700} size="sm">{item.caseDiscriminationConfidence}%</Text>
                </Group>
                <Progress value={item.caseDiscriminationConfidence} />
              </Box>
            </Stack>
          </SimpleGrid>
          <Text c={item.reviewStage === "AUTO_ANSWER" ? "green.7" : "dimmed"} mt="sm" size="sm">
            {item.reviewHint}
          </Text>
          <Text c="dimmed" mt="xs" size="xs">
            การยืนยันของทีมจะช่วยปรับความมั่นใจของ AI สำหรับการเข้าใจเคสและการเลือกวิธีแก้ในอนาคต
          </Text>
          <Group justify="flex-end" mt="sm">
            <Button color="red" onClick={() => setRejectedSuggestion(item)} size="sm" variant="light">
              {item.reviewStage === "AUTO_ANSWER" ? "ไม่อนุมัติ" : "ไม่ถูกต้อง"}
            </Button>
            <Button onClick={() => void reviewSuggestion(item, "approved")} size="sm">
              {item.reviewStage === "AUTO_ANSWER" ? "อนุมัติให้ตอบอัตโนมัติ" : "ยืนยันความถูกต้อง"}
            </Button>
          </Group>
        </Card>
          ))}
          {reviewPageCount > 1 ? (
            <Group justify="space-between" mt="xs">
              <Text c="dimmed" size="sm">แสดง {(safeReviewPage - 1) * REVIEW_PAGE_SIZE + 1}–{Math.min(safeReviewPage * REVIEW_PAGE_SIZE, suggestions.length)} จาก {suggestions.length} เคส</Text>
              <Pagination onChange={setReviewPage} siblings={1} total={reviewPageCount} value={safeReviewPage} />
            </Group>
          ) : null}
        </Stack>
      )}
      <Modal opened={Boolean(rejectedSuggestion)} onClose={() => setRejectedSuggestion(null)} title="ระบุด้านที่ AI ไม่ถูกต้อง">
        <Stack gap="xs">
          <Checkbox checked={understandingIncorrect} label="AI เข้าใจเคสไม่ถูกต้อง" onChange={(event) => setUnderstandingIncorrect(event.currentTarget.checked)} />
          <Checkbox
            checked={solutionIncorrect}
            disabled={rejectedSuggestion?.hasSuggestedSolution === false}
            label="AI เลือกวิธีแก้ไม่ถูกต้อง"
            onChange={(event) => setSolutionIncorrect(event.currentTarget.checked)}
          />
        </Stack>
        <Textarea label="คำอธิบายเพิ่มเติม" minRows={2} mt="sm" onChange={(event) => setRejectionExplanation(event.currentTarget.value)} value={rejectionExplanation} />
        <Group justify="flex-end" mt="md">
          <Button onClick={() => setRejectedSuggestion(null)} variant="default">ยกเลิก</Button>
          <Button color="red" disabled={!understandingIncorrect && !solutionIncorrect} onClick={() => void submitRejection()}>บันทึกผลตรวจ</Button>
        </Group>
      </Modal>
    </Stack>
  );
}

function AnalyticsDashboard({
  cases,
  isLoadingCases,
  onDrillDown,
  onRangeChange,
  summary,
}: {
  cases: SupportCase[];
  isLoadingCases: boolean;
  onDrillDown: (filter: { category?: string; confidence?: string }) => void;
  onRangeChange: (range: "today" | "7d" | "30d") => void;
  summary: AnalyticsSummary;
}) {
  type AnalyticsRange = "today" | "7d" | "30d";
  type CategoryRow = {
    key: string;
    label: string;
    count: number;
    value: number;
    understanding?: number;
    discrimination?: number;
  };
  const [range, setRange] = useState<AnalyticsRange>("30d");
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [analyticsNow] = useState(() => Date.now());
  const rangeLabels: Record<AnalyticsRange, string> = { today: "วันนี้", "7d": "7 วัน", "30d": "30 วัน" };
  const periodCases = useMemo(() => {
    if (isLoadingCases) return null;
    const days = range === "today" ? 1 : range === "7d" ? 7 : 30;
    const start = analyticsNow - days * 24 * 60 * 60 * 1000;
    return cases.filter((item) => new Date(item.caseCreatedAt ?? item.lastActivityAt).getTime() >= start);
  }, [analyticsNow, cases, isLoadingCases, range]);
  const metrics = useMemo(() => {
    if (periodCases === null) {
      return {
        total: summary.total,
        solvedPct: summary.solvedFromExistingSolutionPct,
        overSla: summary.overSla,
        ready: summary.readyForAutoAnswer,
      };
    }
    const total = periodCases.length;
    const solved = periodCases.filter((item) => item.status === "resolved" || item.status === "sent_to_customer" || item.status === "closed").length;
    const hasEligibilityData = periodCases.some((item) => item.learningStatus?.autoAnswerEligible !== undefined);
    return {
      total,
      solvedPct: total ? Math.round((solved / total) * 100) : 0,
      overSla: periodCases.filter((item) => item.isSlaBreached).length,
      ready: hasEligibilityData ? periodCases.filter((item) => item.learningStatus?.autoAnswerEligible === true).length : summary.readyForAutoAnswer,
    };
  }, [periodCases, summary]);
  const confidenceDistribution = useMemo(() => {
    if (periodCases === null) return summary.confidenceDistribution;
    const labels = ["0-59%", "60-89%", "90-97%", "98-100%"];
    const counts = new Map(labels.map((label) => [label, 0]));
    periodCases.forEach((item) => {
      const value = item.aiConfidence;
      const label = value < 60 ? "0-59%" : value < 90 ? "60-89%" : value < 98 ? "90-97%" : "98-100%";
      counts.set(label, (counts.get(label) ?? 0) + 1);
    });
    return labels.map((label) => ({ label, value: metrics.total ? Math.round(((counts.get(label) ?? 0) / metrics.total) * 100) : 0 }));
  }, [metrics.total, periodCases, summary.confidenceDistribution]);
  const categoryRows = useMemo(() => {
    const grouped = new Map<string, { key: string; label: string; count: number; understanding: number[]; discrimination: number[] }>();
    const add = (
      keyValue: string | undefined,
      labelValue: string | undefined,
      count: number,
      understanding?: number,
      discrimination?: number,
      understandingReviewedCount = 0,
      discriminationReviewedCount = 0,
    ) => {
      const key = normalizeAnalyticsCategoryKey(keyValue, labelValue);
      const label = key === "OTHER" ? "อื่นๆ" : displayCategory(labelValue ?? key);
      const current = grouped.get(key) ?? { key, label, count: 0, understanding: [], discrimination: [] };
      current.count += count;
      if (understandingReviewedCount > 0 && Number.isFinite(understanding)) current.understanding.push(understanding as number);
      if (discriminationReviewedCount > 0 && Number.isFinite(discrimination)) current.discrimination.push(discrimination as number);
      grouped.set(key, current);
    };

    // Category quality always comes from ai_review_feedback via analytics summary.
    summary.categories.forEach((item) => add(
      item.key,
      item.label,
      item.count,
      item.caseUnderstandingAccuracy,
      item.solutionSelectionAccuracy,
      item.caseUnderstandingReviewedCount,
      item.solutionSelectionReviewedCount,
    ));

    const total = metrics.total;
    return [...grouped.values()]
      .map((item) => ({
        key: item.key,
        label: item.label,
        count: item.count,
        value: total ? Math.round((item.count / total) * 100) : 0,
        understanding: item.understanding.length ? Math.round(item.understanding.reduce((sum, value) => sum + value, 0) / item.understanding.length) : undefined,
        discrimination: item.discrimination.length ? Math.round(item.discrimination.reduce((sum, value) => sum + value, 0) / item.discrimination.length) : undefined,
      }))
      .sort((left, right) => right.count - left.count);
  }, [metrics.total, summary.categories]);
  const topCategories = categoryRows.filter((item) => item.key !== "OTHER").slice(0, 5);
  const remainderCategories = categoryRows.filter((item) => item.key === "OTHER" || !topCategories.some((top) => top.key === item.key));
  const otherCategory: CategoryRow | undefined = remainderCategories.length ? {
    key: "OTHER",
    label: "อื่นๆ",
    count: remainderCategories.reduce((sum, item) => sum + item.count, 0),
    value: metrics.total ? Math.round((remainderCategories.reduce((sum, item) => sum + item.count, 0) / metrics.total) * 100) : 0,
    understanding: remainderCategories.some((item) => item.understanding !== undefined)
      ? Math.round(remainderCategories.filter((item) => item.understanding !== undefined).reduce((sum, item) => sum + (item.understanding ?? 0), 0) / remainderCategories.filter((item) => item.understanding !== undefined).length)
      : undefined,
    discrimination: remainderCategories.some((item) => item.discrimination !== undefined)
      ? Math.round(remainderCategories.filter((item) => item.discrimination !== undefined).reduce((sum, item) => sum + (item.discrimination ?? 0), 0) / remainderCategories.filter((item) => item.discrimination !== undefined).length)
      : undefined,
  } : undefined;
  const displayCategories = showAllCategories ? categoryRows : [...topCategories, ...(otherCategory ? [otherCategory] : [])];
  const qualityColor = (value?: number) => value === undefined ? "gray" : value >= 90 ? "green" : value >= 60 ? "yellow" : "red";

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end" wrap="wrap">
        <Text c="dimmed" size="sm">ข้อมูลช่วง: {rangeLabels[range]}</Text>
        <Select aria-label="ช่วงเวลา Analytics" data={Object.entries(rangeLabels).map(([value, label]) => ({ value, label }))} onChange={(value) => {
          const nextRange = (value as AnalyticsRange | null) ?? "30d";
          setRange(nextRange);
          onRangeChange(nextRange);
        }} size="sm" value={range} w={140} />
      </Group>
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
        <MetricCard color="blue" icon="inbox" label={`เคสทั้งหมด${range === "30d" ? " 30 วัน" : rangeLabels[range]}`} value={String(metrics.total)} />
        <MetricCard color="green" icon="brain" label="แก้ได้จาก solution เดิม" value={`${metrics.solvedPct}%`} />
        <MetricCard color="red" icon="alert" label="เกิน SLA" value={String(metrics.overSla)} />
        <MetricCard color="violet" icon="chart" label="พร้อม auto-answer" muted={metrics.ready === 0} value={String(metrics.ready)} />
      </SimpleGrid>
      <SimpleGrid cols={{ base: 1, lg: 2 }}>
        <Card className="analyticsCategoriesCard" padding="lg" radius="md" withBorder>
          <Title mb="md" order={3}>หมวดหมู่เคสที่พบบ่อย</Title>
          {metrics.total === 0 ? <Stack align="center" gap="xs" py="xl" ta="center"><ThemeIcon color="blue" radius="xl" size={40} variant="light"><AppIcon name="chart" /></ThemeIcon><Text fw={600}>ยังไม่มีข้อมูลหมวดหมู่</Text><Text c="dimmed" size="sm">เมื่อมีเคสในช่วงเวลานี้ ระบบจะแสดงหมวดหมู่ที่พบบ่อยที่นี่</Text></Stack> : displayCategories.map((category) => (
            <Box
              aria-label={`ดูเคสหมวดหมู่ ${category.label}`}
              component="button"
              key={category.key}
              mb="md"
              onClick={() => onDrillDown({ category: category.key })}
              style={{ background: "transparent", border: 0, cursor: "pointer", padding: 0, textAlign: "left", width: "100%" }}
              type="button"
            >
              <Group justify="space-between">
                <Text fw={600}>{category.label}</Text>
                <Text fw={700}>{category.value}%</Text>
              </Group>
              <Progress value={category.value} />
              <Tooltip label="เข้าใจเคสถูกต้อง = ความแม่นยำในการจัดหมวดหมู่และสรุปปัญหา" withArrow>
                <Group justify="space-between" mt="xs"><Text c="dimmed" size="xs">เข้าใจเคสถูกต้อง</Text><Text c={qualityColor(category.understanding)} fw={600} size="xs">{category.understanding === undefined ? "ยังไม่มีข้อมูลเพียงพอ" : `${category.understanding}%`}</Text></Group>
              </Tooltip>
              <Progress color={qualityColor(category.understanding)} size="xs" value={category.understanding ?? 0} />
              <Tooltip label="เลือกวิธีแก้ถูกต้อง = ความแม่นยำในการเลือก Solution หรือแยกเคส" withArrow>
                <Group justify="space-between" mt={4}><Text c="dimmed" size="xs">เลือกวิธีแก้ถูกต้อง</Text><Text c={qualityColor(category.discrimination)} fw={600} size="xs">{category.discrimination === undefined ? "ยังไม่มีข้อมูลเพียงพอ" : `${category.discrimination}%`}</Text></Group>
              </Tooltip>
              <Progress color={qualityColor(category.discrimination)} size="xs" value={category.discrimination ?? 0} />
            </Box>
          ))}
          {categoryRows.length > 5 ? <Button onClick={() => setShowAllCategories((current) => !current)} size="xs" variant="subtle">{showAllCategories ? "แสดงเฉพาะ Top 5" : "ดูหมวดหมู่ทั้งหมด"}</Button> : null}
        </Card>
        <Card className="analyticsConfidenceCard" padding="lg" radius="md" withBorder>
          <Title mb="md" order={3}>การกระจายระดับความมั่นใจ</Title>
          {metrics.total === 0 ? <Stack align="center" gap="xs" py="xl" ta="center"><ThemeIcon color="violet" radius="xl" size={40} variant="light"><AppIcon name="brain" /></ThemeIcon><Text fw={600}>ยังไม่มีข้อมูลความมั่นใจ</Text><Text c="dimmed" size="sm">เมื่อ AI วิเคราะห์เคส ระบบจะแสดงการกระจายระดับความมั่นใจที่นี่</Text></Stack> : confidenceDistribution.map(({ label, value }) => (
            <Box
              aria-label={`ดูเคส Confidence ${label}`}
              component="button"
              key={label}
              mb="md"
              onClick={() => onDrillDown({ confidence: label.replace("%", "") })}
              style={{ background: "transparent", border: 0, cursor: "pointer", padding: 0, textAlign: "left", width: "100%" }}
              type="button"
            >
              <Group justify="space-between">
                <Text>{label}</Text>
                <Text fw={700}>{value}%</Text>
              </Group>
              <Progress color={label === "0-59%" ? "red" : label === "60-89%" ? "yellow" : label === "90-97%" ? "blue" : "green"} value={value} />
            </Box>
          ))}
        </Card>
      </SimpleGrid>
    </Stack>
  );
}

function AutomationSettings({
  automationError: settingsError,
  isLoadingSettings,
  logs,
  logsPage,
  isLoadingLogs,
  onLoadLogs,
  onUpdateSettings,
  onOpenCase,
  onOpenCaseByNumber,
  onRetrySettings,
  settings,
  solutions,
}: {
  automationError?: string;
  isLoadingSettings: boolean;
  logs: AutoAnswerLog[];
  logsPage: AutoAnswerLogsPage;
  isLoadingLogs: boolean;
  onLoadLogs: (query: AutoAnswerLogsQuery) => Promise<void>;
  onUpdateSettings: (input: { emergencyDisable?: boolean; enabled?: boolean }) => Promise<void>;
  settings: AutomationSettings | null;
  solutions: AutoAnswerSolution[];
  onOpenCase: (caseId: string) => Promise<void>;
  onOpenCaseByNumber: (caseNumber: string) => Promise<void>;
  onRetrySettings: () => void;
}) {
  const enabled = settings?.enabled ?? false;
  const [automationError, setAutomationError] = useState<string>();
  const [automationSuccess, setAutomationSuccess] = useState<string>();
  const [isUpdatingAutomation, setIsUpdatingAutomation] = useState(false);
  const [confirmDisableOpen, setConfirmDisableOpen] = useState(false);
  const [selectedLogSolution, setSelectedLogSolution] = useState<AutoAnswerLog | null>(null);
  const [selectedLogMessage, setSelectedLogMessage] = useState<AutoAnswerLog | null>(null);
  const [logSearch, setLogSearch] = useState("");
  const [logEventType, setLogEventType] = useState<string | null>(null);
  const [logStatus, setLogStatus] = useState<string | null>(null);
  const [logDateFrom, setLogDateFrom] = useState("");
  const [logDateTo, setLogDateTo] = useState("");
  const [logPageSize, setLogPageSize] = useState<10 | 20 | 50 | 100>(10);
  const logSearchTimer = useRef<number | null>(null);
  const messageElements = useRef(new Map<string, HTMLParagraphElement>());
  const [truncatedMessageIds, setTruncatedMessageIds] = useState<Set<string>>(new Set());

  const loadLogs = (overrides: Partial<AutoAnswerLogsQuery> = {}) => {
    const query: AutoAnswerLogsQuery = {
      page: overrides.page ?? 1,
      pageSize: overrides.pageSize ?? logPageSize,
      search: overrides.search ?? logSearch,
      eventType: overrides.eventType ?? logEventType ?? undefined,
      status: overrides.status ?? logStatus ?? undefined,
      dateFrom: overrides.dateFrom ?? logDateFrom,
      dateTo: overrides.dateTo ?? logDateTo,
    };
    void onLoadLogs(query);
  };

  const updateLogFilter = (key: keyof AutoAnswerLogsQuery, value: string) => {
    if (key === "search") {
      setLogSearch(value);
      if (logSearchTimer.current) window.clearTimeout(logSearchTimer.current);
      logSearchTimer.current = window.setTimeout(() => loadLogs({ search: value, page: 1 }), 350);
      return;
    }
    if (logSearchTimer.current) window.clearTimeout(logSearchTimer.current);
    if (key === "eventType") setLogEventType(value || null);
    if (key === "status") setLogStatus(value || null);
    if (key === "dateFrom") setLogDateFrom(value);
    if (key === "dateTo") setLogDateTo(value);
    loadLogs({ [key]: value, page: 1 });
  };

  useEffect(() => () => {
    if (logSearchTimer.current) window.clearTimeout(logSearchTimer.current);
  }, []);

  const clearLogFilters = () => {
    setLogSearch("");
    setLogEventType(null);
    setLogStatus(null);
    setLogDateFrom("");
    setLogDateTo("");
    loadLogs({ page: 1, search: "", eventType: "", status: "", dateFrom: "", dateTo: "" });
  };

  useEffect(() => {
    const measureTruncatedMessages = () => {
      const nextIds = new Set<string>();
      messageElements.current.forEach((element, id) => {
        if (element.scrollHeight > element.clientHeight) nextIds.add(id);
      });
      setTruncatedMessageIds(nextIds);
    };

    measureTruncatedMessages();
    window.addEventListener("resize", measureTruncatedMessages);
    return () => window.removeEventListener("resize", measureTruncatedMessages);
  }, [logs]);

  const hasRecordedSolution = (log: AutoAnswerLog) => Boolean(log.solutionText?.trim());
  const automationBanner = enabled
    ? "Auto-answer เปิดใช้งานแล้ว ระบบจะตอบเฉพาะเคสที่ผ่าน guardrail"
    : "Auto-answer ปิดใช้งานอยู่ เคสใหม่จะถูกส่งให้ทีม Tech Support";

  const openLogMessageDrawer = (log: AutoAnswerLog) => {
    setSelectedLogMessage(log);
  };

  const toggleAutomation = async () => {
    if (isUpdatingAutomation || !settings) return;

    setAutomationError(undefined);
    setAutomationSuccess(undefined);

    if (enabled) {
      setConfirmDisableOpen(true);
      return;
    }

    setIsUpdatingAutomation(true);
    try {
      await onUpdateSettings({ enabled: true });
      setAutomationSuccess("เปิดใช้งาน Auto-answer แล้ว");
    } catch (error) {
      setAutomationError(error instanceof Error ? error.message : "ไม่สามารถเปลี่ยนสถานะ auto-answer ได้ กรุณาลองใหม่");
    } finally {
      setIsUpdatingAutomation(false);
    }
  };

  const confirmDisableAutomation = async () => {
    if (isUpdatingAutomation || !settings) return;

    setIsUpdatingAutomation(true);
    setAutomationError(undefined);
    setAutomationSuccess(undefined);
    try {
      await onUpdateSettings({ emergencyDisable: true });
      setConfirmDisableOpen(false);
      setAutomationSuccess("ปิดใช้งาน Auto-answer แล้ว");
    } catch (error) {
      setAutomationError(error instanceof Error ? error.message : "ไม่สามารถปิดใช้งาน Auto-answer ได้ กรุณาลองใหม่");
    } finally {
      setIsUpdatingAutomation(false);
    }
  };

  const hasActiveLogFilter = Boolean(logSearch || logEventType || logStatus || logDateFrom || logDateTo);
  const hasLogData = logsPage.totalItems > 0;
  const showLogFilters = isLoadingLogs || hasLogData || hasActiveLogFilter;

  return (
    <Stack className="automationPage" gap="md">
      {isLoadingSettings ? (
        <Skeleton className="automationStatusSkeleton" height={50} radius="md" />
      ) : settingsError ? (
        <Alert color="red" icon={<AppIcon name="alert" />} radius="md" variant="light">
          <Group justify="space-between">
            <Text size="sm">{settingsError}</Text>
            <Button onClick={onRetrySettings} size="compact-sm" variant="light">โหลดอีกครั้ง</Button>
          </Group>
        </Alert>
      ) : (
        <Alert className="automationStatusAlert" color={enabled ? "green" : "yellow"} icon={<AppIcon name="settings" />} radius="md" variant="light">
          {automationBanner}
        </Alert>
      )}

      <Card className="automationSettingsCard" padding="lg" radius="md" withBorder>
        <Box>
          <Title order={3}>การตอบอัตโนมัติแบบมีเงื่อนไข</Title>
          <Text c="dimmed" size="sm">
            ระบบจะตอบอัตโนมัติได้เมื่อ AI มีความมั่นใจทั้งการเข้าใจเคสและการเลือกวิธีแก้ตามเกณฑ์ที่กำหนด
          </Text>
        </Box>
        <SimpleGrid cols={{ base: 1, md: 2 }} mt="lg">
          <Paper bg="gray.0" p="md" radius="md">
            <Text c="dimmed" fw={700} size="sm">เข้าใจเคสถูกต้อง</Text>
            <Title order={2}>{settings?.caseUnderstandingThreshold ?? 98}%</Title>
          </Paper>
          <Paper bg="gray.0" p="md" radius="md">
            <Text c="dimmed" fw={700} size="sm">เลือกวิธีแก้ถูกต้อง</Text>
            <Title order={2}>{settings?.caseDiscriminationThreshold ?? 98}%</Title>
          </Paper>
        </SimpleGrid>
        <SimpleGrid className="automationSettingsMeta" cols={{ base: 1, sm: 2 }} mt="md">
          <Box>
            <Text c="dimmed" size="xs">อัปเดตล่าสุดเมื่อ</Text>
            <Text fw={600} size="sm">{settings?.updatedAt ? formatEventTime(settings.updatedAt) : "ไม่พบข้อมูลอัปเดตล่าสุด"}</Text>
          </Box>
          <Box>
            <Text c="dimmed" size="xs">เปิด/ปิดใช้งานล่าสุดโดย</Text>
            <Text fw={600} size="sm">ไม่พบข้อมูลผู้ดำเนินการ</Text>
          </Box>
        </SimpleGrid>
        <Paper className={enabled ? "emergencyPanel" : "automationEnablePanel"} mt="md" p="md" radius="md">
          <Flex align={{ base: "stretch", sm: "center" }} direction={{ base: "column", sm: "row" }} gap="md" justify="space-between">
            <Box>
              <Text c={enabled ? "red.8" : "green.8"} fw={800}>{enabled ? "หยุดการตอบอัตโนมัติ" : "เปิดการตอบอัตโนมัติ"}</Text>
              <Text c="dimmed" size="sm">
                {enabled ? "ปิดทันทีและส่งเคสใหม่ทั้งหมดกลับเข้าคิวทีม Tech Support" : "เปิดระบบให้ตอบอัตโนมัติเฉพาะเคสที่ผ่าน guardrail"}
              </Text>
            </Box>
            <Button
              color={enabled ? "red" : "green"}
              disabled={!settings}
              loading={isUpdatingAutomation}
              leftSection={isUpdatingAutomation ? undefined : <AppIcon name={enabled ? "stop" : "check"} />}
              onClick={() => void toggleAutomation()}
            >
              {isUpdatingAutomation ? "กำลังอัปเดต..." : enabled ? "ปิดใช้งาน" : "เปิดใช้งาน"}
            </Button>
          </Flex>
        </Paper>
        {automationError ? <Box className="automationErrorToast" role="alert">{automationError}</Box> : null}
        {automationSuccess ? <Box className="automationSuccessToast" role="status">{automationSuccess}</Box> : null}
      </Card>

      <Card className="automationSectionCard" padding="lg" radius="md" withBorder>
        <Title mb="md" order={3}>Solution ที่ผ่าน guardrail</Title>
        {solutions.length > 0 ? (
          <ScrollArea type="auto">
            <Table highlightOnHover miw={720}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>หมวดหมู่</Table.Th>
                  <Table.Th>เข้าใจเคส</Table.Th>
                  <Table.Th>แยกเคส</Table.Th>
                  <Table.Th>วิธีแก้</Table.Th>
                  <Table.Th>สถานะ</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {solutions.map((item) => (
                  <Table.Tr key={item.id}>
                    <Table.Td>{item.category}</Table.Td>
                    <Table.Td>{item.caseUnderstandingConfidence}%</Table.Td>
                    <Table.Td>{item.caseDiscriminationConfidence}%</Table.Td>
                    <Table.Td>{item.solutionText}</Table.Td>
                    <Table.Td><Badge color="green" variant="light">auto-answer ได้</Badge></Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        ) : (
          <Stack align="center" className="automationEmptyState" gap="xs" ta="center">
            <ThemeIcon color="green" radius="xl" size={42} variant="light"><AppIcon name="check" /></ThemeIcon>
            <Text fw={700}>ยังไม่มี Solution ที่ผ่าน Guardrail</Text>
            <Text c="dimmed" size="sm">Solution จะแสดงที่นี่เมื่อผ่านเกณฑ์ความมั่นใจทั้งสองด้าน</Text>
          </Stack>
        )}
      </Card>

      <Card className="autoAnswerLogsCard" padding="md" radius="md" withBorder>
        <Title mb="sm" order={3}>ประวัติการแจ้งเตือน Auto-answer</Title>
        {showLogFilters ? <Box className="autoAnswerLogsFilters" mb="sm">
          <TextInput
            className="autoAnswerLogsSearch"
            label="ค้นหา"
            placeholder="ค้นหาหมายเลขเคส ผู้ใช้งาน หรือข้อความ"
            value={logSearch}
            onChange={(event) => updateLogFilter("search", event.currentTarget.value)}
          />
          <Select
            className="autoAnswerLogsEventType"
            clearable
            data={[
              { value: "CASE_ACKNOWLEDGEMENT", label: "รับเรื่อง" },
              { value: "CUSTOMER_REPLY", label: "ตอบผู้ใช้งาน" },
              { value: "REQUEST_MORE_INFO", label: "ขอข้อมูลเพิ่ม" },
              { value: "STATUS_UPDATE", label: "อัปเดตสถานะ" },
              { value: "CASE_CLOSED", label: "ปิดเคส" },
            ]}
            label="ประเภทข้อความ"
            placeholder="ทั้งหมด"
            value={logEventType}
            onChange={(value) => updateLogFilter("eventType", value ?? "")}
          />
          <Select
            className="autoAnswerLogsStatus"
            clearable
            data={[
              { value: "sent", label: "ส่งสำเร็จ" },
              { value: "pending", label: "รอดำเนินการ" },
              { value: "failed", label: "ส่งไม่สำเร็จ" },
            ]}
            label="สถานะ"
            placeholder="ทั้งหมด"
            value={logStatus}
            onChange={(value) => updateLogFilter("status", value ?? "")}
          />
          <TextInput className="autoAnswerLogsDateFrom" label="ตั้งแต่วันที่" type="date" value={logDateFrom} onChange={(event) => updateLogFilter("dateFrom", event.currentTarget.value)} />
          <TextInput className="autoAnswerLogsDateTo" label="ถึงวันที่" type="date" value={logDateTo} onChange={(event) => updateLogFilter("dateTo", event.currentTarget.value)} />
          <Button className="autoAnswerLogsClear" disabled={!logSearch && !logEventType && !logStatus && !logDateFrom && !logDateTo} variant="subtle" onClick={clearLogFilters}>ล้างตัวกรอง</Button>
        </Box> : null}
        {hasLogData ? <ScrollArea className="autoAnswerLogsTableScroll" type="auto">
          <Table
            className="autoAnswerLogsTable"
            horizontalSpacing={0}
            layout="fixed"
            miw={950}
            verticalSpacing={0}
          >
            <Table.Thead className="autoAnswerLogsTableHead">
              <Table.Tr>
                <Table.Th style={{ width: 120 }}>เวลา</Table.Th>
                <Table.Th style={{ width: 190 }}>ผู้ใช้งาน</Table.Th>
                <Table.Th>ข้อความที่ตอบ</Table.Th>
                <Table.Th className="autoAnswerLogsCenteredHeader" style={{ width: 120 }}>วิธีแก้</Table.Th>
                <Table.Th className="autoAnswerLogsCenteredHeader" style={{ width: 160 }}>Teams</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {logs.map((item) => (
                <Table.Tr className="autoAnswerLogsTableRow" key={item.id}>
                  <Table.Td className="autoAnswerLogsCell">
                    <Box style={{ whiteSpace: "nowrap" }}>
                      <Text fw={500} size="sm">{formatEventDate(item.time)}</Text>
                      <Text c="dimmed" mt={2} size="xs">{formatEventClock(item.time)} น.</Text>
                    </Box>
                  </Table.Td>
                  <Table.Td className="autoAnswerLogsCell">
                    <Box miw={0}>
                      <Text fw={500} size="sm" truncate>{item.customer}</Text>
                      {item.caseNumber ? (
                        <Button
                          color="blue"
                          fw={600}
                          mt={2}
                          onClick={() => void (item.caseId ? onOpenCase(item.caseId) : onOpenCaseByNumber(item.caseNumber))}
                          p={0}
                          size="xs"
                          styles={{ label: { overflow: "visible", whiteSpace: "nowrap" } }}
                          variant="transparent"
                        >
                          {item.caseNumber}
                        </Button>
                      ) : null}
                    </Box>
                  </Table.Td>
                  <Table.Td className="autoAnswerLogsCell">
                    <Box
                      aria-label={`เปิดรายละเอียดข้อความของ ${item.caseNumber}`}
                      className="autoAnswerLogMessage"
                      miw={0}
                      onClick={() => openLogMessageDrawer(item)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openLogMessageDrawer(item);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <Text
                        className="line-clamp-2 break-words autoAnswerLogMessageText"
                        component="p"
                        m={0}
                        ref={(element) => {
                          if (element) messageElements.current.set(item.id, element);
                          else messageElements.current.delete(item.id);
                        }}
                        size="sm"
                        style={{
                          display: "-webkit-box",
                          lineHeight: "1.35rem",
                          overflow: "hidden",
                          WebkitBoxOrient: "vertical",
                          WebkitLineClamp: 2,
                        }}
                      >
                        {item.answerText}
                      </Text>
                      {truncatedMessageIds.has(item.id) ? (
                        <Button
                          className="autoAnswerLogMoreButton"
                          mt={2}
                          onClick={(event) => {
                            event.stopPropagation();
                            openLogMessageDrawer(item);
                          }}
                          p={0}
                          size="xs"
                          variant="transparent"
                        >
                          ดูเพิ่มเติม
                        </Button>
                      ) : null}
                    </Box>
                  </Table.Td>
                  <Table.Td className="autoAnswerLogsCell autoAnswerLogsCenteredColumn">
                    <Box className="autoAnswerLogsCenteredCell">
                      {hasRecordedSolution(item) ? (
                        <Button className="autoAnswerLogsSolutionButton" size="xs" variant="light" onClick={() => setSelectedLogSolution(item)}>
                          ดูวิธีแก้
                        </Button>
                      ) : (
                        <Text className="autoAnswerLogsSolutionEmpty" c="dimmed" size="sm" ta="center">—</Text>
                      )}
                    </Box>
                  </Table.Td>
                  <Table.Td className="autoAnswerLogsCell autoAnswerLogsCenteredColumn">
                    <Box className="autoAnswerLogsCenteredCell">
                      <Badge className="autoAnswerLogsTeamsBadge" color={item.teamsNotified ? "green" : "gray"} variant="light">
                        {item.teamsNotified ? "แจ้ง Teams แล้ว" : "ยังไม่แจ้ง"}
                      </Badge>
                    </Box>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea> : isLoadingLogs ? (
          <Stack className="automationLogSkeleton" gap="xs">
            {[0, 1, 2].map((item) => <Skeleton height={42} key={item} radius="sm" />)}
          </Stack>
        ) : (
          <Stack align="center" className="automationEmptyState" gap="xs" ta="center">
            <ThemeIcon color="gray" radius="xl" size={42} variant="light"><AppIcon name="inbox" /></ThemeIcon>
            <Text fw={700}>{hasActiveLogFilter ? "ไม่พบข้อมูลที่ตรงกับตัวกรอง" : "ยังไม่มีประวัติ Auto-answer"}</Text>
            <Text c="dimmed" size="sm">{hasActiveLogFilter ? "ลองปรับตัวกรองหรือกดล้างตัวกรองเพื่อดูข้อมูลทั้งหมด" : "ประวัติการตอบอัตโนมัติและการแจ้งเตือนจะแสดงที่นี่"}</Text>
          </Stack>
        )}
        {hasLogData ? <Flex className="autoAnswerLogsPagination" align="center" justify="space-between" mt="xs" wrap="wrap" gap="sm">
          <Text c="dimmed" size="sm">
            แสดง {logsPage.totalItems === 0 ? 0 : ((logsPage.page - 1) * logsPage.pageSize) + 1}–{logsPage.totalItems === 0 ? 0 : Math.min(logsPage.page * logsPage.pageSize, logsPage.totalItems)} จาก {logsPage.totalItems} รายการ
          </Text>
          {logsPage.totalPages > 1 ? (
            <Group className="autoAnswerLogsPaginationControls" gap="sm" wrap="wrap">
              <Group className="autoAnswerLogsPageSize" gap="xs" wrap="nowrap">
                <Text c="dimmed" fw={500} size="xs" style={{ whiteSpace: "nowrap" }}>
                  รายการต่อหน้า
                </Text>
                <Select
                  aria-label="จำนวนรายการต่อหน้า"
                  className="autoAnswerLogsPageSizeSelect"
                  data={["10", "20", "50", "100"]}
                  value={String(logPageSize)}
                  onChange={(value) => {
                    const nextPageSize = Number(value) as 10 | 20 | 50 | 100;
                    setLogPageSize(nextPageSize);
                    loadLogs({ page: 1, pageSize: nextPageSize });
                  }}
                  w={100}
                />
              </Group>
              <Pagination
                className="autoAnswerLogsPaginationNav"
                boundaries={1}
                disabled={isLoadingLogs}
                gap={4}
                getControlProps={(control) => {
                  const labels = {
                    first: "ไปหน้าแรก",
                    previous: "หน้าก่อนหน้า",
                    next: "หน้าถัดไป",
                    last: "ไปหน้าสุดท้าย",
                  } as const;
                  return { "aria-label": labels[control], title: labels[control] };
                }}
                getItemProps={(page) => ({
                  "aria-label": `ไปหน้า ${page}`,
                  ...(page === logsPage.page ? { "aria-current": "page" } : {}),
                })}
                onChange={(page) => loadLogs({ page })}
                radius="md"
                size="sm"
                siblings={1}
                styles={{
                  root: {
                    alignItems: "center",
                  },
                  control: {
                    boxSizing: "border-box",
                    width: 30,
                    minWidth: 30,
                    maxWidth: 30,
                    height: 30,
                    minHeight: 30,
                    padding: 0,
                    fontSize: 13,
                    fontWeight: 500,
                    lineHeight: 1,
                    fontVariantNumeric: "tabular-nums",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  },
                  dots: {
                    width: 22,
                    minWidth: 22,
                    height: 30,
                    padding: 0,
                    fontSize: 13,
                    lineHeight: 1,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  },
                }}
                total={logsPage.totalPages}
                value={logsPage.page}
                withEdges
              />
            </Group>
          ) : null}
        </Flex> : null}

      </Card>
      <Modal
        onClose={() => {
          if (!isUpdatingAutomation) setConfirmDisableOpen(false);
        }}
        opened={confirmDisableOpen}
        title="ยืนยันการปิด Auto-answer"
      >
        <Stack gap="md">
          <Text size="sm">
            ระบบจะหยุดตอบอัตโนมัติทันที และส่งเคสใหม่ทั้งหมดกลับเข้าคิวทีม Tech Support
          </Text>
          {automationError ? <Alert color="red" title="ปิดใช้งานไม่สำเร็จ" variant="light">{automationError}</Alert> : null}
          <Group justify="flex-end">
            <Button disabled={isUpdatingAutomation} onClick={() => setConfirmDisableOpen(false)} variant="default">ยกเลิก</Button>
            <Button color="red" loading={isUpdatingAutomation} onClick={() => void confirmDisableAutomation()}>ยืนยันปิดใช้งาน</Button>
          </Group>
        </Stack>
      </Modal>
      <Drawer
        onClose={() => setSelectedLogMessage(null)}
        opened={Boolean(selectedLogMessage)}
        padding="lg"
        position="right"
        size="min(100%, 540px)"
        title="รายละเอียดข้อความ"
        withCloseButton
        zIndex={210}
      >
        <Stack gap="md">
          <Box>
            <Text c="dimmed" size="xs">วันที่และเวลา</Text>
            <Text fw={500}>{formatEventTime(selectedLogMessage?.time)}</Text>
          </Box>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <Box>
              <Text c="dimmed" size="xs">ผู้ใช้งาน</Text>
              <Text fw={500}>{selectedLogMessage?.customer ?? "-"}</Text>
            </Box>
            <Box>
              <Text c="dimmed" size="xs">หมายเลขเคส</Text>
              <Text fw={500}>{selectedLogMessage?.caseNumber || "-"}</Text>
            </Box>
            <Box>
              <Text c="dimmed" size="xs">ประเภทข้อความ</Text>
              <Text fw={500}>
                {selectedLogMessage?.eventType
                  ? autoAnswerLogEventLabels[selectedLogMessage.eventType] ?? selectedLogMessage.eventType
                  : "-"}
              </Text>
            </Box>
            <Box>
              <Text c="dimmed" size="xs">Teams</Text>
              <Badge color={selectedLogMessage?.teamsNotified ? "green" : "gray"} variant="light">
                {selectedLogMessage?.teamsNotified ? "แจ้ง Teams แล้ว" : "ยังไม่แจ้ง"}
              </Badge>
            </Box>
          </SimpleGrid>
          <Box>
            <Text c="dimmed" mb={6} size="xs">ข้อความฉบับเต็ม</Text>
            <Paper bg="gray.0" p="md" radius="md" withBorder>
              <Text
                size="sm"
                style={{
                  lineHeight: 1.6,
                  overflowWrap: "break-word",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {selectedLogMessage?.answerText ?? "-"}
              </Text>
            </Paper>
          </Box>
          {selectedLogMessage?.solutionText ? (
            <Box>
              <Text c="dimmed" mb={6} size="xs">วิธีแก้</Text>
              <Paper bg="gray.0" p="md" radius="md" withBorder>
                <Text
                  size="sm"
                  style={{
                    lineHeight: 1.6,
                    overflowWrap: "break-word",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {selectedLogMessage.solutionText}
                </Text>
              </Paper>
            </Box>
          ) : null}
        </Stack>
      </Drawer>
      <Modal
        centered
        onClose={() => setSelectedLogSolution(null)}
        opened={Boolean(selectedLogSolution)}
        title={`วิธีแก้ของ ${selectedLogSolution?.caseNumber ?? ""}`}
      >
        <Text style={{ whiteSpace: "pre-wrap" }}>
          {selectedLogSolution?.solutionText ?? "—"}
        </Text>
      </Modal>
    </Stack>
  );
}

export default function OffMlProjectDashboardContent({
  caseId,
  initialTab,
  initialInboxUserId,
}: {
  caseId?: string;
  initialTab?: string;
  initialInboxUserId?: string;
}) {
  const router = useRouter();
  const requestedRootTab = getRootTab(initialTab ?? null);
  const [activeTab, setActiveTab] = useState<string | null>(caseId ? "detail" : requestedRootTab);
  const [cases, setCases] = useState<SupportCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<SupportCase | null>(null);
  const [isLoadingCases, setIsLoadingCases] = useState(true);
  const [, setCaseError] = useState<string>();
  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummary>(EMPTY_ANALYTICS_SUMMARY);
  const [automationSettings, setAutomationSettings] = useState<AutomationSettings | null>(null);
  const [autoAnswerLogsState, setAutoAnswerLogsState] = useState<AutoAnswerLogsPage>(EMPTY_AUTO_ANSWER_LOGS_PAGE);
  const [isLoadingAutoAnswerLogs, setIsLoadingAutoAnswerLogs] = useState(true);
  const autoAnswerLogsRequestId = useRef(0);
  const [autoAnswerSolutionsState, setAutoAnswerSolutionsState] = useState<AutoAnswerSolution[]>([]);
  const [isLoadingAutomationSettings, setIsLoadingAutomationSettings] = useState(true);
  const [automationSettingsError, setAutomationSettingsError] = useState<string>();
  const [confidenceSuggestionsState, setConfidenceSuggestionsState] = useState<ConfidenceSuggestion[]>([]);
  const [confidenceError, setConfidenceError] = useState<string>();
  const [isLoadingConfidenceSuggestions, setIsLoadingConfidenceSuggestions] = useState(true);
  const [dashboardError, setDashboardError] = useState<string>();
  const [initialAction, setInitialAction] = useState<"accept" | "request-info">();
  const [inboxDrillDown, setInboxDrillDown] = useState<{ category?: string; confidence?: string; requestId: number }>();

  const loadCases = useCallback(async () => {
    setIsLoadingCases(true);
    setCaseError(undefined);

    try {
      const query = new URLSearchParams(window.location.search);
      const nextCases = await getCases({
        category: query.get("category") ?? undefined,
        kpi: query.get("kpi") ?? undefined,
      });
      const requestedAction = new URLSearchParams(window.location.search).get("action");
      setCases(nextCases);
      setSelectedCase((current) => {
        if (!nextCases.length) return null;
        const requestedCase = nextCases.find((item) => item.id === caseId);
        if (!current && requestedCase) return requestedCase;
        if (!current) return nextCases[0];
        return nextCases.find((item) => item.id === current.id) ?? nextCases[0];
      });
      if (caseId) {
        setActiveTab("detail");
        if (requestedAction === "accept" || requestedAction === "request-info") {
          setInitialAction(requestedAction);
        }

        const latestCase = await getCase(caseId);
        setSelectedCase(latestCase);
        setCases((current) => current.map((item) => (item.id === latestCase.id ? latestCase : item)));
      }
    } catch (error) {
      setCaseError(error instanceof Error ? error.message : "โหลดข้อมูลเคสจาก backend ไม่สำเร็จ");
    } finally {
      setIsLoadingCases(false);
    }
  }, [caseId]);

  const loadAnalyticsSummary = useCallback(async (range: "today" | "7d" | "30d" = "30d") => {
    try {
      setAnalyticsSummary(await getAnalyticsSummary(range));
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : "โหลด Analytics จาก backend ไม่สำเร็จ");
    }
  }, []);

  const loadAutoAnswerLogs = async (query: AutoAnswerLogsQuery) => {
    const requestId = ++autoAnswerLogsRequestId.current;
    setIsLoadingAutoAnswerLogs(true);
    try {
      const nextLogs = await getAutoAnswerLogs(query);
      if (requestId === autoAnswerLogsRequestId.current) setAutoAnswerLogsState(nextLogs);
    } catch (error) {
      if (requestId === autoAnswerLogsRequestId.current) {
        setDashboardError(error instanceof Error ? error.message : "โหลด Auto-answer notification log ไม่สำเร็จ");
      }
    } finally {
      if (requestId === autoAnswerLogsRequestId.current) setIsLoadingAutoAnswerLogs(false);
    }
  };

  const loadDashboardData = async () => {
    setIsLoadingConfidenceSuggestions(true);
    setConfidenceError(undefined);
    setIsLoadingAutomationSettings(true);
    setAutomationSettingsError(undefined);
    const logRequestId = ++autoAnswerLogsRequestId.current;

    const confidenceSuggestionsRequest = getConfidenceSuggestions().finally(() => {
      setIsLoadingConfidenceSuggestions(false);
    });
    const automationSettingsRequest = getAutomationSettings().finally(() => {
      setIsLoadingAutomationSettings(false);
    });
    const results = await Promise.allSettled([
      confidenceSuggestionsRequest,
      getAnalyticsSummary(),
      automationSettingsRequest,
      getAutoAnswerSolutions(),
      getAutoAnswerLogs({ page: 1, pageSize: 10 }),
    ]);
    const failures: string[] = [];
    const [suggestions, summary, settings, solutions, logs] = results;

    if (suggestions.status === "fulfilled") {
      setConfidenceSuggestionsState(suggestions.value);
      setConfidenceError(undefined);
    } else {
      const message = suggestions.reason instanceof Error ? suggestions.reason.message : "โหลดรายการ Confidence Review จาก backend ไม่สำเร็จ";
      setConfidenceError(message);
      failures.push("Confidence Review");
    }
    if (summary.status === "fulfilled") setAnalyticsSummary(summary.value);
    else failures.push("Analytics");
    if (settings.status === "fulfilled") {
      setAutomationSettings(settings.value);
      setAutomationSettingsError(undefined);
    } else {
      const message = settings.reason instanceof Error ? settings.reason.message : "โหลดการตั้งค่า Auto-answer จาก backend ไม่สำเร็จ";
      setAutomationSettingsError(message);
      failures.push("Automation settings");
    }
    if (solutions.status === "fulfilled") setAutoAnswerSolutionsState(solutions.value);
    else failures.push("Automation solutions");
    if (logs.status === "fulfilled" && logRequestId === autoAnswerLogsRequestId.current) {
      setAutoAnswerLogsState(logs.value);
      setIsLoadingAutoAnswerLogs(false);
    } else {
      if (logRequestId === autoAnswerLogsRequestId.current) setIsLoadingAutoAnswerLogs(false);
      failures.push("Automation logs");
    }

    setDashboardError(
      failures.length
        ? `โหลดข้อมูลบางส่วนไม่สำเร็จ: ${failures.join(", ")} กดโหลดใหม่เพื่อทดลองอีกครั้ง`
        : undefined,
    );
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCases();
      void loadDashboardData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadCases]);

  const handleOpenCase = (item: SupportCase) => {
    router.push(`/cases/${encodeURIComponent(item.id)}`);
  };

  const handleOpenCaseById = async (nextCaseId: string) => {
    router.push(`/cases/${encodeURIComponent(nextCaseId)}`);
  };

  const handleOpenCaseByNumber = async (caseNumber: string) => {
    const matchingCase = cases.find((item) => item.caseNumber === caseNumber);
    if (!matchingCase) {
      setCaseError(`ไม่พบเคส ${caseNumber} ในข้อมูลปัจจุบัน`);
      return;
    }
    handleOpenCase(matchingCase);
  };

  const handleBackToInbox = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/");
  };

  const handleAnalyticsDrillDown = (filter: { category?: string; confidence?: string }) => {
    setInboxDrillDown({ ...filter, requestId: Date.now() });
    setActiveTab("cases");
    const params = new URLSearchParams({ tab: "cases" });
    if (filter.category) params.set("category", filter.category);
    router.push(`/?${params.toString()}`);
  };

  const handleAcceptCase = async () => {
    if (!selectedCase) return;
    const updatedCase = await acceptCase(selectedCase.id);
    setSelectedCase(updatedCase);
    setCases((current) => current.map((item) => (item.id === updatedCase.id ? updatedCase : item)));
  };

  const handleRequestInfo = async (text: string, sourceMessageId?: string) => {
    if (!selectedCase) return;
    const updatedCase = await requestAdditionalInfo(selectedCase.id, text, sourceMessageId);
    setSelectedCase(updatedCase);
    setCases((current) => current.map((item) => (item.id === updatedCase.id ? updatedCase : item)));
  };

  const handleReply = async (text: string) => {
    if (!selectedCase) return;
    const updatedCase = await replyToCustomer(selectedCase.id, text);
    setSelectedCase(updatedCase);
    setCases((current) => current.map((item) => (item.id === updatedCase.id ? updatedCase : item)));
  };

  const handleCloseCase = async (text: string, closedWithoutTechConfirmation?: boolean, closeSummary?: { cause: string; resolution: string; prevention: string }) => {
    if (!selectedCase) return;
    const updatedCase = await closeCaseWithReply(selectedCase.id, text, closedWithoutTechConfirmation, closeSummary);
    setSelectedCase(updatedCase);
    setCases((current) => current.map((item) => (item.id === updatedCase.id ? updatedCase : item)));
  };

  const handleComposeAi = async (mode: AiComposeMode, supportInstruction?: string, requestedInformation?: string) => {
    if (!selectedCase) throw new Error("ยังไม่ได้เลือกเคส");
    return composeAiMessage(selectedCase.id, { mode, supportInstruction, requestedInformation });
  };

  const handleRewriteAi = async (mode: AiRewriteMode, text: string) => {
    if (!selectedCase) throw new Error("ยังไม่ได้เลือกเคส");
    if (mode === "REQUEST_MORE_INFO") {
      return rewriteAdditionalInfoRequest(selectedCase.id, text);
    }
    return rewriteCustomerReply(selectedCase.id, text, mode === "CLOSING_SUMMARY" ? "CLOSING_REPLY" : "NORMAL_REPLY");
  };

  const handleReopenCase = async (reason: string) => {
    if (!selectedCase) return;
    const updatedCase = await reopenCase(selectedCase.id, reason);
    setSelectedCase(updatedCase);
    setCases((current) => current.map((item) => (item.id === updatedCase.id ? updatedCase : item)));
  };

  const handleSaveAiFeedback = async (input: { analysisId: string; analysisVersion: number; feedbackType: "ISSUE_UNDERSTANDING" | "SOLUTION_SELECTION"; result: "CORRECT" | "INCORRECT" }) => {
    if (!selectedCase) return;
    const saved = await saveCaseAiFeedback(selectedCase.id, input);
    const updatedCase = { ...selectedCase, aiFeedback: saved.aiFeedback,
      caseUnderstandingFeedback: saved.aiFeedback.issueUnderstanding,
      solutionSelectionFeedback: saved.aiFeedback.solutionSelection };
    setSelectedCase(updatedCase);
    setCases((current) => current.map((item) => (item.id === updatedCase.id ? updatedCase : item)));
    await loadAnalyticsSummary();
  };

  const handleRefreshSolution = async () => {
    if (!selectedCase) return;
    const updatedCase = await refreshCaseExtractedSolution(selectedCase.id);
    setSelectedCase(updatedCase);
    setCases((current) => current.map((item) => item.id === updatedCase.id ? updatedCase : item));
  };

  const handleReviewSuggestion = async (item: ConfidenceSuggestion, result: "approved" | "rejected", feedback?: { understandingIncorrect: boolean; solutionIncorrect: boolean; explanation: string }) => {
    if (!item.analysisId || !item.analysisVersion) {
      throw new Error("ยังไม่มีผลวิเคราะห์ที่สามารถประเมินได้");
    }
    const understandingResult = result === "approved"
      ? "CORRECT"
      : feedback?.understandingIncorrect ? "INCORRECT" : undefined;
    const solutionResult = result === "approved"
      ? (item.hasSuggestedSolution === false ? undefined : "CORRECT")
      : feedback?.solutionIncorrect ? "INCORRECT" : undefined;
    if (!understandingResult && !solutionResult) {
      throw new Error("กรุณาเลือกด้านที่ AI วิเคราะห์ไม่ถูกต้องอย่างน้อย 1 ด้าน");
    }
    await reviewConfidenceSuggestion({
      caseId: item.caseId,
      id: item.id,
      analysisId: item.analysisId,
      analysisVersion: item.analysisVersion,
      understandingResult,
      solutionResult,
      reason: feedback?.explanation,
    });
    await Promise.all([loadCases(), loadDashboardData()]);
    setActiveTab("confidence");
  };

  const handleUpdateAutomationSettings = async (input: { emergencyDisable?: boolean; enabled?: boolean }) => {
    const updatedSettings = await updateAutomationSettings(input);
    setAutomationSettings(updatedSettings);
  };

  return (
    <AppShell
      className="appShell"
      header={{ height: 64 }}
      navbar={{ width: 280, breakpoint: "sm" }}
      padding={0}
    >
      <AppShell.Header className="header">
        <Group h="100%" justify="space-between" px="lg">
          <Group gap="md">
            <ThemeIcon color="blue" radius="md" size={40}>
              <AppIcon name="message" />
            </ThemeIcon>
            <Box>
              <Title order={3}>Off ML Project</Title>
              <Text c="dimmed" size="xs">LINE intake · AI analysis · Tech Support Console</Text>
            </Box>
          </Group>
          <Badge color="blue" variant="light">Tech Support Console</Badge>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar className="sidebar" p="md">
        <Stack gap="xs">
          {OFF_ML_PROJECT_TABS.map((tab) => {
            const icon: IconName =
              tab.value === "inbox"
                ? "inbox"
                : tab.value === "confidence"
                    ? "check"
                    : tab.value === "analytics"
                      ? "chart"
                      : "settings";
            return (
              <NavLink
                active={activeTab === tab.value}
                key={tab.value}
                label={tab.label}
                leftSection={<AppIcon name={icon} />}
                onClick={() => {
                  const target = tab.value === "inbox" ? "/" : `/?tab=${tab.value}`;
                  router.push(target);
                }}
                variant="light"
              />
            );
          })}
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Box className="content">
          {dashboardError ? (
            <Alert color="yellow" mb="lg" title="โหลดข้อมูล Dashboard ได้บางส่วน" variant="light">
              <Group justify="space-between">
                <Text>{dashboardError}</Text>
                <Button onClick={() => void loadDashboardData()} size="xs" variant="light">
                  โหลดใหม่
                </Button>
              </Group>
            </Alert>
          ) : null}
          <Tabs value={activeTab} onChange={setActiveTab} keepMounted={false}>
            <Tabs.Panel value="inbox">
              <InboxWorkspace initialUserId={initialInboxUserId} />
            </Tabs.Panel>
            <Tabs.Panel value="cases">
              <CaseInbox
                cases={cases}
                drillDown={inboxDrillDown}
                error={undefined}
                isLoading={isLoadingCases}
                onOpenCase={handleOpenCase}
                onRefresh={() => void loadCases()}
                selectedCaseId={selectedCase?.id}
              />
            </Tabs.Panel>
            <Tabs.Panel value="detail">
              <CaseDetail
                initialAction={initialAction}
                isLoading={isLoadingCases}
                item={selectedCase}
                onAcceptCase={handleAcceptCase}
                onInitialActionHandled={() => setInitialAction(undefined)}
                onReply={handleReply}
                onCloseCase={handleCloseCase}
                onComposeAi={handleComposeAi}
                onRewriteAi={handleRewriteAi}
                onReopenCase={handleReopenCase}
                onRequestInfo={handleRequestInfo}
                onSaveAiFeedback={handleSaveAiFeedback}
                onRefreshSolution={handleRefreshSolution}
                onBackToInbox={handleBackToInbox}
              />
            </Tabs.Panel>
            <Tabs.Panel value="confidence">
              <ConfidenceReview
                error={confidenceError}
                isLoading={isLoadingConfidenceSuggestions}
                onReview={handleReviewSuggestion}
                onRetry={() => void loadDashboardData()}
                suggestions={confidenceSuggestionsState}
              />
            </Tabs.Panel>
            <Tabs.Panel value="analytics">
              <AnalyticsDashboard cases={cases} isLoadingCases={isLoadingCases} onDrillDown={handleAnalyticsDrillDown} onRangeChange={(range) => void loadAnalyticsSummary(range)} summary={analyticsSummary} />
            </Tabs.Panel>
            <Tabs.Panel value="automation">
              <AutomationSettings
                automationError={automationSettingsError}
                isLoadingSettings={isLoadingAutomationSettings}
                isLoadingLogs={isLoadingAutoAnswerLogs}
                logs={autoAnswerLogsState.items}
                logsPage={autoAnswerLogsState}
                onLoadLogs={loadAutoAnswerLogs}
                onOpenCase={handleOpenCaseById}
                onOpenCaseByNumber={handleOpenCaseByNumber}
                onRetrySettings={() => void loadDashboardData()}
                onUpdateSettings={handleUpdateAutomationSettings}
                settings={automationSettings}
                solutions={autoAnswerSolutionsState}
              />
            </Tabs.Panel>
          </Tabs>
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}



