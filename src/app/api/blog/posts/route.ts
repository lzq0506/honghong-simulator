import { NextResponse } from "next/server";
import { query } from "@/storage/database/pg-client";

interface BlogPostMetaRow {
  id: number;
  title: string;
  summary: string;
  created_at: string;
}

export async function GET() {
  try {
    const posts = await query<BlogPostMetaRow>(
      "SELECT id, title, summary, created_at FROM blog_posts ORDER BY created_at DESC LIMIT 50",
    );
    return NextResponse.json({ posts });
  } catch (e) {
    const message = e instanceof Error ? e.message : "查询文章列表失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
