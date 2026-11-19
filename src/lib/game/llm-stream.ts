import type { NextRequest } from "next/server";

// 方舟模型可用 ARK_MODEL 环境变量覆盖
const MODEL_ID = process.env.ARK_MODEL ?? "kimi-k3-1-pro-261024";
// Kimi 等思考模型会先输出 reasoning_content 再出正文，游戏场景直接禁用思考降低延迟
const DISABLE_THINKING = { thinking: { type: "disabled" } };
// 方舟对部分模型（如 Kimi K3.1 Pro）只允许固定 temperature 0.6
const TEMPERATURE = 0.6;
const ARK_CHAT_COMPLETIONS_URL =
  "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

type ChatMessage = { role: "system" | "user"; content: string };

function sseEncode(payload: Record<string, string>): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`);
}

/** 从方舟 SSE data 行解析增量文本；只取 delta.content（跳过思考内容与空块） */
function extractDeltaContent(data: string): string {
  if (!data || data === "[DONE]") return "";
  try {
    const parsed = JSON.parse(data) as {
      choices?: Array<{ delta?: { content?: string } }>;
    };
    return parsed.choices?.[0]?.delta?.content ?? "";
  } catch {
    return "";
  }
}

/** 非流式调用方舟对话接口，返回完整回复文本（博客生成用） */
export async function invokeLLM(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.ARK_API_KEY;
  if (!apiKey) {
    throw new Error("缺少 ARK_API_KEY 环境变量");
  }
  const res = await fetch(ARK_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL_ID,
      messages,
      temperature: TEMPERATURE,
      ...DISABLE_THINKING,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`方舟接口 ${res.status}: ${detail.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? "";
}

/**
 * 把方舟 LLM 流式输出透传为 SSE 响应：
 * data: {"content": "..."} 逐块推送，data: [DONE] 结束，出错时 data: {"error": "..."}
 */
export function streamLLMResponse(
  _request: NextRequest,
  messages: ChatMessage[],
  errorPrefix: string,
): Response {
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const apiKey = process.env.ARK_API_KEY;
        if (!apiKey) {
          throw new Error("缺少 ARK_API_KEY 环境变量");
        }

        const upstream = await fetch(ARK_CHAT_COMPLETIONS_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: MODEL_ID,
            messages,
            temperature: TEMPERATURE,
            stream: true,
            ...DISABLE_THINKING,
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const detail = await upstream.text().catch(() => "");
          throw new Error(`方舟接口 ${upstream.status}: ${detail.slice(0, 300)}`);
        }

        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const content = extractDeltaContent(trimmed.slice(5).trim());
            if (content) {
              controller.enqueue(sseEncode({ content }));
            }
          }
        }
        controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
      } catch (error) {
        console.error("[llm-stream]", errorPrefix, error);
        controller.enqueue(sseEncode({ error: `${errorPrefix}，请再试一次` }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
