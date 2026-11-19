"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Crown, Heart, Loader2 } from "lucide-react";
import type { SessionUser } from "@/lib/auth/session";

interface LeaderboardEntry {
  rank: number;
  user_id: number;
  username: string;
  final_score: number;
  played_at: string;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  const date = sameYear
    ? `${d.getMonth() + 1}月${d.getDate()}日`
    : `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${date} ${hh}:${mm}`;
}

const TOP3_COLORS = ["bg-[#E8A33D] text-white", "bg-[#9AA5B1] text-white", "bg-[#C08552] text-white"];

export function RankingScreen({
  authUser,
  onBack,
}: {
  authUser: SessionUser | null;
  onBack: () => void;
}) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/game/leaderboard")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "加载失败");
        if (!cancelled) setEntries(data.entries);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "网络错误");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="relative flex items-center justify-center border-b border-line bg-cream/95 px-4 py-3 backdrop-blur">
        <button
          onClick={onBack}
          aria-label="返回"
          className="absolute left-2 flex h-9 w-9 items-center justify-center rounded-full text-ink transition-colors hover:bg-cream-deep"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-bold text-ink">哄女友排行榜</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading && (
          <div className="flex flex-col items-center gap-2 py-20 text-ink-soft">
            <Loader2 className="h-6 w-6 animate-spin text-blush" />
            <p className="text-sm">加载中…</p>
          </div>
        )}

        {!loading && error && (
          <div className="py-20 text-center text-sm text-blush-deep">{error}</div>
        )}

        {!loading && !error && entries.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cream-deep">
              <Crown className="h-8 w-8 text-ink-soft" />
            </div>
            <p className="text-sm font-medium text-ink">还没有人上榜</p>
            <p className="text-xs text-ink-soft">通关一局哄哄模拟器，第一个名字就是你的</p>
          </div>
        )}

        {!loading && !error && entries.length > 0 && (
          <div className="space-y-2">
            <p className="px-1 pb-1 text-xs text-ink-soft">按历史最高好感度排名 · 前 20 名</p>
            {entries.map((entry) => {
              const isMe = authUser !== null && entry.user_id === authUser.id;
              return (
                <div
                  key={entry.user_id}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-3 ${
                    isMe
                      ? "border-blush bg-note shadow-sm"
                      : "border-line bg-white"
                  }`}
                >
                  {entry.rank <= 3 ? (
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${TOP3_COLORS[entry.rank - 1]}`}
                    >
                      {entry.rank}
                    </span>
                  ) : (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cream-deep text-xs font-bold text-ink-soft">
                      {entry.rank}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
                      <span className="truncate">{entry.username}</span>
                      {isMe && (
                        <span className="shrink-0 rounded-full bg-blush px-1.5 py-0.5 text-[10px] font-bold text-white">
                          我
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-soft">{formatTime(entry.played_at)} 达成</p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 text-sm font-bold text-blush-deep">
                    <Heart className="h-4 w-4 fill-heart text-heart" />
                    {entry.final_score}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
