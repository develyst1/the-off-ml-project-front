"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
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
  Collapse,
  Drawer,
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

const statusMeta: Record<CaseStatus, { label: string; color: string }> = {
  new: { label: "เคสใหม่", color: "gray" },
  analyzing: { label: "AI กำลังวิเคราะห์", color: "blue" },
  awaiting_tech: { label: "รอทีม Tech ตอบ", color: "yellow" },
  assigned: { label: "ทีม Tech Support รับเคสแล้ว", color: "blue" },
  tech_replied: { label: "ทีม Tech Support ตอบแล้ว", color: "blue" },
  analyzing_solution: { label: "AI กำลังวิเคราะห์คำตอบ", color: "blue" },
  awaiting_confirmation: { label: "รอยืนยัน AI แนะนำ", color: "blue" },
  awaiting_customer_info: { label: "รอลูกค้าให้ข้อมูล", color: "orange" },
  awaiting_tech_review: { label: "รอตรวจสอบข้อความก่อนส่ง", color: "yellow" },
  resolved: { label: "แก้ไขแล้ว", color: "green" },
  sent_to_customer: { label: "ส่งคำตอบให้ลูกค้าแล้ว", color: "green" },
  closed: { label: "ปิดเคสแล้ว", color: "green" },
  reopened: { label: "เปิดเคสกลับมาตรวจสอบ", color: "orange" },
  in_progress: { label: "กำลังดำเนินการ", color: "blue" },
  sent: { label: "ส่งข้อความแล้ว", color: "green" },
  sla_breach: { label: "เกิน SLA", color: "red" },
};

const fallbackStatusMeta = { label: "ไม่ทราบสถานะ", color: "gray" };

function getRootTab(value: string | null) {
  return OFF_ML_PROJECT_TABS.some((tab) => tab.value === value) ? value : "inbox";
}

const autoAnswerLogEventLabels: Record<string, string> = {
  CASE_ACKNOWLEDGEMENT: "รับเรื่อง",
  CUSTOMER_REPLY: "ตอบลูกค้า",
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
  onClick,
  value,
  color,
}: {
  active?: boolean;
  icon: IconName;
  isLoading?: boolean;
  label: string;
  onClick?: () => void;
  value: string;
  color: string;
}) {
  return (
    <Card
      aria-pressed={onClick ? active : undefined}
      className={`metricCard ${active ? "metricCardActive" : ""}`}
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
    url.searchParams.set("tab", "inbox");
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
          <Tooltip label="Confidence คือระดับความมั่นใจของ AI จากการวิเคราะห์ข้อความลูกค้า" multiline w={260}>
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
              placeholder="เลขเคส ชื่อลูกค้า หรือปัญหาที่แจ้ง"
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
                <Table.Th>ลูกค้า / เลขเคส</Table.Th>
                <Table.Th>ปัญหาที่แจ้ง</Table.Th>
                <Table.Th ta="center">หมวดหมู่</Table.Th>
                <Table.Th ta="center">
                  <Tooltip label="ระดับความมั่นใจของ AI จากการวิเคราะห์ข้อความลูกค้า">
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
                          {item.latestMessage.source === "CUSTOMER" ? "ลูกค้า" : item.latestMessage.source === "TECH_SUPPORT" ? "Tech Support" : item.latestMessage.source === "LINE_BOT" ? "LINE Bot" : "ระบบ"}
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

function CaseDetail({
  item,
  isLoading,
  initialAction,
  onInitialActionHandled,
  onAcceptCase,
  onReply,
  onCloseCase,
  onComposeAi,
  onRewriteAi,
  onReopenCase,
  onRequestInfo,
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
  onBackToInbox: () => void;
}) {
  const teamsAction = "ยังไม่มีการดำเนินการจากปุ่มในการ์ด Teams";
  const [actionState, setActionState] = useState<"idle" | "accepting" | "requesting" | "replying" | "closing" | "reopening" | "rewriting">("idle");
  const [actionError, setActionError] = useState<string>();
  const [actionNotice, setActionNotice] = useState<string>();
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
  const [aiMissingInformation, setAiMissingInformation] = useState<string[]>([]);
  const [closeConfirmationOpen, setCloseConfirmationOpen] = useState(false);
  const [closeWithoutTechWarningOpen, setCloseWithoutTechWarningOpen] = useState(false);
  const [closeWithoutTechConfirmation, setCloseWithoutTechConfirmation] = useState(false);
  const [closeMessageText, setCloseMessageText] = useState("");
  const [closeMessageManuallyEdited, setCloseMessageManuallyEdited] = useState(false);
  const [closeSummaryOverwriteOpen, setCloseSummaryOverwriteOpen] = useState(false);
  const [closeToastVisible, setCloseToastVisible] = useState(false);
  const [teamsThreadOpen, setTeamsThreadOpen] = useState(false);
  const [reopenConfirmationOpen, setReopenConfirmationOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState("ลูกค้ายังพบปัญหา");
  const [discardDraftConfirmationOpen, setDiscardDraftConfirmationOpen] = useState(false);
  const [replaceReplyDraftOpen, setReplaceReplyDraftOpen] = useState(false);
  const [replaceRequestDraftOpen, setReplaceRequestDraftOpen] = useState(false);
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
  const extractedTeamActions = item.teamActions ?? [];
  const extractedSolution = item.status === "awaiting_tech"
    ? "ยังไม่มีข้อมูล เนื่องจากทีมยังไม่ตอบ"
    : item.supportSolution === "NO_ACTIONABLE_SOLUTION"
      ? extractedTeamActions.length > 0
        ? "ไม่มีขั้นตอนเพิ่มเติมที่ต้องให้ลูกค้าดำเนินการเอง"
        : "ไม่พบแนวทางแก้ไขเพิ่มเติม"
      : item.supportSolution || "ยังไม่มีวิธีแก้ที่สกัดได้";
  const learningStatus = item.learningStatus;
  const hasSuggestedSolution = Boolean(item.supportSolution && item.supportSolution !== "NO_ACTIONABLE_SOLUTION");
  const hasLearningConfidence = Number.isFinite(learningStatus?.caseUnderstandingConfidence)
    && Number.isFinite(learningStatus?.caseDiscriminationConfidence);
  const hasLearningThresholds = Number.isFinite(learningStatus?.caseUnderstandingThreshold)
    && Number.isFinite(learningStatus?.caseDiscriminationThreshold);
  const understandingPassed = hasLearningConfidence && hasLearningThresholds
    && (learningStatus?.caseUnderstandingConfidence ?? 0) >= (learningStatus?.caseUnderstandingThreshold ?? Number.POSITIVE_INFINITY);
  const solutionSelectionPassed = hasLearningConfidence && hasLearningThresholds
    && (learningStatus?.caseDiscriminationConfidence ?? 0) >= (learningStatus?.caseDiscriminationThreshold ?? Number.POSITIVE_INFINITY);
  const autoAnswerEligible = learningStatus?.autoAnswerEligible
    ?? (hasLearningConfidence && hasLearningThresholds ? understandingPassed && solutionSelectionPassed : undefined);
  const learningEligibilityMeta = autoAnswerEligible === true
    ? { color: "green", text: "ผ่านเกณฑ์ Auto-answer แล้ว สามารถเปิดใช้ตอบอัตโนมัติได้เมื่อเปิดระบบ Auto-answer" }
    : autoAnswerEligible === false && hasLearningConfidence && hasLearningThresholds && !understandingPassed && !solutionSelectionPassed
      ? { color: "red", text: "ยังไม่ผ่านเกณฑ์ Auto-answer เนื่องจากความมั่นใจทั้งการเข้าใจเคสและการเลือกวิธีแก้ยังไม่ถึงเกณฑ์" }
      : autoAnswerEligible === false && hasLearningConfidence && hasLearningThresholds
        ? { color: "yellow", text: "ยังไม่ผ่านเกณฑ์ Auto-answer เนื่องจากความมั่นใจบางด้านยังไม่ถึงเกณฑ์" }
        : autoAnswerEligible === false
          ? { color: "yellow", text: "ยังไม่ผ่านเกณฑ์ Auto-answer ตามผลประเมินล่าสุด" }
          : { color: "blue", text: "ยังไม่มีข้อมูลความมั่นใจเพียงพอสำหรับประเมิน Auto-answer" };
  const teamLearningMeta = isClosed && item.closedWithoutTechConfirmation
    ? { color: "yellow", text: "ปิดเคสโดยไม่รอการยืนยันคำแนะนำจากทีม Tech" }
    : item.confidenceReviewStatus === "APPROVED"
    ? { color: "green", text: "ทีม Tech ยืนยันว่าคำแนะนำถูกต้อง" }
    : item.confidenceReviewStatus === "REJECTED"
      ? { color: "red", text: "ทีม Tech ระบุว่าคำแนะนำไม่ถูกต้อง" }
      : item.techRepliedAt
        ? { color: "blue", text: "ทีม Tech ตอบกลับแล้ว รอการยืนยันคำแนะนำ" }
        : { color: "yellow", text: "รอทีม Tech ตรวจสอบคำแนะนำ" };
  const confirmedTechSolution = item.confirmedTechSolutionText
    ? item.conversation.find((message) => message.senderType === "TECH" && message.originalText === item.confirmedTechSolutionText)
    : undefined;
  const hasConfirmedTechSolution = item.hasConfirmedTechSolution === true;
  const latestTechMessage = [...item.conversation]
    .filter((message) => message.senderType === "TECH" && message.messageType !== "CASE_CLOSED" && Boolean(message.originalText.trim()))
    .at(-1);
  const latestTechAttachmentUrl = latestTechMessage && typeof latestTechMessage.metadata?.attachmentUrl === "string"
    ? latestTechMessage.metadata.attachmentUrl
    : undefined;
  const caseClosedEvent = [...item.conversation].filter((message) => message.senderType === "SYSTEM" && message.messageType === "CASE_CLOSED").at(-1);
  type CaseProgressState = "completed" | "active" | "pending";
  type CaseProgressStep = {
    key: "received" | "ai_analyzed" | "teams_sent" | "line_acknowledged" | "waiting_tech" | "solution_sent" | "closed";
    title: string;
    description: string;
    occurredAt?: string;
    state: CaseProgressState;
  };
  const closedAt = item.closedAt ?? caseClosedEvent?.processedAt ?? caseClosedEvent?.createdAt;
  const solutionSentAt = item.resolutionSentAt ?? (isClosed ? closedAt : undefined);
  const completedProgress = {
    received: Boolean(item.caseCreatedAt),
    ai_analyzed: Boolean(item.aiAnalyzedAt),
    teams_sent: Boolean(item.teamsSentAt),
    line_acknowledged: Boolean(item.customerAcknowledgedAt),
    waiting_tech: Boolean(item.techRepliedAt),
    solution_sent: Boolean(solutionSentAt),
    closed: Boolean(isClosed && closedAt),
  };
  const activeProgressKey: CaseProgressStep["key"] | undefined = isClosed
    ? undefined
    : !completedProgress.received
      ? "received"
      : !completedProgress.ai_analyzed
        ? "ai_analyzed"
        : !completedProgress.teams_sent
          ? "teams_sent"
          : !completedProgress.line_acknowledged
            ? "line_acknowledged"
            : !completedProgress.waiting_tech
              ? "waiting_tech"
              : !completedProgress.solution_sent
                ? "solution_sent"
                : "closed";
  const caseProgressSteps: CaseProgressStep[] = [
    { key: "received", title: "รับเรื่อง", description: "รับเรื่องจาก LINE แล้ว", occurredAt: item.caseCreatedAt, state: completedProgress.received ? "completed" : activeProgressKey === "received" ? "active" : "pending" },
    { key: "ai_analyzed", title: "AI วิเคราะห์", description: "กำลังวิเคราะห์ข้อมูลเคส", occurredAt: item.aiAnalyzedAt, state: completedProgress.ai_analyzed ? "completed" : activeProgressKey === "ai_analyzed" ? "active" : "pending" },
    { key: "teams_sent", title: "ส่ง Teams", description: "กำลังส่งข้อมูลให้ทีม Tech", occurredAt: item.teamsSentAt, state: completedProgress.teams_sent ? "completed" : activeProgressKey === "teams_sent" ? "active" : "pending" },
    { key: "line_acknowledged", title: "ส่งข้อความรับเรื่องผ่าน LINE", description: "กำลังแจ้งรับเรื่องให้ผู้แจ้ง", occurredAt: item.customerAcknowledgedAt, state: completedProgress.line_acknowledged ? "completed" : activeProgressKey === "line_acknowledged" ? "active" : "pending" },
    { key: "waiting_tech", title: "รอคำตอบจากทีม Tech", description: "กำลังรอทีม Tech Support ตอบกลับ", occurredAt: item.techRepliedAt, state: completedProgress.waiting_tech ? "completed" : activeProgressKey === "waiting_tech" ? "active" : "pending" },
    { key: "solution_sent", title: "ส่งวิธีแก้ให้ผู้แจ้ง", description: completedProgress.waiting_tech ? "พร้อมส่งวิธีแก้ให้ผู้แจ้ง" : "รอวิธีแก้จากทีม Tech", occurredAt: solutionSentAt, state: completedProgress.solution_sent ? "completed" : activeProgressKey === "solution_sent" ? "active" : "pending" },
    { key: "closed", title: "ปิดเคส", description: "รอส่งวิธีแก้และสรุปผล", occurredAt: closedAt, state: completedProgress.closed ? "completed" : activeProgressKey === "closed" ? "active" : "pending" },
  ];
  const timelineStyle = {
    "--timeline-step-count": caseProgressSteps.length,
  } as CSSProperties;

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
      actionMode === "REQUEST_MORE_INFO" ? `ส่งคำขอข้อมูลเพิ่มเติมสำหรับเคส ${item.caseNumber} แล้ว` : `ส่งข้อความให้ลูกค้าสำหรับเคส ${item.caseNumber} แล้ว`,
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
    const message = closeCustomerMessage.trim();
    const completed = await runAction(
      "closing",
      "ปิดเคสและแจ้งลูกค้าทาง LINE แล้ว",
      () => onCloseCase(message, closeWithoutTechConfirmation, {
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
      setCloseWithoutTechConfirmation(false);
      setCloseValidationAttempted(false);
      setCloseTouchedFields({ cause: false, resolution: false, prevention: false, message: false });
      setActionMode("CUSTOMER_REPLY");
      setComposerTab("reply");
      setCloseToastVisible(true);
    }
  };

  const composeWithAi = async (draftOverride?: string, requireDraft = false) => {
    if (actionState !== "idle") return;
    const draftText = (draftOverride ?? (actionMode === "CUSTOMER_REPLY" ? customerReplyDraft : requestInfoDraft)).trim();
    if (requireDraft && !draftText) {
      setActionError("กรุณาพิมพ์ข้อความก่อนให้ AI ช่วยเรียบเรียง");
      return;
    }

    setActionState("rewriting");
    setActionError(undefined);
    setActionNotice(undefined);
    setAiMissingInformation([]);
    try {
      if (requireDraft) {
        const rewritten = await onRewriteAi(actionMode, draftText);
        if (!rewritten.rewrittenMessage.trim()) {
          throw new Error("AI ไม่สามารถเรียบเรียงข้อความได้ในขณะนี้");
        }
        if (actionMode === "REQUEST_MORE_INFO") setRequestInfoDraft(rewritten.rewrittenMessage);
        else setCustomerReplyDraft(rewritten.rewrittenMessage);
        setRequestInfoDraftMessageId(actionMode === "REQUEST_MORE_INFO" ? rewritten.rewrittenMessageId : undefined);
        setActionNotice(rewritten.usedFallback
          ? "AI ยังไม่พร้อม จึงคงข้อความเดิมไว้ กรุณาตรวจสอบก่อนส่ง"
          : "AI ขยายความจากข้อความที่พิมพ์แล้ว กรุณาตรวจสอบก่อนส่ง");
        return;
      }

      const draft = await onComposeAi(
        actionMode,
        actionMode === "CUSTOMER_REPLY" ? draftText || undefined : undefined,
        actionMode === "REQUEST_MORE_INFO" ? draftText || undefined : undefined,
      );
      if (!draft.suggestedMessage.trim()) {
        throw new Error("AI ไม่สามารถเรียบเรียงข้อความได้ในขณะนี้");
      }
      if (actionMode === "REQUEST_MORE_INFO") setRequestInfoDraft(draft.suggestedMessage);
      else setCustomerReplyDraft(draft.suggestedMessage);
      setRequestInfoDraftMessageId(actionMode === "REQUEST_MORE_INFO" ? draft.rewrittenMessageId : undefined);
      setAiMissingInformation(actionMode === "CUSTOMER_REPLY" ? draft.missingInformation : []);
      setActionNotice(actionMode === "CUSTOMER_REPLY"
        ? "AI วิเคราะห์บริบทและสร้างร่างคำตอบแล้ว กรุณาตรวจสอบก่อนส่ง"
        : "AI สร้างคำขอข้อมูลแล้ว กรุณาตรวจสอบก่อนส่ง");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "AI ไม่สามารถสร้างข้อความได้ในขณะนี้ คุณยังสามารถพิมพ์ข้อความและส่งด้วยตนเองได้");
    } finally {
      setActionState("idle");
    }
  };

  const selectComposerTab = (tab: "reply" | "request-info" | "close") => {
    setComposerTab(tab);
    setActionMode(tab === "request-info" ? "REQUEST_MORE_INFO" : "CUSTOMER_REPLY");
    if (tab === "close") {
      setCloseValidationAttempted(false);
      setCloseTouchedFields({ cause: false, resolution: false, prevention: false, message: false });
      setActionError(undefined);
    }
    if (tab !== "close") setCloseWithoutTechConfirmation(false);
    setRequestInfoDraftMessageId(undefined);
    setAiMissingInformation([]);
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
    if (!hasConfirmedTechSolution && !closeWithoutTechConfirmation) {
      setCloseWithoutTechWarningOpen(true);
      return;
    }
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
  const hasUnsentDraft = Boolean(customerReplyDraft.trim() || requestInfoDraft.trim() || closeCause.trim() || closeResolution.trim() || closePrevention.trim() || closeMessageText.trim());
  const resetComposerDrafts = () => {
    setCustomerReplyDraft("");
    setRequestInfoDraft("");
    setCloseCause("");
    setCloseResolution("");
    setClosePrevention("");
    setCloseMessageText("");
    setCloseMessageManuallyEdited(false);
    setCloseWithoutTechConfirmation(false);
    setCloseValidationAttempted(false);
    setCloseTouchedFields({ cause: false, resolution: false, prevention: false, message: false });
    setActionError(undefined);
    setActionNotice(undefined);
  };
  const requestDiscardDrafts = () => {
    if (hasUnsentDraft) {
      setDiscardDraftConfirmationOpen(true);
      return;
    }
    resetComposerDrafts();
  };
  const useLatestTechReplyAsDraft = () => {
    if (!latestTechMessage || latestTechMessage.messageType !== "TECH_SOLUTION") return;
    if (customerReplyDraft.trim()) {
      setReplaceReplyDraftOpen(true);
      return;
    }
    setComposerTab("reply");
    setActionMode("CUSTOMER_REPLY");
    setCustomerReplyDraft(latestTechMessage.originalText);
    setActionNotice("อ้างอิงคำตอบจากทีม Tech Support แล้ว กรุณาตรวจสอบก่อนส่ง");
  };
  const useLatestTechInfoRequestAsDraft = () => {
    if (!latestTechMessage || latestTechMessage.messageType !== "TECH_MORE_INFO_REQUEST") return;
    if (requestInfoDraft.trim()) {
      setReplaceRequestDraftOpen(true);
      return;
    }
    setComposerTab("request-info");
    setActionMode("REQUEST_MORE_INFO");
    setRequestInfoDraft(latestTechMessage.originalText);
    setActionNotice("อ้างอิงคำขอข้อมูลจากทีม Tech Support แล้ว กรุณาตรวจสอบก่อนส่ง");
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
    <Stack gap="sm" mt="sm">
      <Box>
        <Text fw={800}>สรุปเพื่อปิดเคส</Text>
        <Text c="dimmed" size="xs">กรอกข้อมูลให้ครบ แล้วตรวจสอบข้อความที่จะส่งให้ลูกค้าก่อนยืนยันปิดเคส</Text>
      </Box>
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
          variant="light"
        >
          สร้างข้อความสรุปด้วย AI
        </Button>
        {!closeSummaryComplete ? (
          <Text c="dimmed" mt={4} size="xs">กรอกสาเหตุ วิธีแก้ไข และวิธีป้องกันให้ครบก่อนสร้างข้อความสรุป</Text>
        ) : <Text c="dimmed" mt={4} size="xs">AI จะสร้างร่างข้อความจากข้อมูลที่กรอก คุณสามารถแก้ไขก่อนยืนยันปิดเคสได้</Text>}
      </Box>
      <Textarea
        autosize
        error={showCloseFieldError("message") && !closeCustomerMessage ? "กรุณาระบุข้อความสรุปที่จะส่งให้ลูกค้า" : undefined}
        label="ข้อความสรุปที่จะส่งให้ลูกค้าทาง LINE"
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
    </Stack>
  );

  const composerTabs = (
    <Group gap={6} wrap="wrap">
      <Button color="blue" onClick={() => selectComposerTab("reply")} size="xs" variant={composerTab === "reply" ? "filled" : "default"}>
        ตอบลูกค้า
      </Button>
      <Button color="yellow" onClick={() => selectComposerTab("request-info")} size="xs" variant={composerTab === "request-info" ? "filled" : "default"}>
        ขอข้อมูลเพิ่ม
      </Button>
      <Button color="red" onClick={() => selectComposerTab("close")} size="xs" variant={composerTab === "close" ? "filled" : "default"}>
        ปิดเคส
      </Button>
    </Group>
  );

  return (
    <Stack gap="lg">
      <Box className="caseDetailHeader">
        <Group justify="space-between" wrap="wrap">
          <Box>
            <Button mb="xs" onClick={onBackToInbox} size="xs" variant="subtle">
              ← กลับไปหน้า Case Inbox
            </Button>
            <Title order={2}>เคส {item.caseNumber}</Title>
            <Text c="dimmed" size="sm">ลูกค้า: {item.customerName}</Text>
            <Group className="caseDetailHeaderSummary" gap="sm" mt={6} wrap="wrap">
              <Badge color={currentStatusMeta.color} variant="light">{statusLabel}</Badge>
              <Text c="dimmed" size="xs">ทีม: {item.assignee || "ยังไม่มีผู้รับผิดชอบ"}</Text>
              <Text c="dimmed" size="xs">ข้อความล่าสุด: {formatEventTime(item.lastActivityAt)}</Text>
              {item.closedAt ? <Text c="dimmed" size="xs">ปิดเมื่อ: {formatEventTime(item.closedAt)}</Text> : null}
            </Group>
          </Box>
          <Group className="caseDetailHeaderBadges" gap="xs" wrap="wrap">
            {item.aiStatus !== "AI_FAILED" ? <Badge color={confidenceColor(item.aiConfidence)} variant="light">AI {item.aiConfidence}%</Badge> : null}
            {item.isSlaBreached ? <Badge color="red" variant="light">เกิน SLA</Badge> : null}
          </Group>
        </Group>
        {isClosed && item.closedAt && item.closedBy ? <Text c="dimmed" mt={4} size="xs">ปิดโดย {item.closedBy}</Text> : null}
      </Box>

      <Alert className="caseDetailStatusAlert" color="blue" icon={<AppIcon name="message" />} radius="md" variant="light">
        {item.teamsDeliveryStatus === "failed"
          ? `ส่งเคสเข้า Microsoft Teams ไม่สำเร็จ: ${item.teamsDeliveryError ?? "ไม่ทราบสาเหตุ"}`
          : item.status === "awaiting_tech"
            ? "ส่งเคสเข้า Microsoft Teams แล้ว ตอนนี้กำลังรอทีม Tech Support ตอบกลับ"
            : item.status === "tech_replied" || item.status === "analyzing_solution"
              ? "ได้รับคำตอบจากทีม Tech Support แล้ว ตอนนี้ AI กำลังวิเคราะห์วิธีแก้ปัญหา"
              : item.status === "resolved"
                ? "AI วิเคราะห์คำตอบเสร็จแล้ว กำลังส่งคำตอบกลับลูกค้าทาง LINE"
                : item.status === "sent_to_customer" || item.status === "closed"
                  ? "ส่งคำตอบกลับลูกค้าทาง LINE แล้ว"
                  : teamsMeta.label}
      </Alert>

      <SimpleGrid cols={{ base: 1, lg: 2 }}>
        <Card padding="lg" radius="md" withBorder>
          <Title mb="sm" order={3}>
            ข้อมูลลูกค้าและปัญหาที่แจ้ง
          </Title>
          <Paper bg="gray.0" p="md" radius="md">
            {item.originalText ? (
              <Text className="compactText">{item.originalText}</Text>
            ) : (
              <Alert color="red" title="ไม่พบข้อความต้นฉบับของลูกค้า">
                กรุณาตรวจสอบข้อมูล LINE webhook
              </Alert>
            )}
          </Paper>
          <Stack gap={4} mt="sm">
            <Text c="dimmed" size="xs">ส่งจาก LINE: {formatEventTime(item.customerSentAt)}</Text>
            <Text c="dimmed" size="xs">ระบบรับข้อความ: {formatEventTime(item.systemReceivedAt)}</Text>
          </Stack>
        </Card>

        <Card padding="lg" radius="md" withBorder>
          <Title mb="sm" order={3}>
            ผลวิเคราะห์โดย AI
          </Title>
          <SimpleGrid cols={{ base: 1, sm: 2 }} mb="md">
            <Box>
              <Text c="dimmed" fw={700} size="sm">
                หมวดหมู่
              </Text>
              <Badge color="blue" mt={6} variant="light">
                {item.category}
              </Badge>
            </Box>
            <Box>
              <Text c="dimmed" fw={700} size="sm">
                ความมั่นใจของ AI
              </Text>
              {item.aiStatus === "AI_FAILED" ? (
                <Badge color="red" mt={6} variant="light">วิเคราะห์ไม่สำเร็จ</Badge>
              ) : (
                <Badge color={confidenceColor(item.aiConfidence)} mt={6} variant="light">
                  {item.aiConfidence}%
                </Badge>
              )}
            </Box>
          </SimpleGrid>
          <Text c="dimmed" fw={700} size="sm">
            สรุปผลวิเคราะห์
          </Text>
          <Text className="compactText" mt={6}>
            {item.summary}
          </Text>
          <Text c="dimmed" fw={700} mt="sm" size="sm">วิธีแก้ที่สกัดได้</Text>
          <Text className="compactText" lineClamp={3} mt={4} size="sm">{extractedSolution}</Text>
          <Text c="dimmed" mt="sm" size="xs">
            ผลวิเคราะห์นี้เป็นการประเมินเบื้องต้นจาก AI ยังไม่ใช่การยืนยันสาเหตุที่แน่นอน
          </Text>
          <Text c="dimmed" mt="sm" size="xs">วิเคราะห์เสร็จเมื่อ: {formatEventTime(item.aiAnalyzedAt)}</Text>
        </Card>
      </SimpleGrid>

      <Box className="caseDetailSections">
        <Box className="caseTimelineSection">
        <Card className="caseTimelineCard" padding="lg" radius="md" withBorder>
          <Title order={3} mb="md">ลำดับของเคส</Title>
          <Box className="caseTimelineScroll">
          <Box className="caseTimelineContent">
          <Box className="caseTimelineSteps" style={timelineStyle}>
            {caseProgressSteps.map((step, index, steps) => {
              const isDone = step.state === "completed";
              const isActive = step.state === "active";
              return (
                <Box className={`caseTimelineStep caseTimelineStep--${step.state}`} key={step.key}>
                  {index < steps.length - 1 ? <Box className={`caseTimelineConnector caseTimelineConnector--${steps[index + 1].state}`} /> : null}
                  <Box className="caseTimelineStepMarker">
                    <ThemeIcon color={isDone ? "green" : isActive ? "blue" : "gray"} radius="xl" size={30} variant={isDone || isActive ? "filled" : "outline"}>
                      {isDone ? <AppIcon name="check" size={15} /> : isActive ? <AppIcon name="message" size={14} /> : null}
                    </ThemeIcon>
                  </Box>
                  <Text c={isActive ? "blue.7" : step.state === "pending" ? "gray.6" : undefined} fw={isActive ? 800 : 600} size="sm">{step.title}</Text>
                  <Text c={isActive ? "blue.7" : step.state === "pending" ? "gray.5" : "dimmed"} fw={isActive ? 700 : undefined} size="xs">
                    {isDone && step.occurredAt ? formatEventTime(step.occurredAt) : step.description}
                  </Text>
                </Box>
              );
            })}
          </Box>
          </Box>
          </Box>
        </Card>
        </Box>

        <Box className="caseDetailBottomGrid">
        <Box className="caseConversationColumn">
          <CaseConversation item={item} />
        </Box>
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
                  ทีม Tech Support สามารถตอบกลับจาก Microsoft Teams หรือจากหน้าเว็บ ระบบจะนำคำตอบจากทีมไปวิเคราะห์และใช้สร้างร่างข้อความตอบลูกค้าต่อไป
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
                          ลูกค้า
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
                    ข้อความลูกค้า: {item.originalText}
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
                    {item.status === "awaiting_customer_info" ? "รอลูกค้าส่งข้อมูลเพิ่มเติม" : WAITING_TECH_STATUS}
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

      <Card className="caseOperationPanel caseDetailInsightStack" padding="md" radius="md" withBorder>
        <Stack gap="md">
          <Group gap="sm">
            <ThemeIcon color="blue" radius="xl" variant="light">
              <AppIcon name="message" />
            </ThemeIcon>
            <Text fw={800}>การดำเนินงานของเคส</Text>
          </Group>

          <Box className="caseOperationPanelSection">
            <Group gap="sm">
              <ThemeIcon color={currentStatusMeta.color} radius="xl" variant="light">
                <AppIcon name="check" />
              </ThemeIcon>
              <Text c="dimmed" fw={700} size="sm">สถานะปัจจุบัน</Text>
            </Group>
            <Group gap="sm" mt="sm" wrap="wrap">
              <Badge color={currentStatusMeta.color} variant="light">{statusLabel}</Badge>
              <Text c="dimmed" size="xs">
                {isClosed && item.closedAt
                  ? `ปิดเคสเมื่อ ${formatEventTime(item.closedAt)}`
                  : item.resolutionSentAt
                    ? `ส่งวิธีแก้ให้ลูกค้าแล้วเมื่อ ${formatEventTime(item.resolutionSentAt)}`
                    : "ยังมีขั้นตอนที่ทีมสามารถดำเนินการต่อได้"}
              </Text>
            </Group>
          </Box>

          <Box className="caseOperationPanelSection">
            <Group gap="sm">
              <ThemeIcon color="violet" radius="xl" variant="light">
                <AppIcon name="brain" />
              </ThemeIcon>
              <Text c="dimmed" fw={700} size="sm">สถานะการเรียนรู้ของ AI</Text>
            </Group>
            <Stack gap="xs" mt="sm">
              <Group justify="space-between" wrap="nowrap">
                <Text size="sm">AI แนะนำวิธีแก้</Text>
                <Badge color={hasSuggestedSolution ? "green" : "gray"} variant="light">
                  {hasSuggestedSolution ? "มีคำแนะนำแล้ว" : "ยังไม่มีคำแนะนำ"}
                </Badge>
              </Group>

              <Paper bg="blue.0" p="sm" radius="md">
                <Text fw={700} size="sm">คำตอบล่าสุดจากทีม Tech</Text>
                {latestTechMessage ? <>
                  <Text c="dimmed" mt={4} size="xs">
                    ทีม Tech Support · {formatEventTime(latestTechMessage.sentAt ?? latestTechMessage.createdAt)}
                  </Text>
                  <Text className="compactText" mt="xs" size="sm">{latestTechMessage.originalText}</Text>
                  {latestTechMessage.messageType === "TECH_SOLUTION" ? <Button mt="sm" onClick={useLatestTechReplyAsDraft} size="xs" variant="light">ใช้เป็นร่างตอบลูกค้า</Button> : null}
                  {latestTechMessage.messageType === "TECH_MORE_INFO_REQUEST" ? <Button mt="sm" onClick={useLatestTechInfoRequestAsDraft} size="xs" variant="light">ใช้เป็นร่างขอข้อมูลเพิ่ม</Button> : null}
                  {latestTechMessage.messageType === "TECH_ATTACHMENT" ? latestTechAttachmentUrl ? <Button component="a" href={latestTechAttachmentUrl} mt="sm" rel="noreferrer" size="xs" target="_blank" variant="light">ดูไฟล์แนบ</Button> : <Text c="dimmed" mt="sm" size="xs">ไฟล์แนบหรือภาพหน้าจอ ไม่ถูกนำไปใช้เป็นร่างข้อความลูกค้า</Text> : null}
                </> : <Text c="dimmed" mt={4} size="sm">ยังไม่มีคำตอบจากทีม Tech Support</Text>}
              </Paper>
              <Group justify="space-between" wrap="nowrap">
                <Text size="sm">ผลการตรวจของทีม Tech</Text>
                <Badge color={teamLearningMeta.color} variant="light">{teamLearningMeta.text}</Badge>
              </Group>
              <Group justify="space-between" wrap="nowrap">
                <Text size="sm">การส่งคำตอบทาง LINE</Text>
                <Badge color={item.resolutionSentAt ? "green" : "yellow"} variant="light">
                  {item.resolutionSentAt ? "ส่งวิธีแก้แล้ว" : "รอส่งวิธีแก้"}
                </Badge>
              </Group>
            </Stack>
            {hasLearningConfidence ? (
              <SimpleGrid cols={2} mt="sm">
                <Box>
                  <Text c="dimmed" size="xs">ความมั่นใจในการเข้าใจเคส</Text>
                  <Text fw={800} size="lg">{learningStatus?.caseUnderstandingConfidence}%</Text>
                </Box>
                <Box>
                  <Text c="dimmed" size="xs">ความมั่นใจในการเลือกวิธีแก้</Text>
                  <Text fw={800} size="lg">{learningStatus?.caseDiscriminationConfidence}%</Text>
                </Box>
              </SimpleGrid>
            ) : (
              <Text c="dimmed" mt="sm" size="sm">ยังไม่มีข้อมูลการเรียนรู้เพียงพอสำหรับ Solution นี้</Text>
            )}
            <Alert color={learningEligibilityMeta.color} mt="sm" p="sm" variant="light">
              <Text size="sm">{learningEligibilityMeta.text}</Text>
            </Alert>
            {Number.isFinite(learningStatus?.solutionUsageCount) || Number.isFinite(learningStatus?.confirmedCount) || Number.isFinite(learningStatus?.additionalConfirmationsNeeded) ? (
              <Text c="dimmed" mt="sm" size="xs">
                {Number.isFinite(learningStatus?.solutionUsageCount) ? `Solution นี้ถูกใช้แล้ว ${learningStatus?.solutionUsageCount} ครั้ง` : null}
                {Number.isFinite(learningStatus?.solutionUsageCount) && Number.isFinite(learningStatus?.confirmedCount) ? " · " : null}
                {Number.isFinite(learningStatus?.confirmedCount) ? `ทีมยืนยันแล้ว ${learningStatus?.confirmedCount} ครั้ง` : null}
                {Number.isFinite(learningStatus?.additionalConfirmationsNeeded) ? ` · ต้องการการยืนยันเพิ่มอีก ${learningStatus?.additionalConfirmationsNeeded} ครั้ง` : null}
              </Text>
            ) : null}
          </Box>

        <Box className="caseOperationPanelSection">
          <Group gap="sm">
            <ThemeIcon color="blue" radius="xl" variant="light"><AppIcon name="brain" /></ThemeIcon>
            <Text c="dimmed" fw={700} size="sm">คำแนะนำจาก Solution ที่มีอยู่</Text>
          </Group>
          <Text className="compactText" mt="sm" size="sm">
            {hasSuggestedSolution ? extractedSolution : "ยังไม่มี Solution ที่ตรงกับเคสนี้"}
          </Text>
          {hasSuggestedSolution ? <Text c="dimmed" mt={4} size="xs">Confidence: {item.aiConfidence}% · ใช้ข้อมูล Solution แยกจากสรุปการปิดเคส</Text> : null}
        </Box>

        {item.closeSummary ? (
          <Box className="caseOperationPanelSection">
            <Group gap="sm">
              <ThemeIcon color="orange" radius="xl" variant="light"><AppIcon name="check" /></ThemeIcon>
              <Text c="dimmed" fw={700} size="sm">สรุปจากการปิดเคส</Text>
            </Group>
            <Stack gap={4} mt="sm">
              <Text size="sm"><b>สาเหตุ:</b> {item.closeSummary.cause}</Text>
              <Text size="sm"><b>วิธีแก้:</b> {item.closeSummary.resolution}</Text>
              <Text size="sm"><b>วิธีป้องกัน:</b> {item.closeSummary.prevention}</Text>
            </Stack>
          </Box>
        ) : null}

        {isClosed ? (
          <Box className="caseClosedComposer caseOperationPanelSection">
            <Group gap="sm">
              <ThemeIcon color="green" radius="xl" variant="light">
                <AppIcon name="check" />
              </ThemeIcon>
              <Box>
                <Text fw={800}>ข้อความที่จะส่งให้ลูกค้า</Text>
                <Badge color="green" mt={4} variant="light">ปิดเคสแล้ว</Badge>
              </Box>
            </Group>
            <Text mt="sm" size="sm">{item.hasCustomerConfirmation ? "ลูกค้ายืนยันว่าใช้งานได้แล้ว" : "ส่งข้อความสรุปและปิดเคสให้ลูกค้าแล้ว"}</Text>
            <Text c="dimmed" mt={4} size="xs">ปิดเคสเมื่อ {formatEventTime(item.closedAt)}{item.closedBy ? ` · โดย ${item.closedBy}` : ""}</Text>
            {item.customerOutcome?.text ? <Text c="dimmed" mt={4} size="xs">รายละเอียด: {item.customerOutcome.text}</Text> : null}
            <Button
              disabled={isActionRunning}
              loading={actionState === "reopening"}
              mt="md"
              onClick={() => setReopenConfirmationOpen(true)}
              size="xs"
              variant="outline"
            >
              เปิดเคสอีกครั้ง
            </Button>
          </Box>
        ) : (
        <Box className="caseActionComposerCard caseOperationPanelSection">
          <Box mt="sm">{composerTabs}</Box>
          {composerTab === "close" ? closeCaseSummaryForm : <>
            <Box mt="sm">
              <Text fw={800}>{composerTab === "reply" ? "ตอบกลับทาง LINE" : "ขอข้อมูลเพิ่มเติมจากลูกค้าทาง LINE"}</Text>
              <Text c="dimmed" size="xs">
                {composerTab === "reply"
                  ? "ตรวจสอบข้อความก่อนส่งผ่าน LINE ทุกครั้ง"
                  : "ระบุข้อมูลที่ต้องการ เพื่อให้ทีม Tech Support ตรวจสอบปัญหาได้ครบถ้วน"}
              </Text>
            </Box>
            {composerTab === "reply" && hasConfirmedTechSolution ? (
              <Paper bg="blue.0" mt="sm" p="sm" radius="sm">
                <Text c="dimmed" size="xs">อ้างอิงคำตอบจากทีม Tech Support</Text>
                <Text lineClamp={2} mt={4} size="sm">{confirmedTechSolution?.originalText ?? item.confirmedTechSolutionText}</Text>
                {confirmedTechSolution ? <Text c="dimmed" mt={4} size="xs">ทีม Tech Support · {formatEventTime(confirmedTechSolution.sentAt ?? confirmedTechSolution.createdAt)}</Text> : null}
              </Paper>
            ) : null}
            {composerTab === "reply" && !hasConfirmedTechSolution ? (
              <Text c="dimmed" mt="sm" size="xs">ยังไม่มีวิธีแก้จากทีม Tech ที่พร้อมใช้สร้างร่างตอบลูกค้า</Text>
            ) : null}
            <Box pos="relative" mt="sm">
              <Textarea
                autosize
                label={composerTab === "reply" ? "ข้อความที่จะส่งถึงลูกค้า" : "ข้อมูลที่ต้องการจากลูกค้า"}
                minRows={1}
                onChange={(event) => composerTab === "request-info" ? setRequestInfoDraft(event.currentTarget.value) : setCustomerReplyDraft(event.currentTarget.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder={composerTab === "reply"
                  ? "พิมพ์ข้อความตอบกลับลูกค้า หรือสร้างร่างจากข้อมูลเคส"
                  : "เช่น กรุณาส่งภาพหน้าจอ ข้อความ Error รุ่นอุปกรณ์ หรือเวลาที่พบปัญหาเพิ่มเติม"}
                styles={{ input: { paddingRight: composerTab === "reply" ? 56 : undefined } }}
                value={composerTab === "request-info" ? requestInfoDraft : customerReplyDraft}
              />
              {composerTab === "reply" ? (
                <Tooltip label="ช่วยเรียบเรียงข้อความที่พิมพ์" withArrow>
                  <ActionIcon
                    aria-label="ช่วยเรียบเรียงข้อความที่พิมพ์ด้วย AI"
                    color="blue"
                    disabled={!customerReplyDraft.trim() || isActionRunning}
                    loading={actionState === "rewriting"}
                    onClick={() => void composeWithAi(customerReplyDraft, true)}
                    pos="absolute"
                    right={12}
                    size="md"
                    top={28}
                    variant="light"
                    radius="xl"
                  >
                    <AppIcon name="brain" size={17} />
                  </ActionIcon>
                </Tooltip>
              ) : null}
            </Box>
          </>}
          <Group className="caseActionComposerButtons" gap="xs" mt="sm" wrap="wrap">
            {composerTab !== "close" ? (
              <Button disabled={isActionRunning} leftSection={<AppIcon name="brain" size={15} />} loading={actionState === "rewriting"} onClick={() => void composeWithAi(composerTab === "request-info" ? requestInfoDraft : undefined)} size="xs" variant="light">
                {composerTab === "request-info" ? "ให้ AI แนะนำคำถามที่ควรถาม" : "สร้างร่างจากข้อมูลเคส"}
              </Button>
            ) : null}
            <Button disabled={isActionRunning} onClick={requestDiscardDrafts} size="xs" variant="default">ยกเลิก</Button>
            <Button
              color={composerTab === "close" ? "orange" : undefined}
              disabled={composerTab === "close" ? !closeSummaryComplete || !closeCustomerMessage || isActionRunning : !(composerTab === "request-info" ? requestInfoDraft : customerReplyDraft).trim() || isActionRunning || isClosed}
              loading={composerTab === "close" ? actionState === "closing" : actionState === "replying" || actionState === "requesting"}
              onClick={() => composerTab === "close" ? openCloseConfirmation() : void submitReply()}
              size="xs"
            >
              {composerTab === "close" ? "ยืนยันปิดเคส" : composerTab === "request-info" ? "ส่งคำขอข้อมูลเพิ่ม" : "ส่งข้อความ"}
            </Button>
          </Group>
          <Text c="dimmed" mt="xs" size="xs">
            {composerTab === "close"
              ? "Enter เพื่อไปขั้นตอนยืนยัน · Shift + Enter เพื่อขึ้นบรรทัดใหม่"
              : "Enter เพื่อส่ง · Shift + Enter เพื่อขึ้นบรรทัดใหม่"}
          </Text>
          {composerTab !== "close" && !(composerTab === "request-info" ? requestInfoDraft : customerReplyDraft).trim() ? <Text c="dimmed" mt={4} size="xs">กรอกข้อความก่อนส่ง</Text> : null}
          {composerTab !== "close" && actionMode === "CUSTOMER_REPLY" && aiMissingInformation.length > 0 ? (
            <Alert color="yellow" mt="sm" title="ข้อมูลยังไม่เพียงพอสำหรับร่างคำตอบ">
              <Text size="sm">ข้อมูลที่ยังขาด: {aiMissingInformation.join(", ")}</Text>
            </Alert>
          ) : null}
          {actionError ? <Alert color="red" mt="sm" title="ดำเนินการไม่สำเร็จ">{actionError}</Alert> : null}
          {actionNotice ? <Alert color="green" mt="sm">{actionNotice}</Alert> : null}
        </Box>
        )}

        {/* <Box className="caseOperationPanelSection">
          <Group gap="sm">
            <ThemeIcon color="blue" radius="xl" variant="light">
              <AppIcon name="brain" />
            </ThemeIcon>
            <Text c="dimmed" fw={700} size="sm">วิธี AI สกัดได้</Text>
          </Group>
          <Paper bg="blue.0" mt="sm" p="md" radius="sm">
            <Text className="compactText" size="sm">
              {extractedSolution}
            </Text>
          </Paper>
        </Box>

        <Box className="caseOperationPanelSection">
          <Group gap="sm">
            <ThemeIcon color="orange" radius="xl" variant="light">
              <AppIcon name="settings" />
            </ThemeIcon>
            <Text c="dimmed" fw={700} size="sm">ทีม Tech ดำเนินการ</Text>
          </Group>
          <Paper bg={isClosed && extractedTeamActions.length === 0 ? "gray.1" : "orange.0"} mt="sm" p="md" radius="sm">
            {extractedTeamActions.length > 0 ? (
              <Stack gap={6}>
                {extractedTeamActions.map((action) => (
                  <Text className="compactText" key={action} size="sm">• {action}</Text>
                ))}
              </Stack>
            ) : (
              <Text className="compactText" size="sm">
                {isClosed
                  ? "ปิดเคสจากการยืนยันของลูกค้า — ยังไม่ได้รับการดำเนินการจากทีม Tech"
                  : "ยังไม่มีการดำเนินการจากทีม Tech ที่สกัดได้"}
              </Text>
            )}
          </Paper>
        </Box>

        <Box className="caseOperationPanelSection">
            <Group gap="sm">
              <ThemeIcon color="green" radius="xl" variant="light">
                <AppIcon name="check" />
              </ThemeIcon>
              <Text c="dimmed" fw={700} size="sm">ผลการตรวจสอบจากลูกค้า</Text>
            </Group>
            {item.customerOutcome ? (
              <>
                <Paper bg="green.0" mt="sm" p="md" radius="sm">
                  <Text className="compactText" size="sm">{item.customerOutcome.text}</Text>
                </Paper>
                <Text c="dimmed" mt="xs" size="xs">
                  {item.customerOutcome.type === "RESOLVED" ? "ลูกค้ายืนยันว่าใช้งานได้แล้ว" : "ลูกค้าแจ้งว่าอาการดีขึ้น"}
                  {item.customerOutcome.confirmedAt ? ` · ${formatEventTime(item.customerOutcome.confirmedAt)}` : ""}
                </Text>
              </>
            ) : <Text c="dimmed" mt="xs" size="sm">ยังไม่มีผลการตรวจสอบจากลูกค้า</Text>}
          </Box>

        <Box className="caseOperationPanelSection">
          <Group gap="sm">
            <ThemeIcon color="green" radius="xl" variant="light">
              <AppIcon name="message" />
            </ThemeIcon>
            <Text c="dimmed" fw={700} size="sm">ข้อความล่าสุดที่ส่งทาง LINE</Text>
          </Group>
          <Paper bg="green.0" mt="sm" p="sm" radius="sm">
            <Text className="compactText" lineClamp={latestLineReplyExpanded ? undefined : 3} size="sm">
              {latestLineReply?.displayText || latestLineReply?.originalText || item.customerReply || "ยังไม่มีข้อความที่ส่งกลับลูกค้า"}
            </Text>
          </Paper>
          {(latestLineReply?.displayText || latestLineReply?.originalText || item.customerReply || "").length > 180 ? (
            <Button onClick={() => setLatestLineReplyExpanded((current) => !current)} px={0} size="compact-xs" variant="subtle">
              {latestLineReplyExpanded ? "ย่อข้อความ" : "ดูข้อความเต็ม"}
            </Button>
          ) : null}
          {latestLineReply ? <Text c="dimmed" mt="xs" size="xs">ส่งเมื่อ: {formatEventTime(latestLineReply.sentAt || latestLineReply.createdAt)}</Text> : null}
        </Box> */}
        </Stack>
      </Card>
      </Box>
      </Box>
      <Modal
        opened={discardDraftConfirmationOpen}
        onClose={() => setDiscardDraftConfirmationOpen(false)}
        title="ยกเลิกข้อความที่ยังไม่ได้ส่ง"
      >
        <Text>มีข้อความที่ยังไม่ได้ส่ง ต้องการล้างข้อความและเริ่มใหม่ใช่ไหม?</Text>
        <Group justify="flex-end" mt="md">
          <Button onClick={() => setDiscardDraftConfirmationOpen(false)} variant="default">กลับไปแก้ไข</Button>
          <Button color="red" onClick={() => { resetComposerDrafts(); setDiscardDraftConfirmationOpen(false); }} variant="light">ล้างข้อความ</Button>
        </Group>
      </Modal>
      <Modal opened={replaceReplyDraftOpen} onClose={() => setReplaceReplyDraftOpen(false)} title="แทนที่ร่างข้อความเดิม">
        <Text>มีร่างข้อความตอบลูกค้าที่ยังไม่ได้ส่ง ต้องการใช้คำตอบล่าสุดจากทีม Tech มาแทนที่ใช่ไหม?</Text>
        <Group justify="flex-end" mt="md">
          <Button onClick={() => setReplaceReplyDraftOpen(false)} variant="default">กลับไปแก้ไข</Button>
          <Button onClick={() => { setReplaceReplyDraftOpen(false); setComposerTab("reply"); setActionMode("CUSTOMER_REPLY"); setCustomerReplyDraft(latestTechMessage?.originalText ?? ""); setActionNotice("อ้างอิงคำตอบจากทีม Tech Support แล้ว กรุณาตรวจสอบก่อนส่ง"); }}>ใช้ร่างจากทีม Tech</Button>
        </Group>
      </Modal>
      <Modal opened={replaceRequestDraftOpen} onClose={() => setReplaceRequestDraftOpen(false)} title="แทนที่ร่างขอข้อมูลเพิ่มเดิม">
        <Text>มีร่างขอข้อมูลเพิ่มที่ยังไม่ได้ส่ง ต้องการใช้ข้อความล่าสุดจากทีม Tech มาแทนที่ใช่ไหม?</Text>
        <Group justify="flex-end" mt="md">
          <Button onClick={() => setReplaceRequestDraftOpen(false)} variant="default">กลับไปแก้ไข</Button>
          <Button onClick={() => { setReplaceRequestDraftOpen(false); setComposerTab("request-info"); setActionMode("REQUEST_MORE_INFO"); setRequestInfoDraft(latestTechMessage?.originalText ?? ""); setActionNotice("อ้างอิงคำขอข้อมูลจากทีม Tech Support แล้ว กรุณาตรวจสอบก่อนส่ง"); }}>ใช้ร่างจากทีม Tech</Button>
        </Group>
      </Modal>
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
        opened={closeWithoutTechWarningOpen}
        onClose={() => setCloseWithoutTechWarningOpen(false)}
        title="ยังไม่มีวิธีแก้ที่ยืนยันจากทีม Tech Support"
      >
        <Text>เคสนี้ยังไม่มีวิธีแก้ที่ทีม Tech Support ยืนยัน คุณต้องการปิดเคสต่อหรือไม่?</Text>
        <Group justify="flex-end" mt="md">
          <Button onClick={() => setCloseWithoutTechWarningOpen(false)} variant="default">กลับไปตรวจสอบ</Button>
          <Button
            color="orange"
            onClick={() => {
              setCloseWithoutTechConfirmation(true);
              setCloseWithoutTechWarningOpen(false);
              setCloseConfirmationOpen(true);
            }}
          >
            ยืนยันปิดเคสต่อ
          </Button>
        </Group>
      </Modal>
      <Modal
        opened={closeConfirmationOpen}
        onClose={() => actionState === "idle" && setCloseConfirmationOpen(false)}
        title="ยืนยันการปิดเคส"
      >
        <Text>
          ต้องการปิดเคส {item.caseNumber} ใช่ไหม?
        </Text>
        <Text c="dimmed" mt="xs" size="sm">
          เรื่อง: {item.summary}
        </Text>
        <Text c="dimmed" mt="xs" size="sm">
          หลังปิดเคส ลูกค้าจะได้รับข้อความแจ้งว่าเคสนี้ปิดแล้ว
        </Text>
        <Paper bg="gray.0" mt="md" p="sm" radius="sm" withBorder>
          <Text c="dimmed" size="xs">ข้อความสรุปที่จะส่งให้ลูกค้า</Text>
          <Text mt={4} style={{ whiteSpace: "pre-wrap" }}>{closeCustomerMessage}</Text>
        </Paper>
        {actionError ? <Alert color="red" mt="md" title="ดำเนินการไม่สำเร็จ">{actionError}</Alert> : null}
        <Group justify="flex-end" mt="md">
          <Button disabled={actionState !== "idle"} onClick={() => setCloseConfirmationOpen(false)} variant="default">
            ยกเลิก
          </Button>
          <Button color="orange" disabled={actionState !== "idle"} loading={actionState === "closing"} onClick={() => void submitCloseCase()}>
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
          data={["ลูกค้ายังพบปัญหา", "ปิดเคสผิด", "มีข้อมูลใหม่", "อื่น ๆ"]}
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
      {closeToastVisible ? <Box className="caseConversationCopyToast" role="status">ปิดเคสและแจ้งลูกค้าทาง LINE แล้ว</Box> : null}
    </Stack>
  );
}

function ConfidenceReview({
  isLoading,
  onReview,
  suggestions,
}: {
  isLoading: boolean;
  onReview: (item: ConfidenceSuggestion, result: "approved" | "rejected", feedback?: { reason: "CASE_UNDERSTANDING" | "SOLUTION_SELECTION" | "INSUFFICIENT_CUSTOMER_INFO" | "BETTER_SOLUTION"; explanation: string; correctedSolution: string }) => Promise<void>;
  suggestions: ConfidenceSuggestion[];
}) {
  const [reviewedSuggestions, setReviewedSuggestions] = useState<Record<string, "approved" | "rejected">>({});
  const [rejectedSuggestion, setRejectedSuggestion] = useState<ConfidenceSuggestion | null>(null);
  const [rejectionReason, setRejectionReason] = useState<"CASE_UNDERSTANDING" | "SOLUTION_SELECTION" | "INSUFFICIENT_CUSTOMER_INFO" | "BETTER_SOLUTION" | null>(null);
  const [rejectionExplanation, setRejectionExplanation] = useState("");
  const [correctedSolution, setCorrectedSolution] = useState("");

  const reviewSuggestion = async (item: ConfidenceSuggestion, result: "approved" | "rejected") => {
    await onReview(item, result);
    setReviewedSuggestions((current) => ({ ...current, [item.id]: result }));
  };

  const submitRejection = async () => {
    if (!rejectedSuggestion || !rejectionReason) return;
    await onReview(rejectedSuggestion, "rejected", { reason: rejectionReason, explanation: rejectionExplanation, correctedSolution });
    setReviewedSuggestions((current) => ({ ...current, [rejectedSuggestion.id]: "rejected" }));
    setRejectedSuggestion(null);
    setRejectionReason(null);
    setRejectionExplanation("");
    setCorrectedSolution("");
  };

  return (
    <Stack gap="lg">
      <Alert color="blue" icon={<AppIcon name="brain" />} radius="md" variant="light">
        ทีม Tech Support ใช้หน้านี้ตอบว่าเคสที่ AI แนะนำตรงกับ solution เดิมหรือไม่
        เพื่อเพิ่ม/ลดความมั่นใจในการเข้าใจเคสและการแยกแยะเคส
      </Alert>
      {!isLoading && suggestions.length === 0 ? (
        <Card padding="lg" radius="md" withBorder>
          <Title order={3}>ยังไม่มีรายการให้ยืนยันจาก backend</Title>
          <Text c="dimmed" mt="xs">
            เมื่อ backend พบเคสที่ต้องยืนยัน solution รายการจะแสดงที่นี่
          </Text>
        </Card>
      ) : null}
      {suggestions.map((item) => (
        <Card key={item.id} padding="lg" radius="md" withBorder>
          <Group align="flex-start" justify="space-between">
            <Box>
              <Title order={3}>{item.caseNumber} · {item.customerName}</Title>
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
          <SimpleGrid cols={{ base: 1, md: 2 }} mt="md">
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
          <Text c={item.reviewStage === "AUTO_ANSWER" ? "green.7" : "dimmed"} mt="md" size="sm">
            {item.reviewHint}
          </Text>
          <Text c="dimmed" mt="xs" size="xs">
            การยืนยันของทีมจะช่วยปรับความมั่นใจของ AI สำหรับการเข้าใจเคสและการเลือกวิธีแก้ในอนาคต
          </Text>
          <Group justify="flex-end" mt="md">
            <Button color="red" onClick={() => setRejectedSuggestion(item)} variant="light">
              {item.reviewStage === "AUTO_ANSWER" ? "ไม่อนุมัติ" : "ไม่ถูกต้อง"}
            </Button>
            <Button onClick={() => void reviewSuggestion(item, "approved")}>
              {item.reviewStage === "AUTO_ANSWER" ? "อนุมัติให้ตอบอัตโนมัติ" : "ยืนยันความถูกต้อง"}
            </Button>
          </Group>
        </Card>
      ))}
      <Modal opened={Boolean(rejectedSuggestion)} onClose={() => setRejectedSuggestion(null)} title="ระบุสาเหตุที่ AI ไม่ถูกต้อง">
        <Select
          data={[
            { value: "CASE_UNDERSTANDING", label: "AI เข้าใจปัญหาผิด" },
            { value: "SOLUTION_SELECTION", label: "AI เลือกวิธีแก้ผิด" },
            { value: "INSUFFICIENT_CUSTOMER_INFO", label: "ข้อมูลจากลูกค้าไม่เพียงพอ" },
            { value: "BETTER_SOLUTION", label: "มีวิธีแก้อื่นที่ถูกต้องกว่า" },
          ]}
          label="เหตุผล"
          onChange={(value) => setRejectionReason(value as typeof rejectionReason)}
          required
          value={rejectionReason}
        />
        <Textarea label="คำอธิบายเพิ่มเติม" minRows={2} mt="sm" onChange={(event) => setRejectionExplanation(event.currentTarget.value)} value={rejectionExplanation} />
        <Textarea label="วิธีแก้ที่ถูกต้องจากทีม Tech" minRows={2} mt="sm" onChange={(event) => setCorrectedSolution(event.currentTarget.value)} value={correctedSolution} />
        <Group justify="flex-end" mt="md">
          <Button onClick={() => setRejectedSuggestion(null)} variant="default">ยกเลิก</Button>
          <Button color="red" disabled={!rejectionReason} onClick={() => void submitRejection()}>บันทึกผลตรวจ</Button>
        </Group>
      </Modal>
    </Stack>
  );
}

function AnalyticsDashboard({
  onDrillDown,
  summary,
}: {
  onDrillDown: (filter: { category?: string; confidence?: string }) => void;
  summary: AnalyticsSummary;
}) {
  return (
    <Stack gap="lg">
      <SimpleGrid cols={{ base: 1, md: 4 }}>
        <MetricCard color="blue" icon="inbox" label="เคสทั้งหมดเดือนนี้" value={String(summary.total)} />
        <MetricCard color="green" icon="brain" label="แก้ได้จาก solution เดิม" value={`${summary.solvedFromExistingSolutionPct}%`} />
        <MetricCard color="red" icon="alert" label="เกิน SLA" value={String(summary.overSla)} />
        <MetricCard color="violet" icon="chart" label="พร้อม auto-answer" value={String(summary.readyForAutoAnswer)} />
      </SimpleGrid>
      <SimpleGrid cols={{ base: 1, lg: 2 }}>
        <Card padding="lg" radius="md" withBorder>
          <Title mb="md" order={3}>หมวดหมู่เคสที่พบบ่อย</Title>
          {summary.categories.map(({ key, label, value }, index) => (
            <Box
              aria-label={`ดูเคสหมวดหมู่ ${displayCategory(label)}`}
              component="button"
              key={`${label}-${index}`}
              mb="md"
              onClick={() => onDrillDown({ category: key })}
              style={{ background: "transparent", border: 0, cursor: "pointer", padding: 0, textAlign: "left", width: "100%" }}
              type="button"
            >
              <Group justify="space-between">
                <Text>{displayCategory(label)}</Text>
                <Text fw={700}>{value}%</Text>
              </Group>
              <Progress value={value} />
            </Box>
          ))}
          {summary.categories.length === 0 ? <Text c="dimmed">ยังไม่มีข้อมูลหมวดหมู่จากระบบ</Text> : null}
        </Card>
        <Card padding="lg" radius="md" withBorder>
          <Title mb="md" order={3}>การกระจายระดับความมั่นใจ</Title>
          {summary.confidenceDistribution.map(({ label, value }) => (
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
  logs,
  logsPage,
  isLoadingLogs,
  onLoadLogs,
  onUpdateSettings,
  onOpenCase,
  onOpenCaseByNumber,
  settings,
  solutions,
}: {
  logs: AutoAnswerLog[];
  logsPage: AutoAnswerLogsPage;
  isLoadingLogs: boolean;
  onLoadLogs: (query: AutoAnswerLogsQuery) => Promise<void>;
  onUpdateSettings: (input: { emergencyDisable?: boolean; enabled?: boolean }) => Promise<void>;
  settings: AutomationSettings | null;
  solutions: AutoAnswerSolution[];
  onOpenCase: (caseId: string) => Promise<void>;
  onOpenCaseByNumber: (caseNumber: string) => Promise<void>;
}) {
  const enabled = settings?.enabled ?? false;
  const [automationError, setAutomationError] = useState<string>();
  const [isUpdatingAutomation, setIsUpdatingAutomation] = useState(false);
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
    ? "Auto-answer เปิดใช้งานแล้ว ระบบจะตอบเฉพาะเคสที่ผ่าน guardrail และแจ้งทีมผ่าน MS Teams"
    : solutions.length > 0
      ? "มี Solution ที่พร้อมใช้ Auto-answer กรุณาเปิดใช้งานระบบเพื่อเริ่มตอบอัตโนมัติ"
      : "Guardrail พร้อมใช้งาน แต่ยังไม่มี Solution ที่ผ่านเกณฑ์สำหรับ Auto-answer";

  const openLogMessageDrawer = (log: AutoAnswerLog) => {
    setSelectedLogMessage(log);
  };

  const toggleAutomation = async () => {
    if (isUpdatingAutomation || !settings) return;

    setIsUpdatingAutomation(true);
    setAutomationError(undefined);
    try {
      if (enabled) {
        await onUpdateSettings({ emergencyDisable: true });
      } else {
        await onUpdateSettings({ enabled: true });
      }
    } catch (error) {
      setAutomationError(error instanceof Error ? error.message : "ไม่สามารถเปลี่ยนสถานะ auto-answer ได้ กรุณาลองใหม่");
    } finally {
      setIsUpdatingAutomation(false);
    }
  };

  return (
    <Stack gap="lg">
      <Alert color="yellow" icon={<AppIcon name="settings" />} radius="md" variant="light">
        Auto-answer ทำงานได้เฉพาะเมื่อผ่านความมั่นใจ 2 ชั้น และทุกคำตอบต้องแจ้งทีมใน MS Teams เสมอ
      </Alert>
      <Alert color={enabled ? "blue" : solutions.length > 0 ? "yellow" : "gray"} radius="md" variant="light">
        {automationBanner}
      </Alert>

      <Card padding="lg" radius="md" withBorder>
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
        <Text c="dimmed" mt="sm" size="sm">
          Auto-answer จะทำงานเฉพาะเมื่อความมั่นใจทั้ง 2 ด้านผ่านเกณฑ์ เพื่อป้องกันการตอบลูกค้าผิดกรณี
        </Text>
        <Paper className={enabled ? "emergencyPanel" : "automationEnablePanel"} mt="lg" p="md" radius="md">
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
      </Card>

      <Card padding="lg" radius="md" withBorder>
        <Title mb="md" order={3}>Solution ที่ผ่าน guardrail</Title>
        <Table highlightOnHover>
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
        {solutions.length === 0 ? (
          <Text c="dimmed" mt="md">
            ยังไม่มี solution ที่ผ่าน guardrail จาก backend
          </Text>
        ) : null}
      </Card>

      <Card className="autoAnswerLogsCard" padding="md" radius="md" withBorder>
        <Title mb="sm" order={3}>ประวัติการแจ้งเตือน Auto-answer</Title>
        <Box className="autoAnswerLogsFilters" mb="sm">
          <TextInput
            className="autoAnswerLogsSearch"
            label="ค้นหา"
            placeholder="ค้นหาหมายเลขเคส ลูกค้า หรือข้อความ"
            value={logSearch}
            onChange={(event) => updateLogFilter("search", event.currentTarget.value)}
          />
          <Select
            className="autoAnswerLogsEventType"
            clearable
            data={[
              { value: "CASE_ACKNOWLEDGEMENT", label: "รับเรื่อง" },
              { value: "CUSTOMER_REPLY", label: "ตอบลูกค้า" },
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
        </Box>
        <ScrollArea className="autoAnswerLogsTableScroll" type="auto">
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
                <Table.Th style={{ width: 190 }}>ลูกค้า</Table.Th>
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
        </ScrollArea>
        {logs.length === 0 ? (
          <Text c="dimmed" mt="md">
            {isLoadingLogs ? "กำลังโหลด auto-answer notification log..." : "ยังไม่มีข้อมูลที่ตรงกับตัวกรอง"}
          </Text>
        ) : null}
        <Flex className="autoAnswerLogsPagination" align="center" justify="space-between" mt="xs" wrap="wrap" gap="sm">
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
        </Flex>

      </Card>
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
              <Text c="dimmed" size="xs">ลูกค้า</Text>
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
}: {
  caseId?: string;
  initialTab?: string;
}) {
  const router = useRouter();
  const requestedRootTab = getRootTab(initialTab ?? null);
  const [activeTab, setActiveTab] = useState<string | null>(caseId ? "detail" : requestedRootTab);
  const [cases, setCases] = useState<SupportCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<SupportCase | null>(null);
  const [isLoadingCases, setIsLoadingCases] = useState(true);
  const [caseError, setCaseError] = useState<string>();
  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummary>(EMPTY_ANALYTICS_SUMMARY);
  const [automationSettings, setAutomationSettings] = useState<AutomationSettings | null>(null);
  const [autoAnswerLogsState, setAutoAnswerLogsState] = useState<AutoAnswerLogsPage>(EMPTY_AUTO_ANSWER_LOGS_PAGE);
  const [isLoadingAutoAnswerLogs, setIsLoadingAutoAnswerLogs] = useState(true);
  const autoAnswerLogsRequestId = useRef(0);
  const [autoAnswerSolutionsState, setAutoAnswerSolutionsState] = useState<AutoAnswerSolution[]>([]);
  const [confidenceSuggestionsState, setConfidenceSuggestionsState] = useState<ConfidenceSuggestion[]>([]);
  const [isLoadingDashboardData, setIsLoadingDashboardData] = useState(true);
  const [dashboardError, setDashboardError] = useState<string>();
  const [initialAction, setInitialAction] = useState<"accept" | "request-info">();
  const [inboxDrillDown, setInboxDrillDown] = useState<{ category?: string; confidence?: string; requestId: number }>();
  const selectedCaseId = selectedCase?.id;

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
    setIsLoadingDashboardData(true);
    const logRequestId = ++autoAnswerLogsRequestId.current;

    const results = await Promise.allSettled([
      getConfidenceSuggestions(),
      getAnalyticsSummary(),
      getAutomationSettings(),
      getAutoAnswerSolutions(),
      getAutoAnswerLogs({ page: 1, pageSize: 10 }),
    ]);
    const failures: string[] = [];
    const [suggestions, summary, settings, solutions, logs] = results;

    if (suggestions.status === "fulfilled") setConfidenceSuggestionsState(suggestions.value);
    else failures.push("Confidence Review");
    if (summary.status === "fulfilled") setAnalyticsSummary(summary.value);
    else failures.push("Analytics");
    if (settings.status === "fulfilled") setAutomationSettings(settings.value);
    else failures.push("Automation settings");
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
    setIsLoadingDashboardData(false);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCases();
      void loadDashboardData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadCases]);

  useEffect(() => {
    if (!selectedCaseId) return;

    const refreshSelectedCase = async () => {
      try {
        const latestCase = await getCase(selectedCaseId);
        setSelectedCase(latestCase);
        setCases((current) => current.map((item) => (item.id === latestCase.id ? latestCase : item)));
      } catch {
        // Keep the current view if a background refresh temporarily fails.
      }
    };

    const timer = window.setInterval(refreshSelectedCase, 5000);
    return () => window.clearInterval(timer);
  }, [selectedCaseId]);

  useEffect(() => {
    const refreshInbox = async () => {
      try {
        const query = new URLSearchParams(window.location.search);
        const nextCases = await getCases({
          category: query.get("category") ?? undefined,
          kpi: query.get("kpi") ?? undefined,
        });
        setCases(nextCases);
        setSelectedCase((current) => {
          if (!current) return nextCases[0] ?? null;
          return nextCases.find((item) => item.id === current.id) ?? nextCases[0] ?? null;
        });
      } catch {
        // Keep the current inbox when a background refresh temporarily fails.
      }
    };

    const timer = window.setInterval(() => void refreshInbox(), 10000);
    return () => window.clearInterval(timer);
  }, []);

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
    setActiveTab("inbox");
    const params = new URLSearchParams({ tab: "inbox" });
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

  const handleReviewSuggestion = async (item: ConfidenceSuggestion, result: "approved" | "rejected", feedback?: { reason: "CASE_UNDERSTANDING" | "SOLUTION_SELECTION" | "INSUFFICIENT_CUSTOMER_INFO" | "BETTER_SOLUTION"; explanation: string; correctedSolution: string }) => {
    await reviewConfidenceSuggestion({
      caseId: item.caseId,
      id: item.id,
      solutionId: item.suggestedSolutionId === "-" ? undefined : item.suggestedSolutionId,
      reviewStage: item.reviewStage,
      result,
      rejectionReason: feedback?.reason,
      additionalExplanation: feedback?.explanation,
      correctedSolution: feedback?.correctedSolution,
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
              <Text c="dimmed" size="xs">LINE intake · AI analysis · MS Teams support</Text>
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
              <CaseInbox
                cases={cases}
                drillDown={inboxDrillDown}
                error={caseError}
                isLoading={isLoadingCases}
                onOpenCase={(item) => {
                  handleOpenCase(item);
                }}
                onRefresh={() => {
                  void loadCases();
                }}
                selectedCaseId={selectedCase?.id}
                key={inboxDrillDown?.requestId ?? "default"}
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
                onBackToInbox={handleBackToInbox}
              />
            </Tabs.Panel>
            <Tabs.Panel value="confidence">
              <ConfidenceReview
                isLoading={isLoadingDashboardData}
                onReview={handleReviewSuggestion}
                suggestions={confidenceSuggestionsState}
              />
            </Tabs.Panel>
            <Tabs.Panel value="analytics">
              <AnalyticsDashboard onDrillDown={handleAnalyticsDrillDown} summary={analyticsSummary} />
            </Tabs.Panel>
            <Tabs.Panel value="automation">
              <AutomationSettings
                isLoadingLogs={isLoadingAutoAnswerLogs}
                logs={autoAnswerLogsState.items}
                logsPage={autoAnswerLogsState}
                onLoadLogs={loadAutoAnswerLogs}
                onOpenCase={handleOpenCaseById}
                onOpenCaseByNumber={handleOpenCaseByNumber}
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



