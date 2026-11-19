"use client";

import { Flame, Heart } from "lucide-react";

export type MoodKey = "cold" | "furious" | "sulking" | "soft" | "happy";

export interface Mood {
  key: MoodKey;
  label: string;
  avatar: string;
  color: string;
}

export function moodOfAnger(anger: number): Mood {
  if (anger >= 90) {
    return {
      key: "cold",
      label: "分手边缘",
      avatar: "/avatar-cold.jpeg",
      color: "#B92C47",
    };
  }
  if (anger >= 70) {
    return {
      key: "furious",
      label: "炸毛中",
      avatar: "/avatar-furious.jpeg",
      color: "#D9435F",
    };
  }
  if (anger >= 50) {
    return {
      key: "sulking",
      label: "生闷气",
      avatar: "/avatar-sulking.jpeg",
      color: "#D9435F",
    };
  }
  if (anger > 0) {
    return {
      key: "soft",
      label: "气消了大半",
      avatar: "/avatar-sulking.jpeg",
      color: "#E8A0AD",
    };
  }
  return {
    key: "happy",
    label: "和好了",
    avatar: "/avatar-happy.jpeg",
    color: "#D9435F",
  };
}

/** 聊天页顶栏下方的紧凑游戏 HUD：火焰 + 细愤怒条 + 数字 + 情绪标签 + 好感爱心 */
export function AngerMeter({
  anger,
  favor,
}: {
  anger: number;
  favor: number;
}) {
  const mood = moodOfAnger(anger);
  return (
    <div className="flex items-center gap-2">
      <Flame
        className="h-3.5 w-3.5 shrink-0"
        style={{ color: mood.color }}
        aria-hidden
      />
      <div
        className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-valuenow={anger}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`愤怒值 ${anger}`}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${anger}%`, backgroundColor: mood.color }}
        />
      </div>
      <span
        className="shrink-0 text-xs font-black tabular-nums"
        style={{ color: mood.color }}
      >
        {anger}
      </span>
      <span
        className="shrink-0 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold"
        style={{ color: mood.color }}
      >
        {mood.label}
      </span>
      <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-white px-1.5 py-0.5">
        <Heart
          key={favor}
          className="h-3 w-3 fill-heart text-heart animate-heartbeat"
          aria-hidden
        />
        <span className="text-xs font-bold tabular-nums text-ink">{favor}</span>
      </span>
    </div>
  );
}
