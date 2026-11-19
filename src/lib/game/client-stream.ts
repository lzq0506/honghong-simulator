const DATA_MARKER = "<<<DATA>>>";

export interface ParsedStream {
  /** <<<DATA>>> 之前的可见文本 */
  text: string;
  /** <<<DATA>>> 之后的 JSON 数据，解析失败为 null */
  data: Record<string, unknown> | null;
}

export interface StreamReadResult {
  full: ParsedStream;
  error: string | null;
}

/**
 * 读取游戏 SSE 流：data: {"content": "..."} 逐块累积，
 * onText 回调只回传 <<<DATA>>> 之前的可见部分（打字机效果）。
 */
export async function readGameStream(
  response: Response,
  onText: (visible: string) => void,
): Promise<StreamReadResult> {
  if (!response.ok || !response.body) {
    let message = "网络开小差了，请再试一次";
    try {
      const json = (await response.json()) as { error?: string };
      if (json.error) message = json.error;
    } catch {
      /* 保留默认提示 */
    }
    return { full: { text: "", data: null }, error: message };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";
  let error: string | null = null;

  const emit = () => {
    const idx = fullText.indexOf(DATA_MARKER);
    onText(idx === -1 ? fullText : fullText.slice(0, idx));
  };

  const handleLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) return;
    const payload = trimmed.slice(5).trim();
    if (payload === "[DONE]") return;
    try {
      const obj = JSON.parse(payload) as { content?: string; error?: string };
      if (obj.error) {
        error = obj.error;
      } else if (obj.content) {
        fullText += obj.content;
        emit();
      }
    } catch {
      /* 忽略不完整的数据块 */
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) handleLine(line);
  }
  if (buffer) handleLine(buffer);

  const idx = fullText.indexOf(DATA_MARKER);
  let text = fullText.trim();
  let data: Record<string, unknown> | null = null;
  if (idx !== -1) {
    text = fullText.slice(0, idx).trim();
    let raw = fullText.slice(idx + DATA_MARKER.length).trim();
    raw = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();
    try {
      data = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      data = null;
    }
  }

  return { full: { text, data }, error };
}
