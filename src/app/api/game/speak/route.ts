import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

/** 魅力女友音色（豆包语音合成大模型 2.0） */
const SPEAKER = "zh_female_meilinvyou_saturn_bigtts";
const MAX_TEXT_LEN = 300;
const TTS_URL = "https://openspeech.bytedance.com/api/v3/tts/unidirectional";

/** 情绪语速映射（百分比；V3 接口 speech_rate 取值 [-50,100]，furious 快、cold 慢） */
const MOOD_SPEECH_RATE: Record<string, number> = {
  furious: 20,
  cold: -10,
  happy: 5,
  sulking: 0,
  soft: 0,
};

interface VolcTTSChunk {
  /** 0 = 数据行；20000000 = 结束行；其他 = 业务错误 */
  code?: number;
  message?: string;
  /** base64 编码的 mp3 音频分片 */
  data?: string;
}

export async function POST(request: NextRequest) {
  let text = "";
  let mood = "";
  try {
    const body = (await request.json()) as { text?: unknown; mood?: unknown };
    text = typeof body.text === "string" ? body.text.trim() : "";
    mood = typeof body.mood === "string" ? body.mood : "";
  } catch {
    return NextResponse.json({ error: "请求格式不对，请重试" }, { status: 400 });
  }

  if (!text) {
    return NextResponse.json({ error: "没有要说的内容" }, { status: 400 });
  }
  if (text.length > MAX_TEXT_LEN) {
    text = text.slice(0, MAX_TEXT_LEN);
  }

  const apiKey = process.env.TTS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "语音服务未配置" }, { status: 500 });
  }

  try {
    const res = await fetch(TTS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
        "X-Api-Resource-Id": "seed-tts-2.0",
        "X-Api-Request-Id": crypto.randomUUID(),
      },
      body: JSON.stringify({
        req_params: {
          text,
          speaker: SPEAKER,
          audio_params: {
            format: "mp3",
            sample_rate: 24000,
            speech_rate: MOOD_SPEECH_RATE[mood] ?? 0,
          },
        },
      }),
    });

    if (!res.ok) {
      console.error("[speak] TTS 失败:", res.status, await res.text());
      return NextResponse.json(
        { error: "语音合成失败，请再试一次" },
        { status: 500 },
      );
    }

    // 响应为 HTTP chunked：多行 JSON（NDJSON），逐行收集 base64 分片直到结束行
    const raw = await res.text();
    let audio = "";
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let chunk: VolcTTSChunk;
      try {
        chunk = JSON.parse(trimmed) as VolcTTSChunk;
      } catch {
        continue;
      }
      if (chunk.code === 20000000) break; // 结束行
      if (chunk.code !== 0) {
        console.error("[speak] TTS 业务错误:", chunk.code, chunk.message);
        return NextResponse.json(
          { error: "语音合成失败，请再试一次" },
          { status: 500 },
        );
      }
      audio += chunk.data ?? "";
    }

    if (!audio) {
      console.error("[speak] TTS 未返回音频");
      return NextResponse.json(
        { error: "语音合成失败，请再试一次" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      audioUri: `data:audio/mp3;base64,${audio}`,
    });
  } catch (error) {
    console.error("[speak] TTS 异常:", error);
    return NextResponse.json(
      { error: "语音合成失败，请再试一次" },
      { status: 500 },
    );
  }
}
