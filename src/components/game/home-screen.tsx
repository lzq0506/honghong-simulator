"use client";

import { useState } from "react";
import {
  BookOpen,
  ChevronRight,
  CircleUserRound,
  Contact,
  Heart,
  Loader2,
  Lock,
  LogOut,
  MessageCircle,
  Trophy,
} from "lucide-react";
import type { SessionUser } from "@/lib/auth/session";
import { SCENARIOS, type Scenario } from "@/lib/game/scenarios";
import {
  loadProgress,
  type ScenarioRecord,
} from "@/lib/game/storage";

interface Props {
  authUser: SessionUser | null;
  onLogin: () => void;
  onRegister: () => void;
  onLogout: () => void;
  onOpenRanking: () => void;
  onOpenProfile: () => void;
  onOpenBlog: () => void;
  onStart: (scenario: (typeof SCENARIOS)[number]) => void;
}

function ScenarioRow({
  scenario,
  record,
  unlocked,
  index,
  onStart,
}: {
  scenario: Scenario;
  record: ScenarioRecord;
  unlocked: boolean;
  index: number;
  onStart: () => void;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <button
      onClick={() => unlocked && onStart()}
      disabled={!unlocked}
      className={`flex w-full items-center gap-3 border-b border-[var(--line)] bg-white px-4 py-3 text-left transition last:border-b-0 ${
        unlocked ? "active:bg-[var(--cream-deep)]" : "opacity-55"
      }`}
    >
      <div className="relative shrink-0">
        {!imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/avatar-sulking.png"
            alt=""
            onError={() => setImgError(true)}
            className="h-12 w-12 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--blush)] text-lg font-bold text-white">
            她
          </div>
        )}
        {!unlocked && (
          <span className="absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow">
            <Lock className="h-3 w-3 text-[var(--ink-soft)]" />
          </span>
        )}
        {unlocked && !record.won && (
          <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-[var(--blush)]" />
        )}
        {record.won && (
          <span className="absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow">
            <Heart className="h-3 w-3 fill-[var(--heart)] text-[var(--heart)]" />
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="flex items-center gap-1.5 truncate text-[15px] font-medium text-[var(--ink)]">
            女朋友
            {record.won && (
              <Heart className="h-3.5 w-3.5 shrink-0 fill-[var(--heart)] text-[var(--heart)]" />
            )}
          </span>
          <span className="shrink-0 text-[11px] text-[var(--ink-soft)]">
            {scenario.time}
          </span>
        </div>
        <p className="mt-0.5 truncate text-[13px] text-[var(--ink-soft)]">
          {unlocked
            ? scenario.preview
            : `第 ${index + 1} 关 · 哄好前一关解锁`}
        </p>
      </div>
    </button>
  );
}

const TABS = [
  { label: "微信", icon: MessageCircle },
  { label: "通讯录", icon: Contact },
  { label: "发现", icon: BookOpen },
  { label: "我", icon: CircleUserRound },
];

export function HomeScreen({
  authUser,
  onLogin,
  onRegister,
  onLogout,
  onOpenRanking,
  onOpenProfile,
  onOpenBlog,
  onStart,
}: Props) {
  const progress = loadProgress();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await onLogout();
    setLoggingOut(false);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--cream)]">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-10 border-b border-[var(--line)] bg-[#EDEDED]/95 backdrop-blur">
        <div className="flex h-12 items-center justify-between px-4">
          <span className="flex items-center gap-1.5 text-[16px] font-bold text-[var(--ink)]">
            <Heart className="h-4.5 w-4.5 fill-[var(--blush)] text-[var(--blush)]" />
            哄哄模拟器
          </span>
          {authUser ? (
            <div className="flex items-center gap-2.5">
              <span className="flex max-w-32 items-center gap-1 text-sm font-medium text-[var(--ink)]">
                <CircleUserRound className="h-4 w-4 shrink-0 text-[var(--blush)]" />
                <span className="truncate">{authUser.username}</span>
              </span>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex items-center gap-1 rounded-full border border-[var(--line)] bg-white px-2.5 py-1 text-xs text-[var(--ink-soft)] active:scale-95"
              >
                {loggingOut ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <LogOut className="h-3 w-3" />
                )}
                退出
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={onLogin}
                className="rounded-full px-3 py-1.5 text-sm font-medium text-[var(--ink)] active:bg-[var(--line)]"
              >
                登录
              </button>
              <button
                onClick={onRegister}
                className="rounded-full bg-[var(--blush)] px-3.5 py-1.5 text-sm font-bold text-white shadow-[0_2px_8px_rgba(217,63,63,0.3)] active:scale-95"
              >
                注册
              </button>
            </div>
          )}
        </div>
      </header>

      {/* 会话列表 */}
      <div className="flex-1 overflow-y-auto">
        {/* 哄哄小助手（系统说明会话） */}
        <div className="flex items-center gap-3 border-b border-[var(--line)] bg-white/60 px-4 py-3 opacity-80">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--note-border)]">
            <Heart className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-medium text-[var(--ink)]">
              哄哄小助手
            </p>
            <p className="mt-0.5 truncate text-[13px] text-[var(--ink-soft)]">
              玩法：把她发来的气话聊回去，愤怒值降到 0 就和好
            </p>
          </div>
        </div>

        {/* 排行榜入口 */}
        <button
          onClick={onOpenRanking}
          className="flex w-full items-center gap-3 border-b border-[var(--line)] bg-white px-4 py-3 text-left active:bg-[var(--cream-deep)]"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--heart-soft)]">
            <Trophy className="h-5 w-5 text-[var(--heart-deep)]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-medium text-[var(--ink)]">
              哄女友排行榜
            </p>
            <p className="mt-0.5 truncate text-[13px] text-[var(--ink-soft)]">
              看看谁最会哄她
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-[var(--ink-soft)]" />
        </button>

        <p className="px-4 pt-4 pb-2 text-xs font-medium tracking-widest text-[var(--ink-soft)]">
          她的消息
        </p>

        <div>
          {SCENARIOS.map((s, i) => (
            <ScenarioRow
              key={s.id}
              scenario={s}
              index={i}
              record={
                progress.records[s.id] ?? {
                  won: false,
                  bestRating: null,
                  plays: 0,
                }
              }
              unlocked={i < progress.unlockedCount}
              onStart={() => onStart(s)}
            />
          ))}
        </div>

        <p className="px-4 py-6 text-center text-xs leading-5 text-[var(--ink-soft)]">
          愤怒值降到 0 就和好，升到 100 就分手
          <br />
          连续答对两次会触发意外事件
        </p>
      </div>

      {/* 底部 tabbar（发现→博客，我→个人页） */}
      <nav className="flex border-t border-[var(--line)] bg-[#F7F7F7] pb-[env(safe-area-inset-bottom)]">
        {TABS.map((tab) =>
          tab.label === "发现" || tab.label === "我" ? (
            <button
              key={tab.label}
              onClick={tab.label === "发现" ? onOpenBlog : onOpenProfile}
              className="flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[var(--ink-soft)] transition active:scale-95"
            >
              <tab.icon className="h-6 w-6" />
              <span className="text-[10px]">{tab.label}</span>
            </button>
          ) : (
            <span
              key={tab.label}
              className={`flex flex-1 flex-col items-center gap-0.5 py-1.5 ${
                tab.label === "微信"
                  ? "text-[#07C160]"
                  : "text-[var(--ink-soft)]"
              }`}
            >
              <tab.icon className="h-6 w-6" />
              <span className="text-[10px]">{tab.label}</span>
            </span>
          ),
        )}
      </nav>
    </div>
  );
}
