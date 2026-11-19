import { NextResponse } from "next/server";
import { query } from "@/storage/database/pg-client";

interface BlogPostRow {
  id: number;
  title: string;
  summary: string;
  content: string;
  created_at: string;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) {
    return NextResponse.json({ error: "无效的文章 id" }, { status: 400 });
  }

  try {
    const rows = await query<BlogPostRow>(
      "SELECT id, title, summary, content, created_at FROM blog_posts WHERE id = $1",
      [numId],
    );
    const post = rows[0];
    if (!post) {
      return NextResponse.json({ error: "文章不存在" }, { status: 404 });
    }
    return NextResponse.json({ post });
  } catch (e) {
    const message = e instanceof Error ? e.message : "查询文章失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
