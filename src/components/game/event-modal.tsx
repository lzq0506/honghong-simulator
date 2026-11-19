"use client";

import { Heart, Sparkles } from "lucide-react";

export interface EventOption {
  text: string;
  delta: number;
  result: string;
}

export interface EventData {
  text: string;
  options: EventOption[];
}

export function EventModal({
  event,
  picked,
  onPick,
  onClose,
}: {
  event: EventData;
  picked: EventOption | null;
  onPick: (opt: EventOption) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
      role="dialog"
      aria-modal="true"
      aria-label="意外事件"
    >
      <div className="rise-enter w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-bubble-me">
            <Sparkles className="h-4 w-4 text-blush" aria-hidden />
          </span>
          <span className="text-sm font-black tracking-wide text-blush">
            意外事件 · 攒好感的机会
          </span>
        </div>
        <p className="text-[15px] leading-relaxed text-ink">{event.text}</p>

        {!picked ? (
          <div className="mt-5 space-y-2.5">
            {event.options.map((opt) => (
              <button
                key={opt.text}
                type="button"
                onClick={() => onPick(opt)}
                className="w-full rounded-xl border border-line bg-cream px-4 py-3.5 text-left text-[15px] font-medium leading-relaxed text-ink transition-colors active:bg-bubble-me"
              >
                {opt.text}
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-5">
            <div className="rounded-xl bg-bubble-me px-4 py-3">
              <p className="text-[15px] leading-relaxed text-ink">
                {picked.result}
              </p>
              <p className="mt-2 flex items-center gap-1 text-sm font-bold text-blush">
                <Heart className="h-3.5 w-3.5 fill-blush" aria-hidden />
                好感度 +{picked.delta}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 w-full rounded-xl bg-blush px-4 py-3.5 text-[15px] font-bold text-white transition-colors active:bg-blush-deep"
            >
              继续哄
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
