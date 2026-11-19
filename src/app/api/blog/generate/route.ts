import { NextRequest, NextResponse } from "next/server";
import { invokeLLM } from "@/lib/game/llm-stream";
import { query } from "@/storage/database/pg-client";

const SYSTEM_PROMPT = `你是一位恋爱沟通专栏作者，给年轻男生写"恋爱沟通技巧"公众号文章。

写作要求：
- 全中文，口语化、有温度，像一个懂女生的朋友在聊天，不说教、不灌鸡汤
- 结合具体场景和对话示例，给出可以直接照着用的方法
- 不评价任何一方，不搞性别对立，不贬低女生也不贬低男生
- 正文用 markdown 格式：用"##"小标题分 3~4 段，对话示例用">"引用，要点可用列表
- 正文 800~1200 字

输出要求（严格遵守）：
- 只输出一个 JSON 对象，不要输出任何其他内容，不要用 markdown 代码块包裹
- 格式：{"title":"20字以内的标题","summary":"50字以内的一句话摘要","content":"markdown格式的正文"}
- JSON 必须是合法的一行：字符串值里的换行一律转义为 \\n，禁止出现裸换行`;

interface GeneratedArticle {
  title?: string;
  summary?: string;
  content?: string;
}

/** LLM 输出的 JSON 字符串值里常含未转义的裸换行/制表符，按 JSON 规范转义后再解析 */
function escapeControlCharsInStrings(json: string): string {
  let result = "";
  let inString = false;
  let escaped = false;
  for (const ch of json) {
    if (escaped) {
      result += ch;
      escaped = false;
      continue;
    }
    if (ch === "\\" && inString) {
      result += ch;
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      result += ch;
      continue;
    }
    if (inString && (ch === "\n" || ch === "\r" || ch === "\t")) {
      result += ch === "\n" ? "\\n" : ch === "\r" ? "\\r" : "\\t";
      continue;
    }
    result += ch;
  }
  return result;
}

function parseArticle(text: string): GeneratedArticle {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  try {
    return JSON.parse(cleaned) as GeneratedArticle;
  } catch {
    return JSON.parse(escapeControlCharsInStrings(cleaned)) as GeneratedArticle;
  }
}

export async function POST(request: NextRequest) {
  let topic = "";
  try {
    const body = (await request.json()) as { topic?: unknown };
    if (typeof body.topic === "string") {
      topic = body.topic.trim().slice(0, 50);
    }
  } catch {
    // 无 body 或非法 JSON 时按"随机主题"处理
  }

  try {
    const userPrompt = topic
      ? `请写一篇恋爱沟通技巧文章，主题是：${topic}`
      : `请从以下方向中任选一个你最有话说的角度，写一篇恋爱沟通技巧文章（不要写成大全，聚焦一个点讲透）：吵架后的破冰、听懂女生的弦外之音、道歉的正确姿势、忘了纪念日怎么补救、异地恋的安全感、怎么夸到点子上、她说"没事"的时候该怎么办、深夜emo时怎么陪她聊`;

    const content = await invokeLLM([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ]);

    const article = parseArticle(content);
    if (!article.title || !article.summary || !article.content) {
      throw new Error("AI 生成的文章格式不完整，请重试");
    }

    const rows = await query<{
      id: number;
      title: string;
      summary: string;
      created_at: string;
    }>(
      "INSERT INTO blog_posts (title, summary, content) VALUES ($1, $2, $3) RETURNING id, title, summary, created_at",
      [article.title.slice(0, 200), article.summary.slice(0, 500), article.content],
    );

    return NextResponse.json({ post: rows[0] });
  } catch (e) {
    const message = e instanceof Error ? e.message : "生成文章失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
