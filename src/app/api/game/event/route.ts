import { NextRequest } from "next/server";
import { getScenario } from "@/lib/game/scenarios";
import { buildEventMessages, type HistoryItem } from "@/lib/game/prompts";
import { streamLLMResponse } from "@/lib/game/llm-stream";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_HISTORY = 12;
const MAX_TEXT_LEN = 300;

function sanitizeHistory(raw: unknown): HistoryItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(-MAX_HISTORY)
    .map((item): HistoryItem | null => {
      if (typeof item !== "object" || item === null) return null;
      const h = item as Record<string, unknown>;
      if (typeof h.her !== "string" || typeof h.me !== "string") return null;
      return {
        her: h.her.slice(0, MAX_TEXT_LEN),
        me: h.me.slice(0, MAX_TEXT_LEN),
        correct: h.correct === true,
      };
    })
    .filter((h): h is HistoryItem => h !== null);
}

export async function POST(request: NextRequest) {
  let body: { scenarioId?: unknown; anger?: unknown; history?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "请求格式不对，请重试" }, { status: 400 });
  }

  const scenario = getScenario(
    typeof body.scenarioId === "string" ? body.scenarioId : "",
  );
  if (!scenario) {
    return Response.json({ error: "场景不存在，请刷新重试" }, { status: 400 });
  }

  const anger = Number(body.anger);
  if (!Number.isFinite(anger) || anger < 0 || anger > 100) {
    return Response.json({ error: "愤怒值状态异常" }, { status: 400 });
  }

  return streamLLMResponse(
    request,
    buildEventMessages({
      scenario,
      anger,
      history: sanitizeHistory(body.history),
    }),
    "意外事件溜走了",
  );
}
