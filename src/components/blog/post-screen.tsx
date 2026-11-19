"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, GraduationCap, Loader2 } from "lucide-react";
import { formatPostDate, type BlogPost } from "./types";

export function PostScreen({
  postId,
  onBack,
}: {
  postId: number;
  onBack: () => void;
}) {
  const [post, setPost] = useState<BlogPost | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/blog/posts/${postId}`);
        const data = (await res.json()) as {
          post?: BlogPost;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok || !data.post) {
          setError(data.error ?? "文章加载失败");
          return;
        }
        setPost(data.post);
      } catch {
        if (!cancelled) setError("网络出了点小状况，稍后再试");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [postId]);

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
          <h1 className="text-[17px] font-semibold text-ink">文章</h1>
          <span className="w-9" aria-hidden />
        </div>
      </header>

      <div className="flex-1 bg-white">
        {error ? (
          <div className="px-6 py-20 text-center text-sm text-blush-deep">
            {error}
          </div>
        ) : post === null ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-ink-soft">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            正在翻开文章…
          </div>
        ) : (
          <article className="px-5 pb-10 pt-6">
            {/* 公众号式标题区 */}
            <h2 className="text-[22px] font-bold leading-snug text-ink">
              {post.title}
            </h2>
            <div className="mt-4 flex items-center gap-2.5 border-b border-line pb-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-note">
                <GraduationCap className="h-5 w-5 text-note-ink" aria-hidden />
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-medium text-ink">哄哄小助手</span>
                <span className="text-xs text-ink-soft">
                  {formatPostDate(post.created_at)} · 恋爱话术研究所
                </span>
              </span>
            </div>

            {/* 正文 */}
            <div className="pt-5 text-[16px] text-ink">
              <ReactMarkdown
                components={{
                  h2: (props) => (
                    <h3
                      className="mb-2 mt-6 text-[17px] font-bold text-ink"
                      {...props}
                    />
                  ),
                  h3: (props) => (
                    <h4
                      className="mb-2 mt-5 text-[16px] font-bold text-ink"
                      {...props}
                    />
                  ),
                  p: (props) => (
                    <p className="my-3.5 leading-8 text-ink/90" {...props} />
                  ),
                  blockquote: (props) => (
                    <blockquote
                      className="my-4 rounded-r-lg border-l-4 border-blush/40 bg-cream px-4 py-3 text-[15px] leading-7 text-ink-soft [&>p]:my-1"
                      {...props}
                    />
                  ),
                  ul: (props) => (
                    <ul className="my-3 list-disc pl-6 leading-8" {...props} />
                  ),
                  ol: (props) => (
                    <ol className="my-3 list-decimal pl-6 leading-8" {...props} />
                  ),
                  li: (props) => <li className="my-1" {...props} />,
                  strong: (props) => (
                    <strong className="font-bold text-blush-deep" {...props} />
                  ),
                  hr: () => <hr className="my-6 border-line" />,
                }}
              >
                {post.content}
              </ReactMarkdown>
            </div>

            {/* 底部彩蛋 */}
            <div className="mt-10 rounded-xl bg-cream px-4 py-4 text-center">
              <p className="text-sm leading-6 text-ink-soft">
                学完了？她还在等你哄呢
              </p>
              <button
                type="button"
                onClick={onBack}
                className="mt-2.5 rounded-full bg-blush px-5 py-2 text-sm font-medium text-white active:scale-95"
              >
                回去哄她
              </button>
            </div>
          </article>
        )}
      </div>
    </div>
  );
}
