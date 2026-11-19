"use client";

import { useEffect, useRef, useState } from "react";
import type { SessionUser } from "@/lib/auth/session";
import { AuthScreen } from "@/components/auth/auth-screen";
import { HomeScreen } from "./home-screen";
import { PlayScreen, type GameResult } from "./play-screen";
import { ResultScreen } from "./result-screen";
import { RankingScreen } from "./ranking-screen";
import { ProfileScreen } from "./profile-screen";
import { BlogScreen } from "@/components/blog/blog-screen";
import { PostScreen } from "@/components/blog/post-screen";
import { SCENARIOS, type Scenario } from "@/lib/game/scenarios";
import { loadProgress, saveProgress } from "@/lib/game/storage";
import { Heart } from "lucide-react";

type Screen =
  | "home"
  | "play"
  | "result"
  | "ranking"
  | "profile"
  | "blog"
  | "post"
  | "auth";

export function GameApp() {
  const [screen, setScreen] = useState<Screen>("home");
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [result, setResult] = useState<GameResult | null>(null);
  const [playKey, setPlayKey] = useState(0);
  const [postId, setPostId] = useState<number | null>(null);
  const [authUser, setAuthUser] = useState<SessionUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2400);
  };

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then(async (res) => {
        if (!res.ok) return null;
        const data = (await res.json()) as { user: SessionUser };
        return data.user;
      })
      .then((user) => {
        if (cancelled) return;
        setAuthUser(user);
        setAuthChecked(true);
      })
      .catch(() => {
        if (!cancelled) setAuthChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const openAuth = (tab: "login" | "register") => {
    setAuthTab(tab);
    setScreen("auth");
  };

  const handleAuthed = (user: SessionUser) => {
    setAuthUser(user);
    setScreen("home");
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* 静默降级 */
    }
    setAuthUser(null);
    setScreen("home");
  };

  const handleStart = (s: Scenario) => {
    if (!authUser) {
      openAuth("login");
      return;
    }
    setScenario(s);
    setPlayKey((k) => k + 1);
    setScreen("play");
  };

  const handleEnd = (gameResult: GameResult) => {
    if (scenario) {
      const progress = loadProgress();
      const idx = SCENARIOS.findIndex((s) => s.id === scenario.id);
      const prev = progress.records[scenario.id] ?? {
        won: false,
        bestRating: null,
        plays: 0,
      };
      const bestRating =
        gameResult.rating === "sweet" || prev.bestRating === "sweet"
          ? ("sweet" as const)
          : (gameResult.rating ?? prev.bestRating);
      progress.records[scenario.id] = {
        won: prev.won || gameResult.win,
        bestRating,
        plays: prev.plays + 1,
      };
      if (gameResult.win && idx >= 0 && idx + 1 >= progress.unlockedCount) {
        progress.unlockedCount = Math.min(
          SCENARIOS.length,
          progress.unlockedCount + 1,
        );
      }
      saveProgress(progress);
    }
    setResult(gameResult);
    setScreen("result");
    // 游戏记录：已登录自动保存到数据库；未登录引导登录
    if (scenario) {
      if (authUser) {
        const finished = scenario;
        void fetch("/api/game/records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scenario: finished.title,
            finalScore: gameResult.favor,
            result: gameResult.win ? "通关" : "失败",
          }),
        })
          .then((res) => {
            if (res.ok) showToast("您的游戏记录已经保存");
          })
          .catch(() => {
            /* 保存失败静默降级，不打断结算 */
          });
      } else {
        showToast("登录后可保存你的游戏记录");
      }
    }
  };

  if (!authChecked) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--cream-deep)] font-[family-name:var(--font-noto-sans)]">
        <div className="flex w-full max-w-md flex-col items-center gap-3">
          <Heart className="h-10 w-10 animate-heartbeat fill-[var(--blush)] text-[var(--blush)]" />
          <p className="text-sm text-[var(--ink-soft)]">哄哄模拟器加载中…</p>
        </div>
      </div>
    );
  }

  if (screen === "auth") {
    return (
      <div className="min-h-dvh bg-[var(--cream-deep)] font-[family-name:var(--font-noto-sans)]">
        <div className="mx-auto w-full max-w-md">
          <AuthScreen
            initialTab={authTab}
            onAuthed={handleAuthed}
            onBack={() => setScreen("home")}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[var(--cream-deep)] font-[family-name:var(--font-noto-sans)]">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-[var(--cream)] shadow-[0_0_40px_rgba(43,36,32,0.08)]">
        {screen === "home" && (
          <HomeScreen
            authUser={authUser}
            onLogin={() => openAuth("login")}
            onRegister={() => openAuth("register")}
            onLogout={handleLogout}
            onOpenRanking={() => setScreen("ranking")}
            onOpenProfile={() => setScreen("profile")}
            onOpenBlog={() => setScreen("blog")}
            onStart={handleStart}
          />
        )}

        {screen === "ranking" && (
          <RankingScreen authUser={authUser} onBack={() => setScreen("home")} />
        )}

        {screen === "profile" && (
          <ProfileScreen
            authUser={authUser}
            onBack={() => setScreen("home")}
            onLogin={() => openAuth("login")}
            onRegister={() => openAuth("register")}
          />
        )}

        {screen === "blog" && (
          <BlogScreen
            onBack={() => setScreen("home")}
            onOpenPost={(id) => {
              setPostId(id);
              setScreen("post");
            }}
          />
        )}

        {screen === "post" && postId !== null && (
          <PostScreen postId={postId} onBack={() => setScreen("blog")} />
        )}

        {screen === "play" && scenario && (
          <PlayScreen
            key={playKey}
            scenario={scenario}
            onExit={() => {
              setScenario(null);
              setScreen("home");
            }}
            onEnd={handleEnd}
          />
        )}

        {screen === "result" && scenario && result && (
          <ResultScreen
            scenario={scenario}
            result={result}
            onRetry={() => {
              setPlayKey((k) => k + 1);
              setScreen("play");
            }}
            onHome={() => {
              setScenario(null);
              setResult(null);
              setScreen("home");
            }}
          />
        )}

        {toast && (
          <div className="pointer-events-none fixed left-1/2 top-14 z-50 -translate-x-1/2 animate-[note-in_.25s_ease-out]">
            <div className="whitespace-nowrap rounded-full bg-ink/90 px-4 py-2 text-sm text-white shadow-lg">
              {toast}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
