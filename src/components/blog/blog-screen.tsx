"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  GraduationCap,
  Loader2,
  PenLine,
} from "lucide-react";
import { formatPostDate, type BlogPostMeta } from "./types";

export function BlogScreen({
  onBack,
  onOpenPost,
}: {
  onBack: () => void;
  onOpenPost: (id: number) => void;
}) {
  const [posts, setPosts] = useState<BlogPostMeta[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/blog/posts");
        const data = (await res.json()) as {
          posts?: BlogPostMeta[];
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok || !data.posts) {
          setError(data.error ?? "文章加载失败");
          return;
        }
        setPosts(data.posts);
      } catch {
        if (!cancelled) setError("网络出了点小状况，稍后再试");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const generate = useCallback(async () => {
    if (generating) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/blog/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as {
        post?: BlogPostMeta;
        error?: string;
      };
      if (!res.ok || !data.post) {
        setError(data.error ?? "生成失败，再试一次吧");
        return;
      }
      setPosts((prev) => [data.post as BlogPostMeta, ...(prev ?? [])]);
    } catch {
      setError("网络出了点小状况，稍后再试");
    } finally {
      setGenerating(false);
    }
  }, [generating]);

  return (
    <div className="flex min-h-screen flex-col">
      {/* 顶栏 */}
      <header className="sticky top-0 z-10 bg-[#ededed] px-2 pb-1 pt-3">
        <div className="flex h-11 items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            aria-label="返回"
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink active:bg-black/5"
          >
            <ArrowLeft className="h-6 w-6" aria-hidden />
          </button>
          <h1 className="text-[17px] font-semibold text-ink">恋爱话术研究所</h1>
          <span className="w-9" aria-hidden />
        </div>
      </header>

      <div className="flex-1 bg-cream px-3 pb-6 pt-3">
        {/* AI 写新文章（后台功能入口） */}
        <button
          type="button"
          onClick={generate}
          disabled={generating}
          className="mb-3 flex w-full items-center gap-3 rounded-xl bg-white p-3.5 text-left shadow-[0_2px_12px_rgba(43,36,32,0.06)] active:scale-[0.99] disabled:opacity-80"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blush/10">
            {generating ? (
              <Loader2 className="h-5 w-5 animate-spin text-blush" aria-hidden />
            ) : (
              <PenLine className="h-5 w-5 text-blush" aria-hidden />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-ink">
              {generating ? "小助手正在奋笔疾书…" : "让 AI 写一篇新文章"}
            </span>
            <span className="mt-0.5 block text-xs text-ink-soft">
              {generating
                ? "选题、构思、润色，大概要 20 秒"
                : "哄哄小助手出品 · 每篇一个实用的恋爱沟通技巧"}
            </span>
          </span>
          {!generating && (
            <ChevronRight className="h-5 w-5 shrink-0 text-ink-soft" aria-hidden />
          )}
        </button>

        {error && (
          <div className="mb-3 rounded-xl bg-white px-4 py-3 text-sm text-blush-deep shadow-[0_2px_12px_rgba(43,36,32,0.06)]">
            {error}
          </div>
        )}

        {/* 文章列表 */}
        {posts === null ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink-soft">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            正在打开研究所…
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-xl bg-white px-4 py-14 text-center shadow-[0_2px_12px_rgba(43,36,32,0.06)]">
            <GraduationCap
              className="mx-auto mb-3 h-8 w-8 text-ink-soft"
              aria-hidden
            />
            <p className="text-sm text-ink-soft">
              还没有文章，点上面让小助手写一篇吧
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl bg-white shadow-[0_2px_12px_rgba(43,36,32,0.06)]">
            {posts.map((post) => (
              <button
                key={post.id}
                type="button"
                onClick={() => onOpenPost(post.id)}
                className="block w-full border-b border-line px-4 py-3.5 text-left last:border-b-0 active:bg-cream-deep"
              >
                <span className="block text-[16px] font-semibold leading-snug text-ink">
                  {post.title}
                </span>
                <span className="mt-1.5 line-clamp-2 block text-sm leading-6 text-ink-soft">
                  {post.summary}
                </span>
                <span className="mt-2 flex items-center justify-between text-xs text-ink-soft/80">
                  <span>哄哄小助手</span>
                  <span>{formatPostDate(post.created_at)}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
