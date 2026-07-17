"use client";

import { useEffect, useRef, useState } from "react";
import {
  Alert,
  AppShell,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Group,
  Modal,
  NavLink,
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
  closeCaseWithReply,
  reopenCase,
} from "@/services/offMlProject.service";
import type { AiComposeMode, AiComposeResult } from "@/services/offMlProject.service";
import type {
  AnalyticsSummary,
  AutoAnswerLog,
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
  awaiting_tech: { label: "รอทีม Tech Support ตอบกลับ", color: "yellow" },
  assigned: { label: "ทีม Tech Support รับเคสแล้ว", color: "blue" },
  tech_replied: { label: "ทีม Tech Support ตอบแล้ว", color: "blue" },
  analyzing_solution: { label: "AI กำลังวิเคราะห์คำตอบ", color: "blue" },
  awaiting_confirmation: { label: "รอยืนยัน AI แนะนำ", color: "blue" },
  awaiting_customer_info: { label: "รอลูกค้าส่งข้อมูลเพิ่ม", color: "orange" },
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

function getStatusMeta(status: CaseStatus) {
  return statusMeta[status] ?? fallbackStatusMeta;
}

const WAITING_TECH_STATUS = "รอทีม Tech Support ตอบกลับ";

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

function confidenceColor(value: number) {
  if (value >= 90) return "green";
  if (value >= 60) return "yellow";
  return "red";
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
  icon,
  label,
  onClick,
  value,
  color,
}: {
  icon: IconName;
  label: string;
  onClick?: () => void;
  value: string;
  color: string;
}) {
  return (
    <Card
      className="metricCard"
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
  const activeStep =
    status === "new" || status === "analyzing" ? 0 :
    status === "awaiting_tech" || status === "assigned" || status === "awaiting_customer_info" || status === "awaiting_tech_review" ? 1 :
    status === "tech_replied" || status === "analyzing_solution" ? 2 : 3;

  const steps = [
    "ส่งเคสเข้า Microsoft Teams แล้ว",
    WAITING_TECH_STATUS,
    "AI วิเคราะห์คำตอบจากทีม",
    "ส่งคำตอบกลับลูกค้า",
  ].map((label, index) => ({
    label,
    state: index < activeStep ? "done" : index === activeStep ? "current" : "todo",
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
          <Text fw={step.state === "current" ? 800 : 600} size="sm">
            {step.label}
          </Text>
        </Box>
      ))}
    </Box>
  );
}

function CaseInbox({
  cases,
  error,
  isLoading,
  onOpenCase,
  onOpenConfidence,
  onRefresh,
}: {
  cases: SupportCase[];
  error?: string;
  isLoading: boolean;
  onOpenCase: (item: SupportCase) => void;
  onOpenConfidence: () => void;
  onRefresh: () => void;
}) {
  const awaitingTechCase = cases.find((item) => item.status === "awaiting_tech") ?? cases[0];
  const awaitingConfirmationCase = cases.find((item) => item.status === "awaiting_confirmation");
  const resolvedCase = cases.find((item) => ["resolved", "closed", "sent_to_customer", "sent"].includes(item.status));
  const slaCase = cases.find((item) => item.status === "sla_breach");
  const waitingCount = cases.filter((item) => item.status === "awaiting_tech").length;
  const confirmationCount = cases.filter((item) => item.status === "awaiting_confirmation").length;
  const closedCount = cases.filter((item) => ["resolved", "closed", "sent_to_customer", "sent"].includes(item.status)).length;
  const slaCount = cases.filter((item) => item.status === "sla_breach").length;

  return (
    <Stack gap="lg">
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        <MetricCard color="blue" icon="inbox" label="รอทีมตอบ" onClick={awaitingTechCase ? () => onOpenCase(awaitingTechCase) : undefined} value={String(waitingCount)} />
        <MetricCard color="yellow" icon="brain" label="รอยืนยัน AI แนะนำ" onClick={awaitingConfirmationCase ? () => onOpenCase(awaitingConfirmationCase) : onOpenConfidence} value={String(confirmationCount)} />
        <MetricCard color="green" icon="check" label="ปิดเคสแล้วเดือนนี้" onClick={resolvedCase ? () => onOpenCase(resolvedCase) : undefined} value={String(closedCount)} />
        <MetricCard color="red" icon="alert" label="เกิน SLA" onClick={slaCase ? () => onOpenCase(slaCase) : undefined} value={String(slaCount)} />
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
          <Box>
            <Title order={3}>เคสล่าสุดจากลูกค้า LINE</Title>
            <Text c="dimmed" size="sm">
              ความมั่นใจในตารางอิงจาก analysis.confidence ของ API AI CENTER ตอนวิเคราะห์ข้อความลูกค้า
            </Text>
          </Box>
          <Badge color="gray" variant="light">
            {isLoading ? "กำลังโหลดจาก Backend" : ""}
          </Badge>
        </Group>

        <ScrollArea>
          <Table highlightOnHover miw={980} verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>ลูกค้า</Table.Th>
                <Table.Th>ข้อความต้นฉบับ</Table.Th>
                <Table.Th>หมวดหมู่</Table.Th>
                <Table.Th>ความมั่นใจจาก AI</Table.Th>
                <Table.Th>สถานะ</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {cases.map((item) => {
                const caseStatusMeta = getStatusMeta(item.status);

                return (
                <Table.Tr key={item.id}>
                  <Table.Td>
                    <Text fw={700}>{item.customerName}</Text>
                    <Text c="dimmed" size="xs">
                      เคส {item.caseNumber}
                    </Text>
                  </Table.Td>
                  <Table.Td className="tableCellText">{item.originalText}</Table.Td>
                  <Table.Td>
                    <Badge variant="light">{item.category}</Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      <Progress
                        color={confidenceColor(item.aiConfidence)}
                        miw={72}
                        size="sm"
                        value={item.aiConfidence}
                      />
                      <Text fw={700} size="sm">
                        {item.aiConfidence}%
                      </Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={caseStatusMeta.color} variant="light">
                      {caseStatusMeta.label}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Button onClick={() => onOpenCase(item)} size="xs" variant="light">
                      เปิดเคส
                    </Button>
                  </Table.Td>
                </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </ScrollArea>
        {!isLoading && cases.length === 0 ? (
          <Paper bg="gray.0" mt="md" p="lg" radius="md">
            <Text fw={700}>ยังไม่มีเคสจาก backend</Text>
            <Text c="dimmed" size="sm">
              เมื่อมีข้อมูลจาก POST /webhooks/line รายการเคสจะแสดงในตารางนี้
            </Text>
          </Paper>
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
      setActionError("กรุณากรอกข้อความที่จะส่งให้ลูกค้า");
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

  const composeWithAi = async () => {
    if (actionState !== "idle") return;
    setActionState("rewriting");
    setActionError(undefined);
    setActionNotice(undefined);
    setAiMissingInformation([]);
    try {
      const draft = await onComposeAi(
        actionMode,
        actionMode === "CUSTOMER_REPLY" ? supportInstruction.trim() || undefined : undefined,
        actionMode === "REQUEST_MORE_INFO" ? moreInfoGoal.trim() || undefined : undefined,
      );
      if (draft.suggestedMessage.trim()) setReplyText(draft.suggestedMessage);
      setRequestInfoDraftMessageId(actionMode === "REQUEST_MORE_INFO" ? draft.rewrittenMessageId : undefined);
      setMoreInfoReason(draft.reason);
      setAiMissingInformation(actionMode === "CUSTOMER_REPLY" ? draft.missingInformation : []);
      setActionNotice("AI สร้างข้อความแล้ว กรุณาตรวจสอบและแก้ไขก่อนส่ง");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "AI ไม่สามารถสร้างข้อความได้ในขณะนี้ คุณยังสามารถพิมพ์ข้อความและส่งด้วยตนเองได้");
    } finally {
      setActionState("idle");
    }
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Box>
          <Title order={2}>
            เคส {item.caseNumber} · {item.customerName}
          </Title>
          <Text c="dimmed">line_user_id: {item.lineUserId} · ส่งเมื่อ {item.createdAt}</Text>
        </Box>
        <Box ta="right">
          <Badge color={currentStatusMeta.color} size="lg" variant="light">
            {statusLabel}
          </Badge>
          {isClosed && item.closedAt ? (
            <Text c="dimmed" mt={4} size="xs">
              ปิดเมื่อ {formatEventTime(item.closedAt)}{item.closedBy ? ` โดย ${item.closedBy}` : ""}
            </Text>
          ) : null}
        </Box>
      </Group>

      <Alert color="blue" icon={<AppIcon name="message" />} radius="md" variant="light">
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
            1) ข้อความต้นฉบับจากลูกค้า
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
            2) ผลวิเคราะห์โดย AI
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
          <Text c="dimmed" mt="sm" size="xs">
            ผลวิเคราะห์นี้เป็นการประเมินเบื้องต้นจาก AI ยังไม่ใช่การยืนยันสาเหตุที่แน่นอน
          </Text>
          <Text c="dimmed" mt="sm" size="xs">วิเคราะห์เสร็จเมื่อ: {formatEventTime(item.aiAnalyzedAt)}</Text>
        </Card>
      </SimpleGrid>

      <CaseConversation item={item} />

      <Card padding="lg" radius="md" withBorder>
        <Title order={3} mb="sm">ลำดับเวลาของเคส</Title>
        <Stack gap="xs">
          <Text size="sm">สร้างเคส: {formatEventTime(item.caseCreatedAt)}</Text>
          <Text size="sm">ส่งเข้า Microsoft Teams: {formatEventTime(item.teamsSentAt)}</Text>
          <Text size="sm">ทีม Tech ตอบกลับ: {formatEventTime(item.techRepliedAt)}</Text>
          <Text size="sm">ส่งคำตอบกลับ LINE: {formatEventTime(item.lineSentAt)}</Text>
          <Text size="sm">ยืนยันการส่ง LINE: {formatEventTime(item.lineDeliveredAt)}</Text>
          {item.closedAt ? <Text size="sm">ปิดเคส: {formatEventTime(item.closedAt)}{item.closedBy ? ` โดย ${item.closedBy}` : ""}</Text> : null}
        </Stack>
      </Card>

      <Card padding="lg" radius="md" withBorder>
        <Group align="flex-start" justify="space-between" mb="md">
          <Box>
            <Title order={3}>4) เธรดที่ส่งให้ทีม Tech Support ใน MS Teams</Title>
            <Text c="dimmed" size="sm">
              แสดงสิ่งที่ระบบส่งเข้า Teams และสถานะหลังทีมส่งคำตอบกลับ
            </Text>
          </Box>
          <Badge color={teamsMeta.color} variant="light">
            {teamsMeta.label}
          </Badge>
        </Group>

        <SimpleGrid cols={{ base: 1, xl: 2 }} spacing="lg">
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
                          <Text fw={800} size="sm">ตอบกลับลูกค้าทาง LINE</Text>
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
                      <Textarea
                        ref={replyTextareaRef}
                        autosize
                        label="ข้อความที่จะส่งให้ลูกค้า"
                        minRows={5}
                        mt="sm"
                        onChange={(event) => setReplyText(event.currentTarget.value)}
                        placeholder={actionMode === "REQUEST_MORE_INFO" ? "เช่น รบกวนแจ้งเวลาที่พบปัญหาและแนบภาพหน้าจอเพิ่มเติมนะคะ" : "พิมพ์ข้อความที่ต้องการส่งให้ลูกค้า"}
                        value={replyText}
                      />
                      <Paper className="caseMoreInfoGoalPanel" mt="sm" p="sm" radius="sm" withBorder>
                        <Text fw={700} size="sm">
                          {actionMode === "CUSTOMER_REPLY" ? "ให้ AI ช่วยร่างคำตอบลูกค้า" : "ระบุข้อมูลที่ต้องการขอเพิ่มเติม"}
                        </Text>
                        <Text c="dimmed" size="xs" mt={4}>
                          {actionMode === "CUSTOMER_REPLY"
                            ? "AI จะอ่านข้อความล่าสุดและประวัติในเคส เพื่อช่วยร่างคำตอบที่เหมาะสม"
                            : "AI จะดูบริบทของเคสและช่วยสร้างคำถาม โดยไม่ถามข้อมูลซ้ำ"}
                        </Text>
                        {actionMode === "CUSTOMER_REPLY" ? (
                          <Textarea
                            autosize
                            label="แนวทางที่ต้องการให้ AI ช่วยตอบ"
                            minRows={2}
                            mt="sm"
                            onChange={(event) => setSupportInstruction(event.currentTarget.value)}
                            placeholder="เช่น แนะนำให้ตรวจสอบสาย LAN และสถานะ Network Adapter"
                            value={supportInstruction}
                          />
                        ) : (
                          <TextInput
                            label="ระบุข้อมูลที่ต้องการขอเพิ่มเติม"
                            mt="sm"
                            onChange={(event) => setMoreInfoGoal(event.currentTarget.value)}
                            placeholder="เช่น ขอภาพหน้าจอ เวลาที่พบปัญหา หรือรุ่นอุปกรณ์"
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
                          {actionMode === "CUSTOMER_REPLY" ? "สร้างคำตอบด้วย AI" : "สร้างคำขอข้อมูลด้วย AI"}
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
                          {actionMode === "REQUEST_MORE_INFO" ? "เมื่อส่งแล้ว ระบบจะรอข้อมูลจากลูกค้าในเคสนี้" : "การส่งข้อความจะคงสถานะเคสเดิมไว้"}
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
                  {actionError ? <Alert color="red" mt="md" title="ดำเนินการไม่สำเร็จ">{actionError}</Alert> : null}
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

          <Stack gap="md">
            <Paper bg="blue.0" p="md" radius="md">
              <Group gap="sm" mb="xs">
                <ThemeIcon color="blue" radius="xl" variant="light">
                  <AppIcon name="message" />
                </ThemeIcon>
                <Text fw={800}>สถานะการดำเนินงาน</Text>
              </Group>
              <OperationStepper status={item.status} />
            </Paper>

            <SimpleGrid cols={{ base: 1, md: 2 }}>
              <Paper bg="gray.0" p="md" radius="md">
                <Text c="dimmed" fw={700} size="sm">
                  วิธีแก้ที่สกัดได้
                </Text>
                <Text>{item.status === "awaiting_tech" ? "ยังไม่มีข้อมูล เนื่องจากทีมยังไม่ตอบ" : item.supportSolution}</Text>
              </Paper>
              <Paper bg="gray.0" p="md" radius="md">
                <Text c="dimmed" fw={700} size="sm">
                  ข้อความที่จะส่งให้ลูกค้า
                </Text>
                <Text>{item.status === "awaiting_tech" ? "ยังไม่สร้างข้อความตอบกลับ" : item.customerReply}</Text>
              </Paper>
            </SimpleGrid>
          </Stack>
        </SimpleGrid>
      </Card>
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
          <Group justify="flex-end" mt="md">
            <Button color="red" onClick={() => void reviewSuggestion(item, "rejected")} variant="light">
              ไม่ใช่
            </Button>
            <Button onClick={() => void reviewSuggestion(item, "approved")}>
              ใช่ ใช้วิธีนี้
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
  onUpdateSettings,
  settings,
  solutions,
}: {
  logs: AutoAnswerLog[];
  onUpdateSettings: (input: { emergencyDisable?: boolean; enabled?: boolean }) => Promise<void>;
  settings: AutomationSettings | null;
  solutions: AutoAnswerSolution[];
}) {
  const enabled = settings?.enabled ?? false;
  const [automationNotice, setAutomationNotice] = useState("Auto-answer พร้อมทำงานตาม guardrail ที่กำหนด");
  const [selectedLogSolution, setSelectedLogSolution] = useState<AutoAnswerLog | null>(null);

  const stopAutomationNow = async () => {
    await onUpdateSettings({ emergencyDisable: true });
    setAutomationNotice("ปิด auto-answer ทันทีแล้ว เคสใหม่จะกลับเข้าคิวทีม Tech Support");
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
        <Group justify="space-between">
          <Box>
            <Title order={3}>Guarded auto-answer</Title>
            <Text c="dimmed" size="sm">
              ใช้ threshold ทั้ง case_understanding_confidence และ case_discrimination_confidence
            </Text>
          </Box>
          <Switch
            checked={enabled}
            label={enabled ? "เปิดใช้งาน" : "ปิดใช้งาน"}
            onChange={(event) => {
              const nextEnabled = event.currentTarget.checked;
              void onUpdateSettings({ enabled: nextEnabled });
              setAutomationNotice(
                nextEnabled
                  ? "เปิด auto-answer แล้ว ระบบจะทำงานเฉพาะเคสที่ผ่าน confidence 2 ชั้น"
                  : "ปิด auto-answer แล้ว เคสใหม่จะกลับเข้าคิวทีม Tech Support",
              );
            }}
            size="md"
          />
        </Group>
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
        <Paper className="emergencyPanel" mt="lg" p="md" radius="md">
          <Flex align={{ base: "stretch", sm: "center" }} direction={{ base: "column", sm: "row" }} gap="md" justify="space-between">
            <Box>
              <Text c="red.8" fw={800}>หยุดการตอบอัตโนมัติ</Text>
              <Text c="dimmed" size="sm">
                ปิดทันทีและส่งเคสใหม่ทั้งหมดกลับเข้าคิวทีม Tech Support
              </Text>
            </Box>
            <Button color="red" leftSection={<AppIcon name="stop" />} onClick={() => void stopAutomationNow()}>
              ปิดทันที
            </Button>
          </Flex>
        </Paper>
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

      <Card padding="lg" radius="md" withBorder>
        <Title mb="md" order={3}>Auto-answer notification log</Title>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>เวลา</Table.Th>
              <Table.Th>ลูกค้า</Table.Th>
              <Table.Th>ข้อความที่ตอบ</Table.Th>
              <Table.Th>วิธีแก้</Table.Th>
              <Table.Th>Teams</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {logs.map((item) => (
              <Table.Tr key={item.id}>
                <Table.Td>{formatEventTime(item.time)}</Table.Td>
                <Table.Td>{item.customer}</Table.Td>
                <Table.Td>{item.answerText}</Table.Td>
                <Table.Td>
                  {item.solutionText ? (
                    <Button size="xs" variant="light" onClick={() => setSelectedLogSolution(item)}>
                      ดูวิธีแก้
                    </Button>
                  ) : (
                    <Text c="dimmed" size="sm">ไม่มีวิธีแก้ที่บันทึกไว้</Text>
                  )}
                </Table.Td>
                <Table.Td>
                  <Badge color="green" variant="light">
                    แจ้งแล้ว
                  </Badge>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        {logs.length === 0 ? (
          <Text c="dimmed" mt="md">
            ยังไม่มี auto-answer notification log จาก backend
          </Text>
        ) : null}
      </Card>
      <Modal
        centered
        onClose={() => setSelectedLogSolution(null)}
        opened={Boolean(selectedLogSolution)}
        title={`วิธีแก้ของ ${selectedLogSolution?.caseNumber ?? ""}`}
      >
        <Text style={{ whiteSpace: "pre-wrap" }}>
          {selectedLogSolution?.solutionText ?? "ไม่มีวิธีแก้ที่บันทึกไว้"}
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
  const [autoAnswerLogsState, setAutoAnswerLogsState] = useState<AutoAnswerLog[]>([]);
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

  const loadDashboardData = async () => {
    setIsLoadingDashboardData(true);

    const results = await Promise.allSettled([
      getConfidenceSuggestions(),
      getAnalyticsSummary(),
      getAutomationSettings(),
      getAutoAnswerSolutions(),
      getAutoAnswerLogs(),
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
    if (logs.status === "fulfilled") setAutoAnswerLogsState(logs.value);
    else failures.push("Automation logs");

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

  const handleOpenConfidence = () => {
    setActiveTab("confidence");
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

  const handleReopenCase = async () => {
    if (!selectedCase) return;
    const updatedCase = await reopenCase(selectedCase.id);
    setSelectedCase(updatedCase);
    setCases((current) => current.map((item) => (item.id === updatedCase.id ? updatedCase : item)));
  };

  const handleReviewSuggestion = async (item: ConfidenceSuggestion, result: "approved" | "rejected") => {
    await reviewConfidenceSuggestion({ caseId: item.caseId, id: item.id, result });
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
                onOpenConfidence={handleOpenConfidence}
                onRefresh={() => {
                  void loadCases();
                }}
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
                logs={autoAnswerLogsState}
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



