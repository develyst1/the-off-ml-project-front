"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
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
import type { AiComposeMode, AiComposeResult } from "@/services/offMlProject.service";
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
  resolved: { label: "ปิดเคสแล้ว", color: "green" },
  sent_to_customer: { label: "ส่งคำตอบแล้ว", color: "green" },
  closed: { label: "ปิดเคสแล้ว", color: "green" },
  reopened: { label: "เปิดเคสกลับมาตรวจสอบ", color: "orange" },
  in_progress: { label: "กำลังดำเนินการ", color: "blue" },
  sent: { label: "ส่งคำตอบแล้ว", color: "green" },
  sla_breach: { label: "เกิน SLA", color: "red" },
};

const DEFAULT_CLOSE_CUSTOMER_MESSAGE = "ทีมงานดำเนินการในเรื่องนี้เรียบร้อยแล้ว จึงขอปิดเคสนี้นะคะ\nหากยังพบปัญหา สามารถตอบกลับพร้อมแจ้งหมายเลขเคสได้เลยค่ะ";

const fallbackStatusMeta = { label: "ไม่ทราบสถานะ", color: "gray" };

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
  label,
  onClick,
  value,
  color,
}: {
  active?: boolean;
  icon: IconName;
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
          <Title order={2}>{value}</Title>
          <Text c="dimmed" size="sm">
            {label}
          </Text>
        </Box>
      </Group>
    </Card>
  );
}

function OperationStepper({ status }: { status: CaseStatus }) {
  const isClosed = status === "closed" || status === "resolved";
  const activeStep =
    status === "new" || status === "analyzing" ? 0 :
    status === "awaiting_tech" || status === "assigned" || status === "awaiting_customer_info" || status === "awaiting_tech_review" ? 1 :
    status === "tech_replied" || status === "analyzing_solution" ? 2 : 3;

  const steps = [
    "ส่งเคสเข้า Microsoft Teams",
    "ได้รับคำตอบจากทีม Tech",
    "AI เรียบเรียงคำตอบ",
    "ส่งคำตอบกลับลูกค้า",
  ].map((label, index) => ({
    label,
    state: isClosed || index < activeStep ? "done" : index === activeStep ? "current" : "todo",
  } as const));

  return (
    <Box className="operationStepper">
      {steps.map((step, index) => (
        <Box className={`operationStep ${step.state}`} key={step.label}>
          <ThemeIcon
            className="operationStepIcon"
            color={step.state === "done" ? "green" : step.state === "current" ? "blue" : "gray"}
            radius="xl"
            size={34}
            variant={step.state === "todo" ? "light" : "filled"}
          >
            {step.state === "done" ? <AppIcon name="check" size={16} /> : index + 1}
          </ThemeIcon>
          <Box>
            <Text fw={step.state === "current" ? 800 : 600} size="sm">{step.label}</Text>
            <Text c="dimmed" size="xs">
              {step.state === "done" ? "ดำเนินการแล้ว" : step.state === "current" ? "กำลังดำเนินการ" : "รอดำเนินการ"}
            </Text>
          </Box>
        </Box>
      ))}
    </Box>
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

function CaseInbox({
  cases,
  error,
  isLoading,
  onOpenCase,
  onRefresh,
  selectedCaseId,
}: {
  cases: SupportCase[];
  error?: string;
  isLoading: boolean;
  onOpenCase: (item: SupportCase) => void;
  onRefresh: () => void;
  selectedCaseId?: string;
}) {
  const [search, setSearch] = useState<string>(DEFAULT_CASE_INBOX_FILTERS.search);
  const [statusFilter, setStatusFilter] = useState<string | null>(DEFAULT_CASE_INBOX_FILTERS.status);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(DEFAULT_CASE_INBOX_FILTERS.category);
  const [confidenceFilter, setConfidenceFilter] = useState<string>(DEFAULT_CASE_INBOX_FILTERS.confidence);
  const [timeFilter, setTimeFilter] = useState<string>(DEFAULT_CASE_INBOX_FILTERS.time);
  const [timeFilterReference, setTimeFilterReference] = useState<number | null>(null);
  const [unreadOnly, setUnreadOnly] = useState<boolean>(DEFAULT_CASE_INBOX_FILTERS.unreadOnly);
  const [slaOnly, setSlaOnly] = useState<boolean>(DEFAULT_CASE_INBOX_FILTERS.slaOnly);
  const [caseScope, setCaseScope] = useState<string>(DEFAULT_CASE_INBOX_FILTERS.scope);
  const [sortMode, setSortMode] = useState<string>(DEFAULT_CASE_INBOX_FILTERS.sort);
  const [casePage, setCasePage] = useState<number>(DEFAULT_CASE_INBOX_FILTERS.page);
  const [casePageSize, setCasePageSize] = useState<10 | 20 | 50>(10);
  const [filtersOpen, setFiltersOpen] = useState(false);

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
  const categories = [...new Set(cases.map((item) => item.category).filter((value) => value && value !== "-"))];
  const statusOptions = Object.entries(statusMeta).map(([value, meta]) => ({ value, label: meta.label }));

  const filteredCases = cases
    .filter((item) => {
      const searchable = [item.caseNumber, item.customerName, item.problemSummary, item.initialCustomerMessage, item.latestCustomerMessage, item.category]
        .join(" ")
        .toLocaleLowerCase();
      if (search.trim() && !searchable.includes(search.trim().toLocaleLowerCase())) return false;
      if (statusFilter && item.status !== statusFilter) return false;
      if (categoryFilter && item.category !== categoryFilter) return false;
      if (unreadOnly && !item.hasUnreadCustomerMessage) return false;
      if (slaOnly && !item.isSlaBreached) return false;
      if (caseScope === "open" && closedStatuses.has(item.status)) return false;
      if (caseScope === "closed" && !closedStatuses.has(item.status)) return false;
      if (confidenceFilter !== "all") {
        const confidence = item.aiConfidence;
        const inRange = confidenceFilter === "0-69" ? confidence < 70
          : confidenceFilter === "70-89" ? confidence >= 70 && confidence < 90
            : confidence >= 90;
        if (!inRange || item.analysisStatus === "AI_FAILED" || item.analysisStatus === "NO_CUSTOMER_MESSAGE") return false;
      }
      if (timeFilter !== "all") {
        const days = Number(timeFilter);
        if (timeFilterReference !== null && timeFilterReference - new Date(item.lastActivityAt).getTime() > days * 24 * 60 * 60 * 1000) return false;
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
    || unreadOnly !== DEFAULT_CASE_INBOX_FILTERS.unreadOnly
    || slaOnly !== DEFAULT_CASE_INBOX_FILTERS.slaOnly
    || confidenceFilter !== DEFAULT_CASE_INBOX_FILTERS.confidence
    || timeFilter !== DEFAULT_CASE_INBOX_FILTERS.time
    || caseScope !== DEFAULT_CASE_INBOX_FILTERS.scope
    || sortMode !== DEFAULT_CASE_INBOX_FILTERS.sort,
  );
  const resetFilters = () => {
    setSearch(DEFAULT_CASE_INBOX_FILTERS.search);
    setStatusFilter(DEFAULT_CASE_INBOX_FILTERS.status);
    setCategoryFilter(DEFAULT_CASE_INBOX_FILTERS.category);
    setConfidenceFilter(DEFAULT_CASE_INBOX_FILTERS.confidence);
    setTimeFilter(DEFAULT_CASE_INBOX_FILTERS.time);
    setTimeFilterReference(null);
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

  const handleSummaryFilter = (filter: "waiting-tech" | "awaiting-confirmation" | "closed" | "sla") => {
    if (filter === "waiting-tech") {
      setStatusFilter((current) => current === "awaiting_tech" ? null : "awaiting_tech");
      setCasePage(1);
      return;
    }
    if (filter === "awaiting-confirmation") {
      setStatusFilter((current) => current === "awaiting_confirmation" ? null : "awaiting_confirmation");
      setCasePage(1);
      return;
    }
    if (filter === "closed") {
      setCaseScope((current) => current === "closed" ? DEFAULT_CASE_INBOX_FILTERS.scope : "closed");
      setCasePage(1);
      return;
    }
    setSlaOnly((current) => !current);
    setCasePage(1);
  };

  return (
    <Stack gap="lg">
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        <MetricCard active={statusFilter === "awaiting_tech"} color="blue" icon="inbox" label="รอตรวจสอบ" onClick={() => handleSummaryFilter("waiting-tech")} value={String(waitingCount)} />
        <MetricCard active={statusFilter === "awaiting_confirmation"} color="yellow" icon="brain" label="รอทีมยืนยันคำแนะนำ AI" onClick={() => handleSummaryFilter("awaiting-confirmation")} value={String(confirmationCount)} />
        <MetricCard active={slaOnly} color="red" icon="alert" label="เกิน SLA" onClick={() => handleSummaryFilter("sla")} value={String(slaCount)} />
        <MetricCard active={caseScope === "closed"} color="green" icon="check" label="ปิดแล้วเดือนนี้" onClick={() => handleSummaryFilter("closed")} value={String(closedCount)} />
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
            <Text c="dimmed" size="xs" style={{ cursor: "help" }}>
              AI วิเคราะห์ ⓘ
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
                <Select clearable data={categories} label="หมวดหมู่" onChange={(value) => { setCategoryFilter(value); setCasePage(1); }} placeholder="ทั้งหมด" value={categoryFilter} />
                <Select data={[{ value: "all", label: "ทุกระดับ" }, { value: "0-69", label: "ต่ำกว่า 70%" }, { value: "70-89", label: "ควรตรวจสอบ 70-89%" }, { value: "90-100", label: "สูง 90-100%" }]} label="Confidence" onChange={(value) => { setConfidenceFilter(value ?? DEFAULT_CASE_INBOX_FILTERS.confidence); setCasePage(1); }} value={confidenceFilter} />
                <Select data={[{ value: "all", label: "ทุกช่วงเวลา" }, { value: "1", label: "24 ชั่วโมง" }, { value: "7", label: "7 วัน" }, { value: "30", label: "30 วัน" }]} label="ช่วงเวลา" onChange={(value) => { setTimeFilter(value ?? DEFAULT_CASE_INBOX_FILTERS.time); setTimeFilterReference(value && value !== "all" ? Date.now() : null); setCasePage(1); }} value={timeFilter} />
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
              {categoryFilter ? <Button onClick={() => { setCategoryFilter(null); setCasePage(1); }} size="compact-xs" variant="light">หมวดหมู่: {categoryFilter} ×</Button> : null}
              {confidenceFilter !== "all" ? <Button onClick={() => { setConfidenceFilter(DEFAULT_CASE_INBOX_FILTERS.confidence); setCasePage(1); }} size="compact-xs" variant="light">Confidence: {confidenceFilter} ×</Button> : null}
              {timeFilter !== "all" ? <Button onClick={() => { setTimeFilter(DEFAULT_CASE_INBOX_FILTERS.time); setTimeFilterReference(null); setCasePage(1); }} size="compact-xs" variant="light">ช่วงเวลา: {timeFilterLabel(timeFilter)} ×</Button> : null}
              {caseScope !== "all" ? <Button onClick={() => { setCaseScope(DEFAULT_CASE_INBOX_FILTERS.scope); setCasePage(1); }} size="compact-xs" variant="light">แสดงเคส: {caseScope === "open" ? "เปิดอยู่" : "ปิดแล้ว"} ×</Button> : null}
              {unreadOnly ? <Button onClick={() => { setUnreadOnly(false); setCasePage(1); }} size="compact-xs" variant="light">ข้อความใหม่ ×</Button> : null}
              {slaOnly ? <Button color="red" onClick={() => { setSlaOnly(false); setCasePage(1); }} size="compact-xs" variant="light">เกิน SLA ×</Button> : null}
            </Group>
            <Text c="dimmed" size="xs">แสดง {filteredCases.length === 0 ? 0 : ((currentCasePage - 1) * casePageSize) + 1}–{Math.min(currentCasePage * casePageSize, filteredCases.length)} จากทั้งหมด {filteredCases.length} เคส</Text>
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
                    <span>AI วิเคราะห์ ⓘ</span>
                  </Tooltip>
                </Table.Th>
                <Table.Th ta="center">สถานะ</Table.Th>
                <Table.Th ta="center">Action</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {visibleCases.map((item) => {
                const caseStatusMeta = getStatusMeta(item.status);

                return (
                <Table.Tr
                  className={`caseInboxRow${selectedCaseId === item.id ? " isSelected" : ""}${item.hasUnreadCustomerMessage ? " hasUnread" : ""}${item.isSlaBreached ? " isSlaBreached" : ""}`}
                  key={item.id}
                  onClick={() => onOpenCase(item)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onOpenCase(item);
                    }
                  }}
                  role="button"
                  tabIndex={0}
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
                    {item.latestCustomerMessage && item.latestCustomerMessage !== item.problemSummary && item.latestCustomerMessage !== item.initialCustomerMessage ? (
                      <Text c="dimmed" lineClamp={1} mt={4} size="xs" title={item.latestCustomerMessage}>ล่าสุด: {item.latestCustomerMessage}</Text>
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
  initialAction,
  onInitialActionHandled,
  onAcceptCase,
  onReply,
  onCloseCase,
  onComposeAi,
  onRewriteAi,
  onReopenCase,
  onRequestInfo,
}: {
  item: SupportCase | null;
  initialAction?: "accept" | "request-info";
  onInitialActionHandled: () => void;
  onAcceptCase: () => Promise<void>;
  onReply: (text: string) => Promise<void>;
  onCloseCase: (text: string) => Promise<void>;
  onComposeAi: (mode: AiComposeMode, supportInstruction?: string, requestedInformation?: string) => Promise<AiComposeResult>;
  onRewriteAi: (mode: AiComposeMode, text: string) => Promise<{ rewrittenMessage: string; rewrittenMessageId?: string; usedFallback?: boolean }>;
  onReopenCase: () => Promise<void>;
  onRequestInfo: (text: string, sourceMessageId?: string) => Promise<void>;
}) {
  const [teamsAction, setTeamsAction] = useState("ยังไม่มีการดำเนินการจากปุ่มในการ์ด Teams");
  const [actionState, setActionState] = useState<"idle" | "accepting" | "requesting" | "replying" | "closing" | "reopening" | "rewriting">("idle");
  const [actionError, setActionError] = useState<string>();
  const [actionNotice, setActionNotice] = useState<string>();
  const [requestInfoDraftMessageId, setRequestInfoDraftMessageId] = useState<string>();
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [actionMode, setActionMode] = useState<"CUSTOMER_REPLY" | "REQUEST_MORE_INFO">("CUSTOMER_REPLY");
  const [supportInstruction, setSupportInstruction] = useState("");
  const [moreInfoGoal, setMoreInfoGoal] = useState("");
  const [moreInfoReason, setMoreInfoReason] = useState<string>();
  const [aiMissingInformation, setAiMissingInformation] = useState<string[]>([]);
  const [closeConfirmationOpen, setCloseConfirmationOpen] = useState(false);
  const [closeMessageText, setCloseMessageText] = useState("");
  const [closeToastVisible, setCloseToastVisible] = useState(false);
  const [teamsThreadOpen, setTeamsThreadOpen] = useState(false);
  const handledInitialAction = useRef(false);
  const replyComposerRef = useRef<HTMLDivElement | null>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!item || !initialAction || handledInitialAction.current) return;
    handledInitialAction.current = true;
    const timer = window.setTimeout(() => {
      window.history.replaceState({}, "", `/?caseId=${encodeURIComponent(item.id)}`);

      if (initialAction === "request-info") {
        setReplyOpen(true);
        setActionMode("REQUEST_MORE_INFO");
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
    if (!replyOpen) return;
    const timer = window.setTimeout(() => {
      replyComposerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      replyTextareaRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [replyOpen]);

  useEffect(() => {
    if (!closeToastVisible) return;
    const timer = window.setTimeout(() => setCloseToastVisible(false), 4500);
    return () => window.clearTimeout(timer);
  }, [closeToastVisible]);

  if (!item) {
    return (
      <Card padding="lg" radius="md" withBorder>
        <Title order={3}>ยังไม่ได้เลือกเคส</Title>
        <Text c="dimmed" mt="xs">
          เลือกเคสจาก Case Inbox เพื่อดูรายละเอียดจาก backend
        </Text>
      </Card>
    );
  }

  const currentStatusMeta = getStatusMeta(item.status);
  const statusLabel = item.status === "awaiting_tech" ? WAITING_TECH_STATUS : currentStatusMeta.label;
  const teamsMeta = teamsDeliveryMeta(item);
  const isActionRunning = actionState !== "idle";
  const isClosed = item.status === "closed";
  const latestLineReply = [...item.conversation]
    .reverse()
    .find((message) => message.channel === "line" && message.direction === "OUTBOUND" && message.isVisibleToCustomer !== false);
  const extractedTeamActions = item.teamActions ?? [];
  const extractedSolution = item.status === "awaiting_tech"
    ? "ยังไม่มีข้อมูล เนื่องจากทีมยังไม่ตอบ"
    : item.supportSolution === "NO_ACTIONABLE_SOLUTION"
      ? extractedTeamActions.length > 0
        ? "ไม่มีขั้นตอนเพิ่มเติมที่ต้องให้ลูกค้าดำเนินการเอง"
        : "ไม่พบแนวทางแก้ไขเพิ่มเติม"
      : item.supportSolution || "ยังไม่มีวิธีแก้ที่สกัดได้";
  const timelineSteps = [
    { label: "รับเรื่อง", at: item.caseCreatedAt },
    { label: "AI วิเคราะห์", at: item.aiAnalyzedAt },
    { label: "ส่ง Teams", at: item.teamsSentAt },
    { label: "ตอบลูกค้า", at: item.lineSentAt || item.lineDeliveredAt },
    { label: "ปิดเคส", at: item.closedAt, by: item.closedBy },
  ];
  const timelineStyle = {
    "--timeline-line-inset": `${100 / (timelineSteps.length * 2)}%`,
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
    const text = replyText.trim();
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
      setReplyOpen(false);
      setReplyText("");
      setRequestInfoDraftMessageId(undefined);
      setMoreInfoReason(undefined);
    }
  };

  const submitCloseCase = async () => {
    const message = closeMessageText.trim() || DEFAULT_CLOSE_CUSTOMER_MESSAGE;
    const completed = await runAction(
      "closing",
      "ปิดเคสและแจ้งลูกค้าทาง LINE แล้ว",
      () => onCloseCase(message),
    );
    if (completed) {
      setCloseConfirmationOpen(false);
      setCloseMessageText("");
      setReplyOpen(false);
      setActionMode("CUSTOMER_REPLY");
      setCloseToastVisible(true);
    }
  };

  const composeWithAi = async (draftOverride?: string, requireDraft = false) => {
    if (actionState !== "idle") return;
    const draftText = (draftOverride ?? (actionMode === "CUSTOMER_REPLY" ? supportInstruction : moreInfoGoal)).trim();
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
        setReplyText(rewritten.rewrittenMessage);
        setRequestInfoDraftMessageId(actionMode === "REQUEST_MORE_INFO" ? rewritten.rewrittenMessageId : undefined);
        setMoreInfoReason(undefined);
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
      setReplyText(draft.suggestedMessage);
      setRequestInfoDraftMessageId(actionMode === "REQUEST_MORE_INFO" ? draft.rewrittenMessageId : undefined);
      setMoreInfoReason(draft.reason);
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

  return (
    <Stack gap="lg">
      <Box className="caseDetailHeader">
        <Group justify="space-between" wrap="wrap">
          <Box>
            <Title order={2}>เคส {item.caseNumber}</Title>
            <Text c="dimmed" size="sm">ลูกค้า: {item.customerName}</Text>
          </Box>
          <Group className="caseDetailHeaderBadges" gap="xs" wrap="wrap">
            <Badge color={currentStatusMeta.color} variant="light">{statusLabel}</Badge>
            {item.aiStatus !== "AI_FAILED" ? <Badge color={confidenceColor(item.aiConfidence)} variant="light">AI {item.aiConfidence}%</Badge> : null}
            {item.isSlaBreached ? <Badge color="red" variant="light">เกิน SLA</Badge> : null}
            <Badge color="gray" variant="light">อัปเดต {relativeTime(item.lastActivityAt)}</Badge>
          </Group>
        </Group>
        {isClosed && item.closedAt ? <Text c="dimmed" mt={4} size="xs">ปิดเมื่อ {formatEventTime(item.closedAt)}{item.closedBy ? ` โดย ${item.closedBy}` : ""}</Text> : null}
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
          <Box className="caseTimelineSteps" style={timelineStyle}>
            {timelineSteps.map((step, index, steps) => {
              const isDone = Boolean(step.at);
              const isCurrent = !isDone && steps.slice(index + 1).every((nextStep) => !nextStep.at);
              return (
                <Box className="caseTimelineStep" key={step.label}>
                  <Box className="caseTimelineStepMarker">
                    <ThemeIcon color={isDone ? "green" : isCurrent ? "blue" : "gray"} radius="xl" size={30} variant={isDone || isCurrent ? "filled" : "light"}>
                      {isDone ? <AppIcon name="check" size={15} /> : index + 1}
                    </ThemeIcon>
                  </Box>
                  <Text fw={isCurrent ? 800 : 600} size="sm">{step.label}</Text>
                  <Text c="dimmed" size="xs">{formatEventTime(step.at)}</Text>
                  {step.by ? <Text c="dimmed" size="xs">โดย {step.by}</Text> : null}
                </Box>
              );
            })}
          </Box>
        </Card>
        </Box>

        <Box className="caseDetailBottomGrid">
        <Box className="teamsThreadSection">
        <CaseConversation item={item} />
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
                  ปุ่มในการ์ดนี้เป็น preview จาก Microsoft Teams ต้องดำเนินการใน Microsoft Teams เท่านั้น
                </Text>
                <Text c="dimmed" mt={4} size="xs">
                  เปิดเคสใน Teams = เปิดรายละเอียดเคส, รับเคส = ให้เจ้าหน้าที่รับผิดชอบเคส,
                  โหมดขอข้อมูลเพิ่มเติม = ให้ทีมส่งคำถามจาก Composer เดียวกัน
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
                  </Text>
                  <Group mt="md">
                    <Button onClick={() => setTeamsAction(`เปิดรายละเอียดเคส ${item.caseNumber} ใน Microsoft Teams แล้ว`)} size="xs" variant="light">
                      เปิดเคสใน Teams
                    </Button>
                    <Button
                      disabled={isActionRunning || item.status === "assigned" || isClosed}
                      loading={actionState === "accepting"}
                      onClick={() => {
                        void runAction("accepting", `รับเคส ${item.caseNumber} สำเร็จแล้ว`, onAcceptCase);
                      }}
                      size="xs"
                      variant="light"
                    >
                      รับเคส
                    </Button>
                    <Button
                      disabled={isActionRunning || isClosed}
                      onClick={() => {
                        setActionError(undefined);
                        setActionNotice(undefined);
                        setActionMode("CUSTOMER_REPLY");
                        setAiMissingInformation([]);
                        setReplyOpen(true);
                      }}
                      size="xs"
                      variant="light"
                    >
                      ตอบลูกค้า
                    </Button>
                    <Button
                      color="orange"
                      disabled={isActionRunning || isClosed}
                      loading={actionState === "closing"}
                      onClick={() => {
                        setActionError(undefined);
                        setCloseMessageText("");
                        setCloseConfirmationOpen(true);
                      }}
                      size="xs"
                      variant="light"
                    >
                      {actionState === "closing" ? "กำลังปิดเคส..." : "ปิดเคส"}
                    </Button>
                    {isClosed ? (
                      <Button
                        color="orange"
                        disabled={isActionRunning}
                        loading={actionState === "reopening"}
                        onClick={() => {
                          void runAction("reopening", `เปิดเคส ${item.caseNumber} อีกครั้งแล้ว`, onReopenCase);
                        }}
                        size="xs"
                        variant="light"
                      >
                        เปิดเคสอีกครั้ง
                      </Button>
                    ) : null}
                  </Group>
                  {replyOpen && !isClosed ? (
                    <Paper ref={replyComposerRef} className="caseReplyComposer" mt="md" p="md" radius="md" withBorder>
                      <Group align="center" justify="space-between" gap="sm">
                        <Box>
                          <Text fw={800} size="sm">ตอบกลับทาง LINE</Text>
                          <Text c="dimmed" size="xs">
                            เลือกโหมดการทำงาน แล้วตรวจสอบข้อความก่อนส่งทุกครั้ง
                          </Text>
                        </Box>
                        <Select
                          aria-label="โหมดการส่งข้อความ"
                          data={[
                            { value: "CUSTOMER_REPLY", label: "โหมด: ตอบลูกค้า" },
                            { value: "REQUEST_MORE_INFO", label: "โหมด: ขอข้อมูลเพิ่มเติม" },
                          ]}
                          onChange={(value) => {
                            const nextMode = (value as "CUSTOMER_REPLY" | "REQUEST_MORE_INFO" | null) ?? "CUSTOMER_REPLY";
                            setActionMode(nextMode);
                            setRequestInfoDraftMessageId(undefined);
                            setMoreInfoReason(undefined);
                            setAiMissingInformation([]);
                          }}
                          size="xs"
                          value={actionMode}
                          w={220}
                        />
                      </Group>
                      <Box pos="relative" mt="sm">
                        <Textarea
                          ref={replyTextareaRef}
                          autosize
                          label="ข้อความที่จะส่ง"
                          minRows={5}
                          onChange={(event) => setReplyText(event.currentTarget.value)}
                          placeholder="ข้อความที่พร้อมส่งจะแสดงที่นี่ และสามารถแก้ไขได้ก่อนส่ง"
                          styles={{ input: { paddingRight: 52 } }}
                          value={replyText}
                        />
                        <Tooltip label="ช่วยขยายความจากข้อความที่พิมพ์" withArrow>
                          <ActionIcon
                            aria-label="ช่วยขยายความจากข้อความที่พิมพ์ด้วย AI"
                            color="blue"
                            disabled={!replyText.trim() || isActionRunning}
                            loading={actionState === "rewriting"}
                            onClick={() => void composeWithAi(replyText, true)}
                            pos="absolute"
                            right={10}
                            size="lg"
                            top={34}
                            variant="light"
                            radius="xl"
                          >
                            <AppIcon name="brain" size={17} />
                          </ActionIcon>
                        </Tooltip>
                      </Box>
                      <Paper className="caseMoreInfoGoalPanel" mt="sm" p="sm" radius="sm" withBorder>
                        <Text fw={700} size="sm">
                          {actionMode === "CUSTOMER_REPLY" ? "ใช้ AI ช่วยสร้างคำตอบ" : "ใช้ AI ช่วยสร้างคำขอข้อมูล"}
                        </Text>
                        <Text c="dimmed" size="xs" mt={4}>
                          {actionMode === "CUSTOMER_REPLY"
                            ? "AI จะวิเคราะห์ประวัติแชท หัวข้อ และข้อมูลในเคส เพื่อร่างคำตอบให้เหมาะสม"
                            : "ระบุข้อมูลที่ต้องการ แล้วให้ AI ช่วยเรียบเรียงเป็นคำถามสั้น ๆ"}
                        </Text>
                        {actionMode === "CUSTOMER_REPLY" ? (
                          <Textarea
                            autosize
                            label="แนวทางเพิ่มเติม (ถ้ามี)"
                            minRows={2}
                            mt="sm"
                            onChange={(event) => setSupportInstruction(event.currentTarget.value)}
                            placeholder="ระบุผลตรวจสอบหรือแนวทางที่ต้องการให้ AI นำไปใช้เพิ่มเติม..."
                            value={supportInstruction}
                          />
                        ) : (
                          <TextInput
                            label="ข้อมูลที่ต้องการ"
                            mt="sm"
                            onChange={(event) => setMoreInfoGoal(event.currentTarget.value)}
                            placeholder="ระบุข้อมูลที่ต้องการ เช่น รุ่นเครื่อง ภาพหน้าจอ หรือข้อความแจ้งเตือน..."
                            value={moreInfoGoal}
                          />
                        )}
                        {moreInfoReason ? <Text c="dimmed" mt="xs" size="xs">เหตุผลสำหรับทีม: {moreInfoReason}</Text> : null}
                        <Button
                          className="caseReplyComposerAi"
                          disabled={isActionRunning}
                          leftSection={<AppIcon name="brain" size={16} />}
                          loading={actionState === "rewriting"}
                          mt="sm"
                          onClick={() => void composeWithAi()}
                          variant="light"
                        >
                          {actionMode === "CUSTOMER_REPLY" ? "สร้างคำตอบด้วย AI" : "สร้างคำขอด้วย AI"}
                        </Button>
                      </Paper>
                      {actionMode === "CUSTOMER_REPLY" && aiMissingInformation.length > 0 ? (
                        <Alert color="yellow" mt="md" title="ข้อมูลยังไม่เพียงพอสำหรับร่างคำตอบ">
                          <Text size="sm">แนะนำให้เปลี่ยนเป็นโหมดขอข้อมูลเพิ่มเติม</Text>
                          <Text c="dimmed" mt={4} size="sm">ข้อมูลที่ยังขาด: {aiMissingInformation.join(", ")}</Text>
                          <Button mt="sm" onClick={() => { setActionMode("REQUEST_MORE_INFO"); setAiMissingInformation([]); }} size="xs" variant="light">
                            เปลี่ยนเป็นโหมดขอข้อมูลเพิ่มเติม
                          </Button>
                        </Alert>
                      ) : null}
                      {actionError ? <Alert color="red" mt="md" title="ดำเนินการไม่สำเร็จ">{actionError}</Alert> : null}
                      {actionNotice ? <Alert color="green" mt="md">{actionNotice}</Alert> : null}
                      <Group className="caseReplyComposerActions" justify="space-between" mt="md">
                        <Text c="dimmed" size="xs">
                          {actionMode === "REQUEST_MORE_INFO" ? "เมื่อส่งแล้ว ระบบจะรอข้อมูลเพิ่มเติมในเคสนี้" : "การส่งข้อความจะคงสถานะเคสเดิมไว้"}
                        </Text>
                        <Group className="caseReplyComposerSubmit" gap="sm">
                          <Button
                            disabled={isActionRunning}
                            onClick={() => {
                              setReplyOpen(false);
                              setActionError(undefined);
                            }}
                            variant="default"
                          >
                            ยกเลิก
                          </Button>
                          <Button
                            disabled={!replyText.trim() || isActionRunning}
                            loading={actionState === "replying" || actionState === "requesting"}
                            onClick={() => void submitReply()}
                          >
                            ส่งข้อความ
                          </Button>
                        </Group>
                      </Group>
                    </Paper>
                  ) : null}
                </Paper>
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
      </Box>

      <Stack className="caseDetailInsightStack" gap="md">
        <Card className="caseActionComposerCard" padding="md" radius="md" withBorder>
          <Group align="center" justify="space-between" gap="sm" wrap="wrap">
            <Box>
              <Text fw={800}>ข้อความที่จะส่งให้ลูกค้า</Text>
              <Text c="dimmed" size="xs">ตรวจสอบข้อความก่อนส่งผ่าน LINE ทุกครั้ง</Text>
            </Box>
            <Select
              aria-label="โหมดการส่งข้อความ"
              data={[
                { value: "CUSTOMER_REPLY", label: "ตอบลูกค้า" },
                { value: "REQUEST_MORE_INFO", label: "ขอข้อมูลเพิ่มเติม" },
              ]}
              onChange={(value) => {
                const nextMode = (value as "CUSTOMER_REPLY" | "REQUEST_MORE_INFO" | null) ?? "CUSTOMER_REPLY";
                setActionMode(nextMode);
                setRequestInfoDraftMessageId(undefined);
                setMoreInfoReason(undefined);
                setAiMissingInformation([]);
              }}
              size="xs"
              value={actionMode}
              w={180}
            />
          </Group>
          <Box pos="relative" mt="sm">
            <Textarea
              autosize
              label="ร่างข้อความ"
              minRows={5}
              onChange={(event) => setReplyText(event.currentTarget.value)}
              placeholder="พิมพ์ข้อความเอง หรือให้ AI ช่วยสร้างร่างจากบริบทของเคส"
              styles={{ input: { paddingRight: 52 } }}
              value={replyText}
            />
            <Tooltip label="ช่วยขยายความจากข้อความที่พิมพ์" withArrow>
              <ActionIcon
                aria-label="ช่วยขยายความจากข้อความที่พิมพ์ด้วย AI"
                color="blue"
                disabled={!replyText.trim() || isActionRunning}
                loading={actionState === "rewriting"}
                onClick={() => void composeWithAi(replyText, true)}
                pos="absolute"
                right={10}
                size="lg"
                top={34}
                variant="light"
                radius="xl"
              >
                <AppIcon name="brain" size={17} />
              </ActionIcon>
            </Tooltip>
          </Box>
          <Group className="caseActionComposerButtons" gap="xs" mt="sm" wrap="wrap">
            <Button disabled={isActionRunning} leftSection={<AppIcon name="brain" size={15} />} loading={actionState === "rewriting"} onClick={() => void composeWithAi()} size="xs" variant="light">
              สร้างร่างด้วย AI
            </Button>
            <Button disabled={!replyText.trim() || isActionRunning || isClosed} loading={actionState === "replying" || actionState === "requesting"} onClick={() => void submitReply()} size="xs">
              ส่งข้อความ
            </Button>
            <Button disabled={isActionRunning || isClosed} onClick={() => { setActionMode("REQUEST_MORE_INFO"); setReplyOpen(false); }} size="xs" variant="light">
              ขอข้อมูลเพิ่มเติม
            </Button>
            <Button color="red" disabled={isActionRunning || isClosed} onClick={() => { setActionError(undefined); setCloseMessageText(""); setCloseConfirmationOpen(true); }} size="xs" variant="outline">
              ปิดเคส
            </Button>
          </Group>
          {actionMode === "CUSTOMER_REPLY" && aiMissingInformation.length > 0 ? (
            <Alert color="yellow" mt="sm" title="ข้อมูลยังไม่เพียงพอสำหรับร่างคำตอบ">
              <Text size="sm">ข้อมูลที่ยังขาด: {aiMissingInformation.join(", ")}</Text>
            </Alert>
          ) : null}
          {actionError ? <Alert color="red" mt="sm" title="ดำเนินการไม่สำเร็จ">{actionError}</Alert> : null}
          {actionNotice ? <Alert color="green" mt="sm">{actionNotice}</Alert> : null}
        </Card>

        <Card className="caseOperationStatusCard" padding="md" radius="md" withBorder>
          <Group gap="sm" mb="md">
            <ThemeIcon color="blue" radius="xl" variant="light">
              <AppIcon name="message" />
            </ThemeIcon>
            <Text fw={800}>สถานะการดำเนินงาน</Text>
          </Group>
          <OperationStepper status={item.status} />
          <Paper bg="gray.0" className="caseCurrentStatus" mt="md" p="sm" radius="sm">
            <Text c="dimmed" fw={700} size="xs">สถานะปัจจุบัน</Text>
            <Badge color={currentStatusMeta.color} mt={4} variant="light">{statusLabel}</Badge>
          </Paper>
        </Card>

        <Card padding="md" radius="md" withBorder>
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
        </Card>

        <Card padding="md" radius="md" withBorder>
          <Group gap="sm">
            <ThemeIcon color="orange" radius="xl" variant="light">
              <AppIcon name="settings" />
            </ThemeIcon>
            <Text c="dimmed" fw={700} size="sm">ทีม Tech ดำเนินการ</Text>
          </Group>
          <Paper bg="orange.0" mt="sm" p="md" radius="sm">
            {extractedTeamActions.length > 0 ? (
              <Stack gap={6}>
                {extractedTeamActions.map((action) => (
                  <Text className="compactText" key={action} size="sm">• {action}</Text>
                ))}
              </Stack>
            ) : (
              <Text className="compactText" size="sm">ยังไม่มีการดำเนินการจากทีม Tech ที่สกัดได้</Text>
            )}
          </Paper>
        </Card>

        {item.customerOutcome ? (
          <Card padding="md" radius="md" withBorder>
            <Group gap="sm">
              <ThemeIcon color="green" radius="xl" variant="light">
                <AppIcon name="check" />
              </ThemeIcon>
              <Text c="dimmed" fw={700} size="sm">ผลการตรวจสอบจากลูกค้า</Text>
            </Group>
            <Paper bg="green.0" mt="sm" p="md" radius="sm">
              <Text className="compactText" size="sm">{item.customerOutcome.text}</Text>
            </Paper>
            <Text c="dimmed" mt="xs" size="xs">
              {item.customerOutcome.type === "RESOLVED" ? "ลูกค้ายืนยันว่าใช้งานได้แล้ว" : "ลูกค้าแจ้งว่าอาการดีขึ้น"}
              {item.customerOutcome.confirmedAt ? ` · ${formatEventTime(item.customerOutcome.confirmedAt)}` : ""}
            </Text>
          </Card>
        ) : null}

        <Card padding="md" radius="md" withBorder>
          <Group gap="sm">
            <ThemeIcon color="green" radius="xl" variant="light">
              <AppIcon name="message" />
            </ThemeIcon>
            <Text c="dimmed" fw={700} size="sm">ข้อความล่าสุดที่ส่งทาง LINE</Text>
          </Group>
          <Paper bg="green.0" mt="sm" p="sm" radius="sm">
            <Text className="compactText" size="sm">
              {latestLineReply?.displayText || latestLineReply?.originalText || item.customerReply || "ยังไม่มีข้อความที่ส่งกลับลูกค้า"}
            </Text>
          </Paper>
          {latestLineReply ? <Text c="dimmed" mt="xs" size="xs">ส่งเมื่อ: {formatEventTime(latestLineReply.sentAt || latestLineReply.createdAt)}</Text> : null}
        </Card>

        <Card padding="md" radius="md" withBorder>
          <Text c="dimmed" fw={700} size="sm">ข้อมูลสรุปของเคส</Text>
          <Stack gap={6} mt="sm">
            <Group justify="space-between" wrap="nowrap"><Text c="dimmed" size="xs">สถานะเคส</Text><Badge color={currentStatusMeta.color} variant="light">{statusLabel}</Badge></Group>
            <Group justify="space-between" wrap="nowrap"><Text c="dimmed" size="xs">ผู้รับผิดชอบ</Text><Text size="xs">{item.assignee || "ยังไม่มีผู้รับผิดชอบ"}</Text></Group>
            <Group justify="space-between" wrap="nowrap"><Text c="dimmed" size="xs">อัปเดตล่าสุด</Text><Text size="xs">{formatEventTime(item.lastActivityAt)}</Text></Group>
            {item.closedAt ? <Group justify="space-between" wrap="nowrap"><Text c="dimmed" size="xs">วันที่ปิดเคส</Text><Text size="xs">{formatEventTime(item.closedAt)}</Text></Group> : null}
          </Stack>
        </Card>
      </Stack>
      </Box>
      </Box>
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
        <Textarea
          autosize
          label="ข้อความแจ้งลูกค้า"
          minRows={4}
          mt="md"
          onChange={(event) => setCloseMessageText(event.currentTarget.value)}
          placeholder="เช่น ทีมงานตรวจสอบและแนะนำวิธีแก้ไขเรียบร้อยแล้วค่ะ"
          value={closeMessageText}
        />
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
  onReview: (item: ConfidenceSuggestion, result: "approved" | "rejected") => Promise<void>;
  suggestions: ConfidenceSuggestion[];
}) {
  const [reviewedSuggestions, setReviewedSuggestions] = useState<Record<string, "approved" | "rejected">>({});

  const reviewSuggestion = async (item: ConfidenceSuggestion, result: "approved" | "rejected") => {
    await onReview(item, result);
    setReviewedSuggestions((current) => ({ ...current, [item.id]: result }));
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
                  <Text size="sm">เข้าใจเคสถูกต้อง</Text>
                  <Text fw={700} size="sm">{item.caseUnderstandingConfidence}%</Text>
                </Group>
                <Progress value={item.caseUnderstandingConfidence} />
              </Box>
              <Box>
                <Group justify="space-between">
                  <Text size="sm">แยกเคส/เลือก solution ถูกต้อง</Text>
                  <Text fw={700} size="sm">{item.caseDiscriminationConfidence}%</Text>
                </Group>
                <Progress value={item.caseDiscriminationConfidence} />
              </Box>
            </Stack>
          </SimpleGrid>
          <Text c={item.reviewStage === "AUTO_ANSWER" ? "green.7" : "dimmed"} mt="md" size="sm">
            {item.reviewHint}
          </Text>
          <Group justify="flex-end" mt="md">
            <Button color="red" onClick={() => void reviewSuggestion(item, "rejected")} variant="light">
              {item.reviewStage === "AUTO_ANSWER" ? "ไม่อนุมัติ" : "ไม่ถูกต้อง"}
            </Button>
            <Button onClick={() => void reviewSuggestion(item, "approved")}>
              {item.reviewStage === "AUTO_ANSWER" ? "อนุมัติให้ตอบอัตโนมัติ" : "ยืนยันความถูกต้อง"}
            </Button>
          </Group>
        </Card>
      ))}
    </Stack>
  );
}

function AnalyticsDashboard({
  summary,
}: {
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
          {summary.categories.map(({ label, value }) => (
            <Box key={label} mb="md">
              <Group justify="space-between">
                <Text>{label}</Text>
                <Text fw={700}>{value}%</Text>
              </Group>
              <Progress value={value} />
            </Box>
          ))}
          {summary.categories.length === 0 ? <Text c="dimmed">ยังไม่มีข้อมูล category จาก backend</Text> : null}
        </Card>
        <Card padding="lg" radius="md" withBorder>
          <Title mb="md" order={3}>Confidence distribution</Title>
          {summary.confidenceDistribution.map(({ label, value }) => (
            <Box key={label} mb="md">
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
  const [automationNotice, setAutomationNotice] = useState("Auto-answer พร้อมทำงานตาม guardrail ที่กำหนด");
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
        setAutomationNotice("ปิด auto-answer ทันทีแล้ว เคสใหม่จะกลับเข้าคิวทีม Tech Support");
      } else {
        await onUpdateSettings({ enabled: true });
        setAutomationNotice("เปิด auto-answer แล้ว ระบบจะทำงานเฉพาะเคสที่ผ่าน confidence 2 ชั้น");
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
      <Alert color={enabled ? "blue" : "red"} radius="md" variant="light">
        {automationNotice}
      </Alert>

      <Card padding="lg" radius="md" withBorder>
        <Box>
          <Title order={3}>Guarded auto-answer</Title>
          <Text c="dimmed" size="sm">
            ใช้ threshold ทั้ง case_understanding_confidence และ case_discrimination_confidence
          </Text>
        </Box>
        <SimpleGrid cols={{ base: 1, md: 2 }} mt="lg">
          <Paper bg="gray.0" p="md" radius="md">
            <Text c="dimmed" fw={700} size="sm">เข้าใจเคสถูกต้อง</Text>
            <Title order={2}>{settings?.caseUnderstandingThreshold ?? 98}%</Title>
          </Paper>
          <Paper bg="gray.0" p="md" radius="md">
            <Text c="dimmed" fw={700} size="sm">แยกเคส/เลือก solution ถูกต้อง</Text>
            <Title order={2}>{settings?.caseDiscriminationThreshold ?? 98}%</Title>
          </Paper>
        </SimpleGrid>
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
        <Title mb="sm" order={3}>Auto-answer notification log</Title>
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

export default function OffMlProjectDashboardContent() {
  const [activeTab, setActiveTab] = useState<string | null>("inbox");
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
  const selectedCaseId = selectedCase?.id;

  const loadCases = async () => {
    setIsLoadingCases(true);
    setCaseError(undefined);

    try {
      const nextCases = await getCases();
      const requestedCaseId = new URLSearchParams(window.location.search).get("caseId");
      const requestedAction = new URLSearchParams(window.location.search).get("action");
      setCases(nextCases);
      setSelectedCase((current) => {
        if (!nextCases.length) return null;
        const requestedCase = nextCases.find((item) => item.id === requestedCaseId);
        if (!current && requestedCase) return requestedCase;
        if (!current) return nextCases[0];
        return nextCases.find((item) => item.id === current.id) ?? nextCases[0];
      });
      if (requestedCaseId && nextCases.some((item) => item.id === requestedCaseId)) {
        setActiveTab("detail");
        if (requestedAction === "accept" || requestedAction === "request-info") {
          setInitialAction(requestedAction);
        }
      }
    } catch (error) {
      setCaseError(error instanceof Error ? error.message : "โหลดข้อมูลเคสจาก backend ไม่สำเร็จ");
    } finally {
      setIsLoadingCases(false);
    }
  };

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
  }, []);

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
        const nextCases = await getCases();
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

  const handleOpenCase = async (item: SupportCase) => {
    setSelectedCase(item);
    setActiveTab("detail");

    try {
      const latestCase = await getCase(item.id);
      setSelectedCase(latestCase);
      setCases((current) => current.map((caseItem) => (caseItem.id === latestCase.id ? latestCase : caseItem)));
    } catch (error) {
      setCaseError(error instanceof Error ? error.message : "โหลดรายละเอียดเคสจาก backend ไม่สำเร็จ");
    }
  };

  const handleOpenCaseById = async (caseId: string) => {
    const existingCase = cases.find((item) => item.id === caseId);
    if (existingCase) {
      await handleOpenCase(existingCase);
      return;
    }

    try {
      const latestCase = await getCase(caseId);
      setSelectedCase(latestCase);
      setActiveTab("detail");
      window.history.replaceState({}, "", `/?caseId=${encodeURIComponent(latestCase.id)}`);
    } catch (error) {
      setCaseError(error instanceof Error ? error.message : "โหลดรายละเอียดเคสจาก backend ไม่สำเร็จ");
    }
  };

  const handleOpenCaseByNumber = async (caseNumber: string) => {
    const matchingCase = cases.find((item) => item.caseNumber === caseNumber);
    if (!matchingCase) {
      setCaseError(`ไม่พบเคส ${caseNumber} ในข้อมูลปัจจุบัน`);
      return;
    }
    await handleOpenCase(matchingCase);
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

  const handleCloseCase = async (text: string) => {
    if (!selectedCase) return;
    const updatedCase = await closeCaseWithReply(selectedCase.id, text);
    setSelectedCase(updatedCase);
    setCases((current) => current.map((item) => (item.id === updatedCase.id ? updatedCase : item)));
  };

  const handleComposeAi = async (mode: AiComposeMode, supportInstruction?: string, requestedInformation?: string) => {
    if (!selectedCase) throw new Error("ยังไม่ได้เลือกเคส");
    return composeAiMessage(selectedCase.id, { mode, supportInstruction, requestedInformation });
  };

  const handleRewriteAi = async (mode: AiComposeMode, text: string) => {
    if (!selectedCase) throw new Error("ยังไม่ได้เลือกเคส");
    if (mode === "REQUEST_MORE_INFO") {
      return rewriteAdditionalInfoRequest(selectedCase.id, text);
    }
    return rewriteCustomerReply(selectedCase.id, text, "NORMAL_REPLY");
  };

  const handleReopenCase = async () => {
    if (!selectedCase) return;
    const updatedCase = await reopenCase(selectedCase.id);
    setSelectedCase(updatedCase);
    setCases((current) => current.map((item) => (item.id === updatedCase.id ? updatedCase : item)));
  };

  const handleReviewSuggestion = async (item: ConfidenceSuggestion, result: "approved" | "rejected") => {
    await reviewConfidenceSuggestion({
      caseId: item.caseId,
      id: item.id,
      solutionId: item.suggestedSolutionId === "-" ? undefined : item.suggestedSolutionId,
      reviewStage: item.reviewStage,
      result,
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
                : tab.value === "detail"
                  ? "message"
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
                onClick={() => setActiveTab(tab.value)}
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
                error={caseError}
                isLoading={isLoadingCases}
                onOpenCase={(item) => {
                  void handleOpenCase(item);
                }}
                onRefresh={() => {
                  void loadCases();
                }}
                selectedCaseId={selectedCase?.id}
              />
            </Tabs.Panel>
            <Tabs.Panel value="detail">
              <CaseDetail
                initialAction={initialAction}
                item={selectedCase}
                onAcceptCase={handleAcceptCase}
                onInitialActionHandled={() => setInitialAction(undefined)}
                onReply={handleReply}
                onCloseCase={handleCloseCase}
                onComposeAi={handleComposeAi}
                onRewriteAi={handleRewriteAi}
                onReopenCase={handleReopenCase}
                onRequestInfo={handleRequestInfo}
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
              <AnalyticsDashboard summary={analyticsSummary} />
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



