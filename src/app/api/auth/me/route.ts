import { NextRequest, NextResponse } from "next/server";
import { query } from "@/storage/database/pg-client";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const sessionUser = verifySessionToken(token);
  if (!sessionUser) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    // 回查数据库确认用户仍存在（被删用户会话立即失效）
    const rows = await query<{ id: number; username: string }>(
      "SELECT id, username FROM users WHERE id = $1",
      [sessionUser.id],
    );
    const data = rows[0];
    if (!data) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    return NextResponse.json({
      user: { id: data.id, username: data.username },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "查询失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
