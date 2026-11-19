import { NextResponse } from "next/server";
import { query } from "@/storage/database/pg-client";

interface LeaderboardRow {
  user_id: number;
  username: string;
  final_score: number;
  played_at: string;
}

// GET /api/game/leaderboard — 排行榜前 20（按每用户最高好感度排序，公开可读）
export async function GET() {
  try {
    const rows = await query<LeaderboardRow>(
      "SELECT user_id, username, final_score, played_at FROM leaderboard ORDER BY final_score DESC, played_at ASC LIMIT 20",
    );
    const entries = rows.map((row, index) => ({
      rank: index + 1,
      user_id: row.user_id,
      username: row.username,
      final_score: row.final_score,
      played_at: row.played_at,
    }));
    return NextResponse.json({ entries });
  } catch (e) {
    const message = e instanceof Error ? e.message : "查询排行榜失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
