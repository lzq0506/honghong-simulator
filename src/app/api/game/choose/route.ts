import { NextRequest } from "next/server";
import { getScenario } from "@/lib/game/scenarios";
import { buildChooseMessages, type HistoryItem } from "@/lib/game/prompts";
import { streamLLMResponse } from "@/lib/game/llm-stream";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_HISTORY = 12;
const MAX_TEXT_LEN = 300;

interface ChooseBody {
  scenarioId?: unknown;
  anger?: unknown;
  round?: unknown;
  isExam?: unknown;
  choice?: unknown;
  history?: unknown;
}

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
  let body: ChooseBody;
  try {
    body = (await request.json()) as ChooseBody;
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

  const choice = typeof body.choice === "string" ? body.choice.trim() : "";
  if (!choice || choice.length > 100) {
    return Response.json({ error: "请选择一个回应" }, { status: 400 });
  }

  const round = Number.isInteger(body.round) && Number(body.round) > 0 ? Number(body.round) : 1;

  return streamLLMResponse(
    request,
    buildChooseMessages({
      scenario,
      anger,
      round,
      isExam: body.isExam === true,
      choice,
      history: sanitizeHistory(body.history),
    }),
    "她那边信号不太好",
  );
}
