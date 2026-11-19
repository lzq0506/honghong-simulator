"use client";

import { useState } from "react";
import { Heart, Loader2, Lock, UserRound } from "lucide-react";

export interface AuthUser {
  id: number;
  username: string;
}

export function AuthScreen({
  onAuthed,
  initialTab,
  onBack,
}: {
  onAuthed: (user: AuthUser) => void;
  initialTab?: "login" | "register";
  onBack?: () => void;
}) {
  const [mode, setMode] = useState<"login" | "register">(initialTab ?? "login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (submitting) return;
    setError(null);
    if (!username.trim()) {
      setError("请输入用户名");
      return;
    }
    if (password.length < 6) {
      setError("密码至少 6 位");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = (await res.json()) as {
        user?: AuthUser;
        error?: string;
      };
      if (!res.ok || !data.user) {
        setError(data.error ?? "操作失败，再试一次吧");
        return;
      }
      onAuthed(data.user);
    } catch {
      setError("网络出了点小状况，稍后再试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-cream">
      {/* 品牌区 */}
      <div className="flex flex-col items-center px-6 pb-8 pt-16">
        <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-blush shadow-[0_8px_24px_rgba(217,63,95,0.25)]">
          <Heart className="h-10 w-10 fill-white text-white" aria-hidden />
        </span>
        <h1 className="mt-5 text-2xl font-bold text-ink">哄哄模拟器</h1>
        <p className="mt-2 text-sm text-ink-soft">她生气了，等你把她哄回来</p>
      </div>

      {/* 表单卡片 */}
      <div className="mx-5 rounded-2xl bg-white p-5 shadow-[0_2px_12px_rgba(43,36,32,0.06)]">
        {/* 登录/注册切换 */}
        <div className="mb-5 flex rounded-xl bg-cream-deep p-1">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                mode === m
                  ? "bg-white text-blush shadow-sm"
                  : "text-ink-soft"
              }`}
            >
              {m === "login" ? "登录" : "注册"}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-3 rounded-xl border border-line bg-cream px-3.5 focus-within:border-blush/50">
            <UserRound className="h-5 w-5 shrink-0 text-ink-soft" aria-hidden />
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="用户名（2~20 位）"
              maxLength={20}
              autoComplete="username"
              className="w-full bg-transparent py-3 text-[15px] text-ink outline-none placeholder:text-ink-soft/60"
            />
          </label>

          <label className="flex items-center gap-3 rounded-xl border border-line bg-cream px-3.5 focus-within:border-blush/50">
            <Lock className="h-5 w-5 shrink-0 text-ink-soft" aria-hidden />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "register" ? "密码（至少 6 位）" : "密码"}
              maxLength={50}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              className="w-full bg-transparent py-3 text-[15px] text-ink outline-none placeholder:text-ink-soft/60"
            />
          </label>
        </div>

        {error && (
          <p className="mt-3 text-sm text-blush-deep">{error}</p>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blush py-3 text-[15px] font-medium text-white active:scale-[0.98] disabled:opacity-70"
        >
          {submitting && (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          )}
          {submitting
            ? "请稍候…"
            : mode === "login"
              ? "登录"
              : "注册并登录"}
        </button>

        {mode === "register" && (
          <p className="mt-3 text-center text-xs text-ink-soft">
            注册成功后自动登录，直接进入游戏
          </p>
        )}
      </div>

      <p className="mt-auto pb-8 pt-10 text-center text-xs text-ink-soft/60">
        登录后即可开始哄她 · 进度会保存在本机
      </p>

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="absolute left-4 top-4 flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-ink-soft active:bg-black/5"
        >
          ‹ 先随便逛逛
        </button>
      )}
    </div>
  );
}
