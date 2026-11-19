import { NextRequest } from "next/server";
import { getScenario } from "@/lib/game/scenarios";
import { buildStartMessages } from "@/lib/game/prompts";
import { streamLLMResponse } from "@/lib/game/llm-stream";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  let scenarioId = "";
  try {
    const body = (await request.json()) as { scenarioId?: unknown };
    scenarioId =
      typeof body.scenarioId === "string" ? body.scenarioId.trim() : "";
  } catch {
    return Response.json({ error: "请求格式不对，请重试" }, { status: 400 });
  }

  const scenario = getScenario(scenarioId);
  if (!scenario) {
    return Response.json({ error: "场景不存在，请刷新重试" }, { status: 400 });
  }

  return streamLLMResponse(
    request,
    buildStartMessages(scenario),
    "她那边信号不太好",
  );
}
