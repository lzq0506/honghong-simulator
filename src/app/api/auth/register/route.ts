import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/storage/database/pg-client";
import {
  createSessionToken,
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
} from "@/lib/auth/session";

const USERNAME_PATTERN = /^[\w一-龥]{2,20}$/;

interface UserRow {
  id: number;
  username: string;
}

export async function POST(request: NextRequest) {
  let body: { username?: unknown; password?: unknown };
  try {
    body = (await request.json()) as { username?: unknown; password?: unknown };
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!USERNAME_PATTERN.test(username)) {
    return NextResponse.json(
      { error: "用户名需为 2~20 位中文、字母、数字或下划线" },
      { status: 400 },
    );
  }
  if (password.length < 6 || password.length > 50) {
    return NextResponse.json(
      { error: "密码需为 6~50 位" },
      { status: 400 },
    );
  }

  try {
    const existing = await query<{ id: number }>(
      "SELECT id FROM users WHERE username = $1",
      [username],
    );
    if (existing.length > 0) {
      return NextResponse.json(
        { error: "这个用户名已经被注册啦" },
        { status: 409 },
      );
    }

    const hash = await bcrypt.hash(password, 10);
    let user: UserRow;
    try {
      const rows = await query<UserRow>(
        "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username",
        [username, hash],
      );
      user = rows[0];
    } catch (e) {
      // 并发注册撞唯一约束的兜底
      if (typeof e === "object" && e !== null && "code" in e && e.code === "23505") {
        return NextResponse.json(
          { error: "这个用户名已经被注册啦" },
          { status: 409 },
        );
      }
      throw e;
    }

    const response = NextResponse.json({ user });
    response.cookies.set(
      SESSION_COOKIE,
      createSessionToken(user),
      SESSION_COOKIE_OPTIONS,
    );
    return response;
  } catch (e) {
    const message = e instanceof Error ? e.message : "注册失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
