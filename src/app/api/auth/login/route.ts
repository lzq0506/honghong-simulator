import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/storage/database/pg-client";
import {
  createSessionToken,
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
} from "@/lib/auth/session";

interface UserWithPasswordRow {
  id: number;
  username: string;
  password: string;
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

  if (!username || !password) {
    return NextResponse.json(
      { error: "请输入用户名和密码" },
      { status: 400 },
    );
  }

  try {
    const rows = await query<UserWithPasswordRow>(
      "SELECT id, username, password FROM users WHERE username = $1",
      [username],
    );
    const data = rows[0];
    // 不区分"用户不存在"和"密码错误"，防止用户名枚举
    if (!data) {
      return NextResponse.json(
        { error: "用户名或密码不正确" },
        { status: 401 },
      );
    }

    const ok = await bcrypt.compare(password, data.password);
    if (!ok) {
      return NextResponse.json(
        { error: "用户名或密码不正确" },
        { status: 401 },
      );
    }

    const user = { id: data.id, username: data.username };
    const response = NextResponse.json({ user });
    response.cookies.set(
      SESSION_COOKIE,
      createSessionToken(user),
      SESSION_COOKIE_OPTIONS,
    );
    return response;
  } catch (e) {
    const message = e instanceof Error ? e.message : "登录失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
