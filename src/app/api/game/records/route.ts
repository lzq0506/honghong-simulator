import { NextRequest, NextResponse } from "next/server";
import { query } from "@/storage/database/pg-client";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

interface SaveRecordBody {
  scenario?: unknown;
  finalScore?: unknown;
  result?: unknown;
}

interface GameRecordRow {
  id: number;
  scenario: string;
  final_score: number;
  result: string;
  played_at: string;
}

/** POST：保存一条游戏记录（仅登录用户，user_id 取自服务端会话，前端不可伪造） */
export async function POST(request: NextRequest) {
  const sessionUser = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!sessionUser) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  let body: SaveRecordBody;
  try {
    body = (await request.json()) as SaveRecordBody;
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const scenario = typeof body.scenario === "string" ? body.scenario.trim().slice(0, 100) : "";
  const finalScore =
    typeof body.finalScore === "number" && Number.isFinite(body.finalScore)
      ? Math.round(body.finalScore)
      : NaN;
  const result = body.result === "通关" || body.result === "失败" ? body.result : "";

  if (!scenario) {
    return NextResponse.json({ error: "场景名称不能为空" }, { status: 400 });
  }
  if (!Number.isFinite(finalScore)) {
    return NextResponse.json({ error: "分数格式不正确" }, { status: 400 });
  }
  if (!result) {
    return NextResponse.json({ error: "结果只能为「通关」或「失败」" }, { status: 400 });
  }

  try {
    const rows = await query<GameRecordRow>(
      "INSERT INTO game_records (user_id, scenario, final_score, result) VALUES ($1, $2, $3, $4) RETURNING id, scenario, final_score, result, played_at",
      [sessionUser.id, scenario, finalScore, result],
    );
    return NextResponse.json({ record: rows[0] });
  } catch (e) {
    const message = e instanceof Error ? e.message : "保存失败，请稍后再试";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** GET：当前登录用户的游戏记录列表（按游戏时间倒序） */
export async function GET(request: NextRequest) {
  const sessionUser = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!sessionUser) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const records = await query<GameRecordRow>(
      "SELECT id, scenario, final_score, result, played_at FROM game_records WHERE user_id = $1 ORDER BY played_at DESC LIMIT 100",
      [sessionUser.id],
    );
    return NextResponse.json({ records });
  } catch (e) {
    const message = e instanceof Error ? e.message : "查询失败，请稍后再试";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
