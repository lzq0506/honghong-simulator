"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Gamepad2, Heart, HeartCrack, Loader2, UserRound } from "lucide-react";
import type { SessionUser } from "@/lib/auth/session";

interface GameRecord {
  id: number;
  scenario: string;
  final_score: number;
  result: string;
  played_at: string;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ProfileScreen({
  authUser,
  onBack,
  onLogin,
  onRegister,
}: {
  authUser: SessionUser | null;
  onBack: () => void;
  onLogin: () => void;
  onRegister: () => void;
}) {
  const [records, setRecords] = useState<GameRecord[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authUser) return;
    let cancelled = false;
    fetch("/api/game/records")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "加载失败");
        if (!cancelled) setRecords(data.records as GameRecord[]);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "网络错误，加载失败");
      });
    return () => {
      cancelled = true;
    };
  }, [authUser]);

  return (
    <div className="flex h-dvh flex-col bg-cream">
      <header className="flex items-center border-b border-line bg-cream/95 px-3 py-3 backdrop-blur">
        <button
          type="button"
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink transition-colors hover:bg-cream-deep"
          aria-label="返回首页"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 text-center text-base font-bold">我</h1>
        <div className="w-8" />
      </header>

      {!authUser ? (
        <div className="flex flex-1 flex-col items-center justify-center px-8 pb-20 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm">
            <UserRound className="h-9 w-9 text-blush" />
          </div>
          <p className="mt-5 text-base font-bold text-ink">你还没有登录</p>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            登录后可以保存每一局的游戏记录，随时回来查看自己的哄人战绩
          </p>
          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={onLogin}
              className="rounded-full bg-blush px-6 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(217,63,95,0.35)] transition-all hover:-translate-y-px hover:bg-blush-deep active:scale-95"
            >
              登录
            </button>
            <button
              type="button"
              onClick={onRegister}
              className="rounded-full border border-blush/40 bg-white px-6 py-2.5 text-sm font-bold text-blush transition-colors hover:bg-cream-deep active:scale-95"
            >
              注册
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pb-6">
          <div className="flex items-center gap-4 border-b border-line bg-white px-5 py-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-cream">
              <Heart className="h-7 w-7 fill-blush text-blush" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-bold text-ink">{authUser.username}</p>
              <p className="mt-0.5 text-xs text-ink-soft">哄哄模拟器玩家</p>
            </div>
          </div>

          <p className="px-5 pb-2 pt-4 text-xs font-medium text-ink-soft">游戏记录</p>

          {!records && !error && (
            <div className="flex items-center justify-center gap-2 py-14 text-sm text-ink-soft">
              <Loader2 className="h-4 w-4 animate-spin text-blush" />
              正在翻找你的战绩…
            </div>
          )}
          {error && <p className="py-14 text-center text-sm text-blush">{error}</p>}
          {records && records.length === 0 && (
            <div className="flex flex-col items-center px-8 py-14 text-center">
              <Gamepad2 className="h-8 w-8 text-ink-soft/60" />
              <p className="mt-3 text-sm text-ink-soft">还没有游戏记录</p>
              <p className="mt-1 text-xs text-ink-soft/70">完成一局哄哄挑战后，战绩会自动保存在这里</p>
            </div>
          )}
          {records && records.length > 0 && (
            <div className="overflow-hidden border-y border-line bg-white">
              {records.map((r, i) => {
                const won = r.result === "通关";
                return (
                  <div
                    key={r.id}
                    className={`flex items-center gap-3 px-5 py-3.5 ${i > 0 ? "border-t border-line" : ""}`}
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                        won ? "bg-heart/15" : "bg-cream-deep"
                      }`}
                    >
                      {won ? (
                        <Heart className="h-4.5 w-4.5 fill-heart text-heart" />
                      ) : (
                        <HeartCrack className="h-4.5 w-4.5 text-ink-soft" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-ink">{r.scenario}</p>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            won ? "bg-heart/15 text-blush" : "bg-cream-deep text-ink-soft"
                          }`}
                        >
                          {r.result}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-ink-soft">{formatTime(r.played_at)}</p>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-heart">好感度 +{r.final_score}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
