"use client";

import { useState } from "react";
import Image from "next/image";
import {
  GraduationCap,
  Heart,
  Map,
  RotateCcw,
  Share2,
} from "lucide-react";
import type { Scenario } from "@/lib/game/scenarios";
import type { GameResult } from "./play-screen";
import { downloadShareCard } from "@/lib/game/share-card";

const RATING_LABEL = { sweet: "甜甜蜜蜜", barely: "勉强原谅" } as const;

export function ResultScreen({
  scenario,
  result,
  onRetry,
  onHome,
}: {
  scenario: Scenario;
  result: GameResult;
  onRetry: () => void;
  onHome: () => void;
}) {
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  const ratingLabel = result.rating ? RATING_LABEL[result.rating] : null;
  const quote = result.win
    ? result.rating === "sweet"
      ? "她笑了：「这次就原谅你啦。」"
      : "她叹了口气：「下不为例。」"
    : "她说：「我们都冷静一段时间吧。」";

  const handleShare = async () => {
    setSharing(true);
    setShareError(null);
    try {
      await downloadShareCard({
        scenarioTitle: scenario.title,
        win: result.win,
        ratingLabel: ratingLabel ?? "",
        rounds: result.rounds,
        favor: result.favor,
      });
    } catch {
      setShareError("分享卡生成失败，再试一次");
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center px-6 py-12 text-center">
      <div className="rise-enter flex w-full flex-col items-center">
        <Image
          src={result.win ? "/avatar-happy.jpeg" : "/avatar-cold.jpeg"}
          alt={result.win ? "和好的女友" : "心冷的女友"}
          width={144}
          height={144}
          priority
          className={`h-36 w-36 rounded-full border-4 object-cover shadow-md ${
            result.win ? "border-bubble-me" : "border-line"
          }`}
        />

        <h1
          className={`mt-6 text-4xl font-black ${
            result.win ? "text-blush" : "text-blush-deep"
          }`}
        >
          {result.win ? "哄回来了！" : "被分手了…"}
        </h1>

        {ratingLabel && (
          <span
            className={`mt-3 rounded-full px-4 py-1.5 text-sm font-black ${
              result.rating === "sweet"
                ? "bg-bubble-me text-blush"
                : "bg-note text-note-ink"
            }`}
          >
            结局评级 · {ratingLabel}
          </span>
        )}

        <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
          {quote}
        </p>

        <div className="mt-8 grid w-full grid-cols-3 gap-2.5">
          <div className="rounded-xl bg-white px-2 py-3.5 shadow-sm">
            <p className="text-2xl font-black tabular-nums text-ink">
              {result.rounds}
            </p>
            <p className="mt-1 text-xs text-ink-soft">用了几轮</p>
          </div>
          <div className="rounded-xl bg-white px-2 py-3.5 shadow-sm">
            <p className="flex items-center justify-center gap-1 text-2xl font-black tabular-nums text-ink">
              <Heart className="h-4 w-4 fill-heart text-heart" aria-hidden />
              {result.favor}
            </p>
            <p className="mt-1 text-xs text-ink-soft">好感度</p>
          </div>
          <div className="rounded-xl bg-white px-2 py-3.5 shadow-sm">
            <p className="flex items-center justify-center gap-1 text-2xl font-black text-ink">
              <GraduationCap
                className={`h-5 w-5 ${result.win ? "text-blush" : "text-ink-soft"}`}
                aria-hidden
              />
            </p>
            <p className="mt-1 text-xs text-ink-soft">
              毕业考{result.win ? "通过" : "未通过"}
            </p>
          </div>
        </div>

        {result.win && result.rating === "barely" && (
          <p className="mt-4 text-xs leading-relaxed text-ink-soft">
            好感度攒到 20 以上，结局就是「甜甜蜜蜜」——意外事件别错过。
          </p>
        )}

        <div className="mt-8 w-full space-y-2.5">
          <button
            type="button"
            onClick={() => void handleShare()}
            disabled={sharing}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blush px-4 py-3.5 text-[15px] font-bold text-white shadow-sm transition-colors active:bg-blush-deep disabled:opacity-60"
          >
            <Share2 className="h-4 w-4" aria-hidden />
            {sharing ? "正在生成…" : "生成分享卡"}
          </button>
          {shareError && (
            <p className="text-sm text-blush-deep">{shareError}</p>
          )}
          <button
            type="button"
            onClick={onRetry}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 py-3.5 text-[15px] font-bold text-ink shadow-sm active:bg-cream-deep"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            再哄一次
          </button>
          <button
            type="button"
            onClick={onHome}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 py-3.5 text-[15px] font-bold text-ink shadow-sm active:bg-cream-deep"
          >
            <Map className="h-4 w-4" aria-hidden />
            返回图鉴
          </button>
        </div>
      </div>
    </div>
  );
}
