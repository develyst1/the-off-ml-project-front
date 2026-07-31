"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ActionIcon, Alert, Badge, Box, Button, Card, Checkbox, Divider, Group, Modal, ScrollArea, SimpleGrid, Stack, Text, Textarea, TextInput, Title, Tooltip } from "@mantine/core";
import { useRouter } from "next/navigation";
import { composeInboxCaseDraft, composeInboxReply, getInboxUser, getInboxUsers, openInboxCase, sendInboxReply } from "@/services/offMlProject.service";
import type { InboxUser } from "@/types/app/offMlProject";
import { AppIcon } from "@/components/common";

function formatTime(value?: string) {
  if (!value) return "ยังไม่มีข้อความ";
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function toDateTimeInput(value: Date) {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function endOfSelectedMinute(value: string) {
  const date = new Date(value);
  date.setSeconds(59, 999);
  return date;
}

type CaseComposeAction = "DRAFT" | "REWRITE";

export default function InboxWorkspace({ initialUserId }: { initialUserId?: string }) {
  const router = useRouter();
  const [users, setUsers] = useState<InboxUser[]>([]);
  const [selected, setSelected] = useState<InboxUser | null>(null);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [isAiRewriting, setIsAiRewriting] = useState(false);
  const [isAiDrafting, setIsAiDrafting] = useState(false);
  const [isDraftConfirmOpen, setIsDraftConfirmOpen] = useState(false);
  const [isOpenCaseModalOpen, setIsOpenCaseModalOpen] = useState(false);
  const [caseTitle, setCaseTitle] = useState("");
  const [caseDescription, setCaseDescription] = useState("");
  const [caseFrom, setCaseFrom] = useState("");
  const [caseTo, setCaseTo] = useState("");
  const [selectedCaseMessageIds, setSelectedCaseMessageIds] = useState<string[]>([]);
  const [isCaseComposing, setIsCaseComposing] = useState(false);
  const [activeCaseComposeAction, setActiveCaseComposeAction] = useState<CaseComposeAction>();
  const [hasGeneratedCaseDraft, setHasGeneratedCaseDraft] = useState(false);
  const [generatedCaseDraftMessageIds, setGeneratedCaseDraftMessageIds] = useState<string[]>([]);
  const [isCaseFormDirty, setIsCaseFormDirty] = useState(false);
  const [caseComposeConfirmation, setCaseComposeConfirmation] = useState<CaseComposeAction | null>(null);
  const [error, setError] = useState<string>();
  const [showAllCases, setShowAllCases] = useState(false);
  const selectedCustomerIdRef = useRef<string | undefined>(undefined);

  const load = useCallback(async (customerId?: string) => {
    setIsLoading(true);
    setError(undefined);
    try {
      const nextUsers = await getInboxUsers();
      setUsers(nextUsers);
      const selectedId = customerId ?? selectedCustomerIdRef.current;
      const nextSelected = selectedId ? nextUsers.find((item) => item.customer.id === selectedId) : undefined;
      selectedCustomerIdRef.current = nextSelected?.customer.id ?? nextUsers[0]?.customer.id;
      setSelected(nextSelected ?? nextUsers[0] ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "โหลด Inbox ไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(initialUserId), 0);
    return () => window.clearTimeout(timer);
  }, [initialUserId, load]);

  const selectUser = async (user: InboxUser) => {
    selectedCustomerIdRef.current = user.customer.id;
    setSelected(user);
    setShowAllCases(false);
    router.push(`/?tab=inbox&user=${encodeURIComponent(user.customer.id)}`);
    try {
      setSelected(await getInboxUser(user.customer.id));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "โหลดบทสนทนาไม่สำเร็จ");
    }
  };

  const handleSend = async () => {
    if (!selected || !draft.trim() || isSending) return;
    setIsSending(true);
    try {
      const updated = await sendInboxReply(selected.customer.id, draft.trim());
      setSelected(updated);
      setUsers((current) => current.map((item) => item.customer.id === updated.customer.id ? updated : item));
      setDraft("");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "ส่งข้อความไม่สำเร็จ");
    } finally {
      setIsSending(false);
    }
  };

  const openCaseModal = () => {
    if (!selected) return;
    const latestAt = Math.max(...selected.messages.map((message) => new Date(message.createdAt).getTime()));
    const to = new Date(latestAt);
    setCaseFrom(toDateTimeInput(new Date(latestAt - 24 * 60 * 60 * 1000)));
    setCaseTo(toDateTimeInput(to));
    setCaseTitle("");
    setCaseDescription("");
    setSelectedCaseMessageIds([]);
    setHasGeneratedCaseDraft(false);
    setGeneratedCaseDraftMessageIds([]);
    setIsCaseFormDirty(false);
    setCaseComposeConfirmation(null);
    setIsOpenCaseModalOpen(true);
  };

  const handleOpenCase = async () => {
    if (!selected || isOpening) return;
    if (caseRangeError) {
      setError(caseRangeError);
      return;
    }
    const hasManualCaseDetails = Boolean(caseTitle.trim() && caseDescription.trim());
    if (!hasManualCaseDetails) {
      setError("กรุณากรอกหัวข้อปัญหาและรายละเอียดให้ครบก่อนเปิดเคส");
      return;
    }
    setIsOpening(true);
    try {
      const created = await openInboxCase(selected.customer.id, {
        title: caseTitle.trim(),
        description: caseDescription.trim(),
        from: new Date(caseFrom).toISOString(),
        to: endOfSelectedMinute(caseTo).toISOString(),
        selectedMessageIds: selectedMessagesInCaseRange.length > 0 ? selectedMessagesInCaseRange.map((message) => message.id) : undefined,
      });
      setIsOpenCaseModalOpen(false);
      router.push(`/cases/${encodeURIComponent(created.id)}`);
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : "เปิดเคสไม่สำเร็จ");
    } finally {
      setIsOpening(false);
    }
  };

  const messagesInCaseRange = selected?.messages.filter((message) => {
    const timestamp = new Date(message.createdAt).getTime();
    const from = caseFrom ? new Date(caseFrom).getTime() : Number.NEGATIVE_INFINITY;
    const to = caseTo ? endOfSelectedMinute(caseTo).getTime() : Number.POSITIVE_INFINITY;
    return timestamp >= from && timestamp <= to;
  }) ?? [];
  const fromTimestamp = caseFrom ? new Date(caseFrom).getTime() : Number.NaN;
  const toTimestamp = caseTo ? new Date(caseTo).getTime() : Number.NaN;
  const caseRangeError = Number.isNaN(fromTimestamp) || Number.isNaN(toTimestamp)
    ? "กรุณาเลือกวันและเวลาให้ครบ"
    : fromTimestamp > toTimestamp
      ? "วันสิ้นสุดต้องไม่อยู่ก่อนวันเริ่มต้น"
      : toTimestamp - fromTimestamp > 14 * 24 * 60 * 60 * 1000
        ? "เลือกช่วงข้อมูลสนทนาได้ไม่เกิน 14 วัน"
        : undefined;
  const selectedMessagesInCaseRange = messagesInCaseRange.filter((message) => selectedCaseMessageIds.includes(message.id));
  const selectedMessageIds = selectedMessagesInCaseRange.map((message) => message.id).sort();
  const selectionChangedSinceDraft = hasGeneratedCaseDraft
    && (selectedMessageIds.length !== generatedCaseDraftMessageIds.length || selectedMessageIds.some((id, index) => id !== generatedCaseDraftMessageIds[index]));

  const toggleCaseMessage = (messageId: string, checked: boolean) => {
    setSelectedCaseMessageIds((current) => {
      const next = checked ? [...new Set([...current, messageId])] : current.filter((id) => id !== messageId);
      return next;
    });
  };

  const runCaseCompose = async (action: CaseComposeAction) => {
    if (!selected || isCaseComposing) return;
    setIsCaseComposing(true);
    setActiveCaseComposeAction(action);
    setError(undefined);
    try {
      const result = await composeInboxCaseDraft(selected.customer.id, {
        mode: action,
        selectedMessageIds: selectedMessagesInCaseRange.map((message) => message.id),
        title: caseTitle,
        description: caseDescription,
      });
      setCaseTitle(result.title);
      setCaseDescription(result.description);
      setHasGeneratedCaseDraft(true);
      setGeneratedCaseDraftMessageIds([...selectedMessagesInCaseRange.map((message) => message.id)].sort());
      setIsCaseFormDirty(false);
      setCaseComposeConfirmation(null);
    } catch (composeError) {
      setError(composeError instanceof Error ? composeError.message : "AI ช่วยจัดทำข้อมูลเคสไม่สำเร็จ");
    } finally {
      setIsCaseComposing(false);
      setActiveCaseComposeAction(undefined);
    }
  };

  const requestCaseCompose = (action: CaseComposeAction) => {
    if (isCaseFormDirty) {
      setCaseComposeConfirmation(action);
      return;
    }
    void runCaseCompose(action);
  };

  const handleRewrite = async () => {
    if (!selected || !draft.trim() || isAiRewriting) return;
    setIsAiRewriting(true);
    setError(undefined);
    try {
      const result = await composeInboxReply(selected.customer.id, { mode: "REWRITE", rawSupportMessage: draft });
      setDraft(result.message);
    } catch (composeError) {
      setError(composeError instanceof Error ? composeError.message : "AI ช่วยเรียบเรียงข้อความไม่สำเร็จ ข้อความเดิมยังคงอยู่");
    } finally {
      setIsAiRewriting(false);
    }
  };

  const generateDraft = async () => {
    if (!selected || isAiDrafting) return;
    setIsAiDrafting(true);
    setError(undefined);
    try {
      const result = await composeInboxReply(selected.customer.id, { mode: "DRAFT" });
      setDraft(result.message);
      setIsDraftConfirmOpen(false);
    } catch (composeError) {
      setError(composeError instanceof Error ? composeError.message : "AI สร้างร่างคำตอบไม่สำเร็จ");
    } finally {
      setIsAiDrafting(false);
    }
  };

  const handleDraftRequest = () => {
    if (draft.trim()) {
      setIsDraftConfirmOpen(true);
      return;
    }
    void generateDraft();
  };

  const filteredUsers = users.filter((user) => `${user.customer.displayName ?? "ไม่ทราบชื่อ"} ${user.latestMessage?.text ?? ""}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));

  const getNewMessageCount = (user: InboxUser) => {
    let count = 0;
    for (const message of [...user.messages].reverse()) {
      if (message.senderType === "TECH") break;
      if (message.senderType !== "CUSTOMER") return undefined;
      count += 1;
    }
    return count > 0 ? count : undefined;
  };

  const sortedCases = selected
    ? [...selected.cases].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    : [];
  const visibleCases = showAllCases ? sortedCases : sortedCases.slice(0, 6);

  return (
    <Stack gap="lg">
      <Modal opened={isDraftConfirmOpen} onClose={() => setIsDraftConfirmOpen(false)} title="แทนที่ข้อความปัจจุบัน?" centered>
        <Stack>
          <Text size="sm">AI จะสร้างร่างข้อความใหม่แทนข้อความที่กำลังพิมพ์อยู่</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setIsDraftConfirmOpen(false)}>ยกเลิก</Button>
            <Button onClick={() => void generateDraft()} loading={isAiDrafting}>สร้างร่างใหม่</Button>
          </Group>
        </Stack>
      </Modal>
      <Modal opened={caseComposeConfirmation !== null} onClose={() => setCaseComposeConfirmation(null)} title="แทนที่ข้อมูลเคสปัจจุบัน?" centered>
        <Stack>
          <Text size="sm">AI จะสร้างข้อมูลเคสใหม่และแทนที่หัวข้อปัญหากับรายละเอียดที่กำลังกรอกอยู่</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setCaseComposeConfirmation(null)}>ยกเลิก</Button>
            <Button onClick={() => caseComposeConfirmation && void runCaseCompose(caseComposeConfirmation)} loading={isCaseComposing}>แทนที่ด้วยข้อมูลจาก AI</Button>
          </Group>
        </Stack>
      </Modal>
      <Modal opened={isOpenCaseModalOpen} onClose={() => !isOpening && setIsOpenCaseModalOpen(false)} title="เปิดเคส" centered size="xl" closeOnClickOutside={!isOpening}>
        <Stack gap="md">
          <Text c="dimmed" size="sm">กรอกข้อมูลเคส เลือกข้อความจากแชท หรือใช้ทั้งสองอย่างร่วมกันได้</Text>
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput type="datetime-local" label="ตั้งแต่วันที่" value={caseFrom} max={caseTo || undefined} onChange={(event) => setCaseFrom(event.currentTarget.value)} />
            <TextInput type="datetime-local" label="ถึงวันที่" value={caseTo} min={caseFrom || undefined} onChange={(event) => setCaseTo(event.currentTarget.value)} />
          </SimpleGrid>
          <Text c="dimmed" size="xs">เลือกข้อความสนทนาเพื่อใช้เป็นข้อมูลประกอบเคสได้ครั้งละไม่เกิน 14 วัน</Text>
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
            <Stack gap="sm">
              <TextInput label="หัวข้อปัญหา" placeholder="ระบุหัวข้อปัญหาโดยสรุป" value={caseTitle} onChange={(event) => { setCaseTitle(event.currentTarget.value); setIsCaseFormDirty(true); }} />
              <Textarea autosize minRows={6} maxRows={10} label="รายละเอียด" placeholder="อธิบายรายละเอียดของปัญหาให้ชัดเจน เพื่อให้ทีมตรวจสอบได้รวดเร็วขึ้น" value={caseDescription} onChange={(event) => { setCaseDescription(event.currentTarget.value); setIsCaseFormDirty(true); }} />
              <Tooltip label="ปรับข้อความฝั่งซ้ายให้อ่านง่ายและกระชับ" withArrow>
                <Button
                  variant="light"
                  size="xs"
                  leftSection={<AppIcon name="brain" size={15} />}
                  loading={activeCaseComposeAction === "REWRITE"}
                  disabled={isCaseComposing || (!(caseTitle.trim() || caseDescription.trim()) && selectedMessagesInCaseRange.length === 0)}
                  onClick={() => requestCaseCompose("REWRITE")}
                >
                  {activeCaseComposeAction === "REWRITE" ? "กำลังเรียบเรียง..." : "ช่วยเรียบเรียงข้อมูลที่กรอก"}
                </Button>
              </Tooltip>
              <Text c="dimmed" size="xs">กรอกหัวข้อและรายละเอียดให้ครบเพื่อเปิดเคสจากข้อมูลที่ทีม Tech ระบุเอง</Text>
            </Stack>
            <Stack gap="xs">
              <Group justify="space-between">
                <Text fw={600} size="sm">เลือกข้อความจากแชท</Text>
                <Badge color="blue" variant="light">เลือกแล้ว {selectedMessagesInCaseRange.length}</Badge>
              </Group>
              <Tooltip label="สร้างหัวข้อและรายละเอียดจากข้อความที่เลือก" withArrow>
                <Button
                  size="xs"
                  variant="outline"
                  leftSection={<AppIcon name="sparkles" size={15} />}
                  loading={activeCaseComposeAction === "DRAFT"}
                  disabled={isCaseComposing || selectedMessagesInCaseRange.length === 0}
                  onClick={() => requestCaseCompose("DRAFT")}
                >
                  {activeCaseComposeAction === "DRAFT" ? "กำลังสร้างข้อมูล..." : "สร้างข้อมูลเคสจากแชท"}
                </Button>
              </Tooltip>
              {selectionChangedSinceDraft ? <Alert color="yellow" variant="light" py="xs">ข้อความที่เลือกมีการเปลี่ยนแปลง กรุณาสร้างข้อมูลเคสใหม่เพื่ออัปเดตเนื้อหา</Alert> : null}
              <ScrollArea h={330} type="auto">
                <Stack gap="xs" pr="sm">
                  {messagesInCaseRange.length === 0 ? <Text c="dimmed" size="sm" py="xl" ta="center">ไม่พบข้อความในช่วงเวลาที่เลือก</Text> : null}
                  {messagesInCaseRange.map((message) => (
                    <Card key={message.id} withBorder padding="sm" radius="md">
                      <Group align="flex-start" gap="sm" wrap="nowrap">
                        <Checkbox aria-label={`เลือกข้อความ ${formatTime(message.createdAt)}`} checked={selectedCaseMessageIds.includes(message.id)} onChange={(event) => toggleCaseMessage(message.id, event.currentTarget.checked)} />
                        <Box style={{ minWidth: 0, flex: 1 }}>
                          <Group justify="space-between" gap="xs" wrap="nowrap"><Badge color={message.senderType === "CUSTOMER" ? "blue" : "gray"} variant="light" size="sm">{message.senderType === "CUSTOMER" ? "ผู้ใช้งาน" : "ทีม Tech"}</Badge><Text c="dimmed" size="xs">{formatTime(message.createdAt)}</Text></Group>
                          <Text mt={4} size="sm" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{message.text}</Text>
                        </Box>
                      </Group>
                    </Card>
                  ))}
                </Stack>
              </ScrollArea>
            </Stack>
          </SimpleGrid>
          {caseRangeError ? <Alert color="red" variant="light">{caseRangeError}</Alert> : null}
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={() => setIsOpenCaseModalOpen(false)} disabled={isOpening}>ยกเลิก</Button>
            <Button onClick={() => void handleOpenCase()} loading={isOpening} disabled={Boolean(caseRangeError) || !(caseTitle.trim() && caseDescription.trim())}>เปิดเคส</Button>
          </Group>
          {!(caseTitle.trim() && caseDescription.trim()) ? <Text c="dimmed" size="xs" ta="right">กรุณากรอกหัวข้อปัญหาและรายละเอียดให้ครบก่อนเปิดเคส</Text> : null}
        </Stack>
      </Modal>
      <Group justify="space-between">
        <Box><Title order={2}>ผู้ใช้งาน</Title><Text c="dimmed" size="sm">ผู้ใช้งานที่ติดต่อเข้ามาทาง LINE และยังไม่จำเป็นต้องเปิดเคส</Text></Box>
        <Button variant="light" onClick={() => void load()}>รีเฟรช</Button>
      </Group>
      {error ? <Alert color="red" title="เกิดข้อผิดพลาด" withCloseButton onClose={() => setError(undefined)}>{error}</Alert> : null}
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" style={{ alignItems: "start" }}>
        <Card withBorder radius="md" padding="md" style={{ alignSelf: "start", minHeight: 0, minWidth: 0 }}>
          <Group justify="space-between" mb="md"><Title order={4}>รายการผู้ใช้งาน</Title><Badge color="blue" variant="light">{filteredUsers.length} รายการ</Badge></Group>
          <TextInput label="ค้นหา" placeholder="ชื่อผู้ใช้งานหรือข้อความล่าสุด" value={search} onChange={(event) => setSearch(event.currentTarget.value)} mb="sm" />
          <ScrollArea mah={560} type="auto">
            <Stack gap="xs">
              {isLoading ? <Text c="dimmed">กำลังโหลดข้อมูล...</Text> : null}
              {!isLoading && filteredUsers.length === 0 ? <Text c="dimmed" py="xl" ta="center">ยังไม่มีผู้ใช้งานที่ติดต่อเข้ามา</Text> : null}
              {filteredUsers.map((user) => (
                <Button key={user.customer.id} variant={selected?.customer.id === user.customer.id ? "light" : "subtle"} color="blue" justify="space-between" h="auto" p="sm" onClick={() => void selectUser(user)} styles={{ inner: { justifyContent: "space-between" } }}>
                  <Box ta="left"><Group gap="xs"><Text fw={600}>{user.customer.displayName ?? "ไม่ทราบชื่อ"}</Text>{getNewMessageCount(user) ? <Badge color="cyan" size="xs" variant="light">{getNewMessageCount(user) === 1 ? "ข้อความใหม่" : `ใหม่ ${getNewMessageCount(user)}`}</Badge> : null}</Group><Text c="dimmed" lineClamp={1} size="xs">{user.latestMessage?.text ?? "ยังไม่มีข้อความ"}</Text></Box>
                  <Text c="dimmed" size="xs">{formatTime(user.latestMessage?.createdAt)}</Text>
                </Button>
              ))}
            </Stack>
          </ScrollArea>
        </Card>
        <Card withBorder radius="md" padding="md" style={{ alignSelf: "start", minHeight: 0 }}>
          {!selected ? <Text c="dimmed" ta="center" py="xl">เลือกผู้ใช้งานเพื่อดูบทสนทนา</Text> : (
            <Stack style={{ minWidth: 0 }}>
              <Group justify="space-between"><Box><Title order={4}>{selected.customer.displayName ?? "ไม่ทราบชื่อ"}</Title><Text c="dimmed" size="xs">สถานะ: ข้อความเข้า / รอพิจารณา</Text></Box><Button onClick={openCaseModal}>เปิดเคส</Button></Group>
              <Divider />
              <ScrollArea h={420} type="auto" style={{ minHeight: 0, minWidth: 0 }}>
                <Stack gap="sm" style={{ minWidth: 0 }}>
                  {selected.messages.length === 0 ? <Text c="dimmed" py="xl" ta="center">ไม่พบประวัติการสนทนาในช่วง 14 วันที่ผ่านมา</Text> : null}
                  {selected.messages.map((message) => <Box key={message.id} style={{ alignSelf: message.senderType === "CUSTOMER" ? "flex-start" : "flex-end", maxWidth: "85%", minWidth: 0, overflowWrap: "anywhere", wordBreak: "break-word" }}><PaperMessage sender={message.senderType} text={message.text} at={message.createdAt} /></Box>)}
                </Stack>
              </ScrollArea>
              <Group gap="xs" align="end" wrap="wrap">
                <Textarea
                  autosize
                  flex={1}
                  label="ข้อความตอบกลับทาง LINE"
                  minRows={1}
                  maxRows={6}
                  placeholder="พิมพ์ข้อความ"
                  value={draft}
                  onChange={(event) => setDraft(event.currentTarget.value)}
                  onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void handleSend(); } }}
                  rightSection={(
                    <Tooltip label={draft.trim() ? "ช่วยเรียบเรียงข้อความ" : "พิมพ์ข้อความก่อนใช้ AI ช่วยเรียบเรียง"} withArrow>
                      <ActionIcon aria-label="ช่วยเรียบเรียงข้อความ" color="blue" variant="light" disabled={!draft.trim() || isAiRewriting} loading={isAiRewriting} onClick={() => void handleRewrite()}>
                        <AppIcon name="brain" size={16} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                />
                <Button variant="outline" leftSection={<AppIcon name="sparkles" size={15} />} onClick={handleDraftRequest} loading={isAiDrafting}>สร้างร่างคำตอบ</Button>
                <Button onClick={() => void handleSend()} loading={isSending} disabled={!draft.trim()}>ส่ง</Button>
              </Group>
              <Divider />
              <Title order={5}>รายการเคส</Title>
              {sortedCases.length === 0 ? <Text c="dimmed" size="sm">ยังไม่มีรายการเคส</Text> : <>
                <Stack gap="xs">{visibleCases.map((item) => <Button key={item.id} variant="light" justify="space-between" onClick={() => router.push(`/cases/${encodeURIComponent(item.id)}`)}>{item.caseNumber}<Badge color="gray">{item.status}</Badge></Button>)}</Stack>
                {sortedCases.length > 6 ? <Button size="xs" variant="subtle" onClick={() => setShowAllCases((current) => !current)}>{showAllCases ? "ย่อรายการเคส" : `ดูเคสทั้งหมด (${sortedCases.length})`}</Button> : null}
              </>}
            </Stack>
          )}
        </Card>
      </SimpleGrid>
    </Stack>
  );
}

function PaperMessage({ sender, text, at }: { sender: "CUSTOMER" | "TECH"; text: string; at: string }) {
  return <Box bg={sender === "CUSTOMER" ? "blue.0" : "gray.0"} p="sm" style={{ borderRadius: 10 }}><Text size="sm" style={{ whiteSpace: "pre-wrap" }}>{text}</Text><Text c="dimmed" size="xs" mt={4}>{sender === "CUSTOMER" ? "ผู้ใช้งาน" : "ทีม Tech"} · {formatTime(at)}</Text></Box>;
}
