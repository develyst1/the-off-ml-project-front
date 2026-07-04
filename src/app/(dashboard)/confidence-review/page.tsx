"use client";

import {
  Alert,
  Badge,
  Button,
  Group,
  Paper,
  RingProgress,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import { IconRobot } from "@tabler/icons-react";
import { useState } from "react";
import { CONFIDENCE_QUEUE } from "@/lib/mock-data";

export default function ConfidenceReviewPage() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [rejecting, setRejecting] = useState(false);
  const [mismatchReason, setMismatchReason] = useState("");

  const active = CONFIDENCE_QUEUE[activeIndex];

  function selectIndex(i: number) {
    setActiveIndex(i);
    setRejecting(false);
    setMismatchReason("");
  }

  function confirmYes() {
    // API-013 POST /integrations/teams/confirm-suggestion — tech_confirmed = true
    goToNext();
  }

  function submitMismatch() {
    // API-013 — tech_confirmed = false, persists mismatch_reason (UC-012)
    goToNext();
  }

  function goToNext() {
    setRejecting(false);
    setMismatchReason("");
    setActiveIndex((i) => (i + 1 < CONFIDENCE_QUEUE.length ? i + 1 : i));
  }

  return (
    <Stack gap="lg" maw={1100}>
      <Title order={2}>ยืนยันคำแนะนำของ AI (Confidence Suggestion Review)</Title>

      <Group align="flex-start" wrap="wrap" gap="lg">
        <Paper withBorder radius="md" p="sm" w={260}>
          <Text fw={700} size="sm" mb="sm">
            คิวรอยืนยัน ({CONFIDENCE_QUEUE.length}){" "}
            <Text span size="xs" c="dimmed">
              API-018
            </Text>
          </Text>
          <Stack gap="xs">
            {CONFIDENCE_QUEUE.map((item, i) => (
              <Paper
                key={item.caseId}
                withBorder
                radius="sm"
                p="xs"
                onClick={() => selectIndex(i)}
                style={{
                  cursor: "pointer",
                  borderColor: i === activeIndex ? "var(--mantine-color-blue-6)" : undefined,
                  borderWidth: i === activeIndex ? 2 : 1,
                }}
              >
                <Text size="sm" fw={700}>
                  {item.caseId} · {item.customerName}
                </Text>
                <Group justify="space-between" mt={4}>
                  <Text size="xs" c="dimmed">
                    {item.category}
                  </Text>
                  <Badge size="sm" color="green" variant="light">
                    {item.confidencePct}%
                  </Badge>
                </Group>
              </Paper>
            ))}
          </Stack>
          <Text size="xs" c="dimmed" mt="sm">
            จำนวนตรงกับ KPI &quot;รอยืนยัน AI แนะนำ&quot; ใน Case Inbox (TC-011)
          </Text>
        </Paper>

        <Stack style={{ flex: 1, minWidth: 320 }} gap="lg">
          <Alert variant="light" color="orange" icon={<IconRobot size={18} />}>
            ระบบพบว่าเคสนี้มีความคล้ายกับเคสเก่าที่เคยแก้แล้ว <b>สูงถึง {active.confidencePct}%</b>{" "}
            จึงขอให้ทีมช่วยยืนยันก่อนนำไปใช้จริง (เกณฑ์: ถามยืนยันเมื่อความมั่นใจ ≥ 90%) — เคส {activeIndex + 1}/
            {CONFIDENCE_QUEUE.length} ในคิว
          </Alert>

          <Paper withBorder radius="md" p="md">
            <Group justify="space-between" mb="md">
              <Text fw={700}>
                {active.caseId} · {active.customerName}
              </Text>
              <RingProgress
                size={64}
                thickness={7}
                roundCaps
                sections={[{ value: active.confidencePct, color: "green" }]}
                label={
                  <Text ta="center" size="xs" fw={700}>
                    {active.confidencePct}%
                  </Text>
                }
              />
            </Group>
            <SimpleGrid cols={{ base: 1, sm: 2 }} mb="md">
              <div>
                <Text size="xs" c="dimmed" mb={4}>
                  ข้อความลูกค้าแจ้งมา
                </Text>
                <Paper bg="gray.0" p="sm" radius="sm">
                  &ldquo;{active.customerMessage}&rdquo;
                </Paper>
              </div>
              <div>
                <Text size="xs" c="dimmed" mb={4}>
                  solution เดิมที่คาดว่าตรงกัน ({active.matchedSolutionCaseId})
                </Text>
                <Paper bg="gray.0" p="sm" radius="sm">
                  &ldquo;{active.matchedSolutionText}&rdquo;
                </Paper>
              </div>
            </SimpleGrid>

            <Paper bg="gray.1" p="sm" radius="sm" mb="md">
              <Text size="sm" fw={700} mb={4}>
                คำถามยืนยันที่ระบบจะส่งในห้อง MS Teams:
              </Text>
              <Text size="sm">
                &quot;ลูกค้า {active.customerName.replace("คุณ", "")} แจ้งว่า: {active.customerMessage}{" "}
                ระบบวิเคราะห์แล้วคาดว่า <b>เคสนี้ใช่เคสที่ต้องแก้โดย solution นี้ หรือไม่?</b> (อ้างอิงจาก{" "}
                {active.matchedSolutionCaseId})&quot;
              </Text>
            </Paper>

            {rejecting ? (
              <Stack gap="xs">
                <Textarea
                  label="อะไรที่ทำให้เคสนี้ต่างจาก solution ที่แนะนำ?"
                  placeholder='เช่น "ลูกค้าคนละกลุ่มปัญหา" / "อาการคล้ายกันแต่สาเหตุคนละอย่าง"'
                  value={mismatchReason}
                  onChange={(e) => setMismatchReason(e.currentTarget.value)}
                  minRows={2}
                  autosize
                />
                <Group justify="flex-end">
                  <Button variant="default" onClick={() => setRejecting(false)}>
                    ยกเลิก
                  </Button>
                  <Button color="red" disabled={!mismatchReason.trim()} onClick={submitMismatch}>
                    บันทึกเหตุผลและวิเคราะห์ใหม่
                  </Button>
                </Group>
              </Stack>
            ) : (
              <>
                <Group justify="flex-end">
                  <Button color="red" variant="light" onClick={() => setRejecting(true)}>
                    ✕ ไม่ใช่ ให้วิเคราะห์ใหม่
                  </Button>
                  <Button onClick={confirmYes}>✓ ใช่ ยืนยัน solution นี้</Button>
                </Group>
                <Text size="xs" c="dimmed" mt="xs">
                  กด &quot;ไม่ใช่&quot; แล้วระบบจะถามต่อทันทีว่าอะไรที่ทำให้เคสนี้ต่างจาก solution ที่แนะนำ เพื่อบันทึกเป็น{" "}
                  <code>mismatch_reason</code> และแก้ไขความเข้าใจของระบบ ไม่ใช่แค่ลดเปอร์เซ็นต์ความมั่นใจ
                </Text>
              </>
            )}
          </Paper>

          <Alert variant="light" color="blue" title="กติกาหน้าจอนี้ (UC-010/UC-011/UC-012)">
            ถ้าทีมกด &quot;ใช่&quot; ระบบจะ<b>เพิ่มความมั่นใจ</b>ให้ solution นี้สำหรับเคสแนวเดียวกันในอนาคต ถ้าทีมกด
            &quot;ไม่ใช่&quot; ระบบต้องขอให้ทีมระบุเหตุผล/จุดต่างทุกครั้ง เพื่อแก้ไขความเข้าใจไม่ให้จับคู่ผิดซ้ำอีก — เมื่อสะสมจนมั่นใจ{" "}
            <b>100% ต่อเนื่อง</b> และแยกเคสนี้จากเคสอื่นได้ชัดเจนแล้ว (ไม่มี &quot;ไม่ใช่&quot; ค้างอยู่) ระบบจะขอ{" "}
            <b>Approve จาก Tech Support เป็นรายหมวดหมู่</b> ก่อนเปิดใช้ auto-answer — ไม่ใช่การขอมติ/โหวตจากทั้งทีม
          </Alert>
        </Stack>
      </Group>
    </Stack>
  );
}
