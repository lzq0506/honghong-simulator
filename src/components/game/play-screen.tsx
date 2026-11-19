"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { ArrowLeft, Flame, GraduationCap, Heart, StickyNote, Volume2, VolumeX } from "lucide-react";
import type { Scenario } from "@/lib/game/scenarios";
import { readGameStream } from "@/lib/game/client-stream";
import { speakText, stopVoice } from "@/lib/game/voice";
import type { HistoryItem } from "@/lib/game/prompts";
import { AngerMeter, moodOfAnger, type MoodKey } from "./anger-meter";
import { EventModal, type EventData, type EventOption } from "./event-modal";

export interface GameResult {
  win: boolean;
  rating: "sweet" | "barely" | null;
  rounds: number;
  favor: number;
}

interface ChatMsg {
  id: number;
  role: "her" | "me" | "note";
  text: string;
}

/** 愤怒值降到这个数及以下，下一轮就是毕业考（30：教学轮更短、考试更早） */
const EXAM_THRESHOLD = 30;
/** 好感度达到这个数，和好结局评「甜甜蜜蜜」 */
const SWEET_FAVOR = 20;

/** 消息文本中属于"她的台词"的部分（开场消息含第三人称铺垫，只读最后一段） */
function voiceTextOf(text: string): string {
  const lines = text
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return lines[lines.length - 1] ?? text;
}

/** 按字数估算语音条秒数（中文语速约 5 字/秒） */
function estimateVoiceSeconds(text: string): number {
  return Math.min(59, Math.max(2, Math.round(text.length / 5)));
}

/** 微信风语音条：宽度随秒数，播放中喇叭闪烁 */
function VoiceBar({
  seconds,
  playing,
  onClick,
}: {
  seconds: number;
  playing: boolean;
  onClick: () => void;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={onClick}
        aria-label={`播放语音，约 ${seconds} 秒`}
        style={{ width: Math.min(180, 68 + seconds * 4) }}
        className="flex h-9 items-center rounded-2xl rounded-tl-sm bg-white px-3 shadow-sm active:bg-cream-deep"
      >
        <Volume2
          className={`h-4 w-4 ${playing ? "voice-playing text-blush" : "text-ink-soft"}`}
          aria-hidden
        />
      </button>
      <span className="text-xs tabular-nums text-ink-soft">{seconds}″</span>
    </span>
  );
}

function sanitizeOptions(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const opts = raw
    .filter((o): o is string => typeof o === "string" && o.trim().length > 0)
    .slice(0, 3);
  return opts.length === 3 ? opts : null;
}

function sanitizeEventOptions(raw: unknown): EventOption[] | null {
  if (!Array.isArray(raw)) return null;
  const opts = raw
    .map((o): EventOption | null => {
      if (typeof o !== "object" || o === null) return null;
      const r = o as Record<string, unknown>;
      if (typeof r.text !== "string" || typeof r.result !== "string") {
        return null;
      }
      const delta = Number(r.delta);
      return {
        text: r.text,
        result: r.result,
        delta: Number.isFinite(delta)
          ? Math.max(0, Math.min(20, Math.round(delta)))
          : 5,
      };
    })
    .filter((o): o is EventOption => o !== null)
    .slice(0, 2);
  return opts.length === 2 ? opts : null;
}

export function PlayScreen({
  scenario,
  onEnd,
  onExit,
}: {
  scenario: Scenario;
  onEnd: (result: GameResult) => void;
  onExit: () => void;
}) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [options, setOptions] = useState<string[]>([]);
  const [anger, setAnger] = useState(scenario.initialAnger);
  const [favor, setFavor] = useState(0);
  const [round, setRound] = useState(1);
  const [examNow, setExamNow] = useState(false);
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  const [busy, setBusy] = useState(false);
  const [typing, setTyping] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [pickedEvent, setPickedEvent] = useState<EventOption | null>(null);
  const [shake, setShake] = useState(false);
  const [ending, setEnding] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  /** 答对/答错时从愤怒条飘出的 delta 徽标 */
  const [feedback, setFeedback] = useState<{ id: number; delta: number } | null>(null);
  /** 正在播放语音的消息 id（联动语音条动画） */
  const [playingVoiceId, setPlayingVoiceId] = useState<number | null>(null);

  const idRef = useRef(0);
  const startedRef = useRef(false);
  const historyRef = useRef<HistoryItem[]>([]);
  const lastHerRef = useRef("");
  const lastActionRef = useRef<(() => void) | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const soundOnRef = useRef(true);

  const mood = moodOfAnger(anger);

  const patchMsg = useCallback((id: number, text: string) => {
    setMsgs((prev) =>
      prev.map((m) => (m.id === id ? { ...m, text } : m)),
    );
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, options, typing, errorMsg]);

  // 读取声音偏好；组件卸载时停止播放
  useEffect(() => {
    try {
      if (window.localStorage.getItem("honghong-sound") === "off") {
        soundOnRef.current = false;
        setSoundOn(false);
      }
    } catch {
      /* 存储不可用时保持默认开启 */
    }
    return () => stopVoice();
  }, []);

  const toggleSound = () => {
    const next = !soundOnRef.current;
    soundOnRef.current = next;
    setSoundOn(next);
    try {
      window.localStorage.setItem("honghong-sound", next ? "on" : "off");
    } catch {
      /* 忽略存储失败 */
    }
    if (!next) stopVoice();
  };

  /** 播放某条她消息的语音，并联动对应语音条的播放动画 */
  const playVoice = useCallback(
    (id: number, text: string, moodKey: MoodKey) => {
      void speakText(text, moodKey, {
        onStart: () => setPlayingVoiceId(id),
        onEnd: () => setPlayingVoiceId(null),
      });
    },
    [],
  );

  const runStart = useCallback(async () => {
    setBusy(true);
    setErrorMsg(null);
    setTyping(true);
    const herId = ++idRef.current;
    setMsgs([{ id: herId, role: "her", text: "" }]);
    try {
      const res = await fetch("/api/game/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId: scenario.id }),
      });
      const { full, error } = await readGameStream(res, (visible) =>
        patchMsg(herId, visible),
      );
      if (error) throw new Error(error);
      const opts = sanitizeOptions(full.data?.options);
      if (!opts || !full.text) {
        throw new Error("她暂时没想好怎么开口，点重试再连一次");
      }
      patchMsg(herId, full.text);
      lastHerRef.current = full.text;
      if (soundOnRef.current) {
        // 开场 = 第三人称铺垫 + 她的第一句话，只朗读她的台词部分
        playVoice(
          herId,
          voiceTextOf(full.text),
          moodOfAnger(scenario.initialAnger).key,
        );
      }
      setOptions(opts);
    } catch (e) {
      setMsgs((prev) => prev.filter((m) => m.id !== herId));
      setErrorMsg(e instanceof Error ? e.message : "连接失败，请再试一次");
      lastActionRef.current = () => void runStart();
    } finally {
      setBusy(false);
      setTyping(false);
    }
  }, [scenario, patchMsg]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void runStart();
  }, [runStart]);

  const loadEvent = useCallback(
    async (currentAnger: number) => {
      try {
        const res = await fetch("/api/game/event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scenarioId: scenario.id,
            anger: currentAnger,
            history: historyRef.current,
          }),
        });
        const { full, error } = await readGameStream(res, () => {});
        if (error) return;
        const opts = sanitizeEventOptions(full.data?.options);
        if (!opts || !full.text) return;
        setPickedEvent(null);
        setEventData({ text: full.text, options: opts });
      } catch {
        /* 意外事件加载失败不打断游戏 */
      }
    },
    [scenario],
  );

  const pick = async (choice: string) => {
    if (busy || ending) return;
    const optionsBackup = options;
    const currentAnger = anger;
    const currentRound = round;
    const currentFavor = favor;
    const isExam = examNow;

    setBusy(true);
    setErrorMsg(null);
    setOptions([]);

    const meId = ++idRef.current;
    const herId = ++idRef.current;
    setMsgs((prev) => [...prev, { id: meId, role: "me", text: choice }]);
    setTyping(true);

    try {
      const res = await fetch("/api/game/choose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId: scenario.id,
          anger: currentAnger,
          round: currentRound,
          isExam,
          choice,
          history: historyRef.current,
        }),
      });
      const { full, error } = await readGameStream(res, (visible) => {
        setMsgs((prev) =>
          prev.some((m) => m.id === herId)
            ? prev.map((m) => (m.id === herId ? { ...m, text: visible } : m))
            : [...prev, { id: herId, role: "her", text: visible }],
        );
      });
      if (error) throw new Error(error);

      const correct = full.data?.correct === true;
      const deltaRaw = Number(full.data?.delta);
      const delta =
        deltaRaw === -10 || deltaRaw === 10 || deltaRaw === 20
          ? deltaRaw
          : correct
            ? -10
            : 10;
      const annotation =
        typeof full.data?.annotation === "string"
          ? full.data.annotation.trim()
          : "";

      if (!full.text) {
        throw new Error("她的反应有点乱，点重试再连一次");
      }
      patchMsg(herId, full.text);

      historyRef.current = [
        ...historyRef.current.slice(-7),
        { her: lastHerRef.current, me: choice, correct },
      ];
      lastHerRef.current = full.text;

      let newAnger: number;
      let win = false;
      let lose = false;
      if (isExam && correct) {
        newAnger = 0;
        win = true;
      } else {
        newAnger = Math.min(100, Math.max(10, currentAnger + delta));
        lose = newAnger >= 100;
      }
      setAnger(newAnger);
      if (soundOnRef.current) {
        // 她的这局反应对应打分后的新情绪档位（和好=happy、分手=cold）
        playVoice(herId, full.text, moodOfAnger(newAnger).key);
      }
      // 触发愤怒值反馈徽标动画（1s 后自动消失）
      const fid = ++idRef.current;
      setFeedback({ id: fid, delta });
      window.setTimeout(() => {
        setFeedback((f) => (f && f.id === fid ? null : f));
      }, 1100);
      if (delta === 20) {
        setShake(true);
        window.setTimeout(() => setShake(false), 450);
      }
      setRound(currentRound + 1);
      const newConsec = correct ? consecutiveCorrect + 1 : 0;
      setConsecutiveCorrect(newConsec);

      if (annotation && !isExam) {
        setMsgs((prev) => [
          ...prev,
          { id: ++idRef.current, role: "note", text: annotation },
        ]);
      }

      if (win || lose) {
        setEnding(true);
        window.setTimeout(() => {
          onEnd({
            win,
            rating: win
              ? currentFavor >= SWEET_FAVOR
                ? "sweet"
                : "barely"
              : null,
            rounds: currentRound,
            favor: currentFavor,
          });
        }, 2400);
        return;
      }

      const nextOpts = sanitizeOptions(full.data?.options);
      if (!nextOpts) {
        throw new Error("她的心思有点乱，点重试再连一次");
      }
      setExamNow(newAnger <= EXAM_THRESHOLD);
      setOptions(nextOpts);

      if (newConsec >= 2) {
        setConsecutiveCorrect(0);
        void loadEvent(newAnger);
      }
    } catch (e) {
      setMsgs((prev) => prev.filter((m) => m.id !== herId && m.id !== meId));
      setOptions(optionsBackup);
      setErrorMsg(e instanceof Error ? e.message : "连接失败，请再试一次");
      lastActionRef.current = () => void pick(choice);
    } finally {
      setBusy(false);
      setTyping(false);
    }
  };

  const handleEventPick = (opt: EventOption) => {
    if (pickedEvent) return;
    setPickedEvent(opt);
    setFavor((f) => f + opt.delta);
    if (soundOnRef.current) {
      void speakText(opt.result, mood.key);
    }
  };

  const closeEvent = () => {
    setEventData(null);
    setPickedEvent(null);
  };

  return (
    <div
      className={`flex min-h-screen flex-col ${shake ? "animate-shake" : ""}`}
    >
      <header className="sticky top-0 z-10 border-b border-line bg-[#ededed]">
        <div className="relative flex h-12 items-center justify-between px-2">
          <button
            type="button"
            onClick={onExit}
            aria-label="返回消息列表"
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink active:bg-black/5"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="pointer-events-none absolute inset-x-14 text-center">
            <div className="text-[16px] font-semibold leading-tight text-ink">
              女朋友
            </div>
            {typing && (
              <div className="text-[10px] leading-tight text-ink-soft">
                对方正在输入…
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={toggleSound}
            aria-label={soundOn ? "关闭女友声音" : "开启女友声音"}
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink active:bg-black/5"
          >
            {soundOn ? (
              <Volume2 className="h-5 w-5" />
            ) : (
              <VolumeX className="h-5 w-5" />
            )}
          </button>
        </div>
        <div className="relative px-3 pb-2">
          <AngerMeter anger={anger} favor={favor} />
          {feedback && (
            <div
              key={feedback.id}
              className="pointer-events-none absolute left-1/2 top-full z-20 -translate-x-1/2"
            >
              <div
                className={`feedback-float relative flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-sm font-black shadow-sm ${
                  feedback.delta < 0 ? "text-blush" : "text-blush-deep"
                }`}
              >
                {feedback.delta < 0 ? (
                  <Heart className="h-3.5 w-3.5 fill-heart text-heart" aria-hidden />
                ) : (
                  <Flame className="h-3.5 w-3.5" aria-hidden />
                )}
                {feedback.delta > 0 ? `+${feedback.delta}` : feedback.delta}
                {feedback.delta < 0 && (
                  <>
                    <Heart
                      className="mini-heart absolute -left-2 bottom-0 h-3 w-3 fill-heart text-heart"
                      style={{ "--drift": "-12px", animationDelay: "0.08s" } as CSSProperties}
                      aria-hidden
                    />
                    <Heart
                      className="mini-heart absolute -right-2 bottom-0 h-2.5 w-2.5 fill-heart text-heart"
                      style={{ "--drift": "12px", animationDelay: "0.22s" } as CSSProperties}
                      aria-hidden
                    />
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        {examNow && options.length > 0 && (
          <div className="mx-3 mb-2 flex items-center gap-1.5 rounded-lg bg-note px-3 py-1.5 text-xs font-bold text-note-ink">
            <GraduationCap className="h-3.5 w-3.5" aria-hidden />
            毕业考：这一轮没有批注，靠你自己了
          </div>
        )}
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-3">
          {msgs.map((m) => {
            if (m.role === "her") {
              if (!m.text) return null;
              return (
                <div key={m.id} className="bubble-enter flex items-start gap-2">
                  <Image
                    src={mood.avatar}
                    alt=""
                    width={36}
                    height={36}
                    className="h-9 w-9 shrink-0 rounded-lg border border-white object-cover shadow-sm"
                  />
                  <div className="flex min-w-0 max-w-[80%] flex-col items-start gap-1.5">
                    <div className="whitespace-pre-wrap rounded-2xl rounded-tl-sm bg-white px-3.5 py-2.5 text-[15px] leading-relaxed text-ink shadow-sm">
                      {m.text}
                    </div>
                    <VoiceBar
                      seconds={estimateVoiceSeconds(voiceTextOf(m.text))}
                      playing={playingVoiceId === m.id}
                      onClick={() =>
                        playVoice(m.id, voiceTextOf(m.text), mood.key)
                      }
                    />
                  </div>
                </div>
              );
            }
            if (m.role === "me") {
              return (
                <div key={m.id} className="bubble-enter flex justify-end">
                  <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-wx px-3.5 py-2.5 text-[15px] leading-relaxed text-ink shadow-sm">
                    {m.text}
                  </div>
                </div>
              );
            }
            return (
              <div
                key={m.id}
                className="note-enter mx-auto max-w-[92%] rounded-xl bg-note px-3.5 py-2.5 text-sm leading-relaxed text-note-ink"
              >
                <span className="mb-0.5 flex items-center gap-1 text-xs font-black">
                  <StickyNote className="h-3.5 w-3.5" aria-hidden />
                  恋爱教练批注
                </span>
                {m.text}
              </div>
            );
          })}
        </div>
      </div>

      <footer className="sticky bottom-0 border-t border-line bg-cream/95 px-4 pb-5 pt-3 backdrop-blur">
        {errorMsg && (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-bubble-me px-3.5 py-2.5 text-sm text-blush-deep">
            <span>{errorMsg}</span>
            <button
              type="button"
              onClick={() => lastActionRef.current?.()}
              className="shrink-0 rounded-lg bg-white px-3 py-1 text-xs font-bold text-blush shadow-sm"
            >
              重试
            </button>
          </div>
        )}
        {options.length > 0 && !ending ? (
          <div className="space-y-2.5">
            <p className="text-xs font-bold text-ink-soft">
              {examNow ? "毕业考 · 选一句回复她" : "选一句回复她"}
            </p>
            {options.map((opt, i) => (
              <button
                key={`${round}-${i}`}
                type="button"
                disabled={busy}
                onClick={() => void pick(opt)}
                className="w-full rounded-xl border border-line bg-white px-4 py-3.5 text-left text-[15px] font-medium leading-relaxed text-ink shadow-sm transition-all active:scale-[0.99] active:bg-bubble-me disabled:opacity-50"
              >
                {opt}
              </button>
            ))}
          </div>
        ) : (
          !errorMsg && (
            <p className="py-2 text-center text-sm text-ink-soft">
              {ending ? "……" : busy ? "等她回复…" : ""}
            </p>
          )
        )}
      </footer>

      {eventData && (
        <EventModal
          event={eventData}
          picked={pickedEvent}
          onPick={handleEventPick}
          onClose={closeEvent}
        />
      )}
    </div>
  );
}
