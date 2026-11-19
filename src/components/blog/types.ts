export interface BlogPostMeta {
  id: number;
  title: string;
  summary: string;
  created_at: string;
}

export interface BlogPost extends BlogPostMeta {
  content: string;
}

export function formatPostDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  const base = `${d.getMonth() + 1}月${d.getDate()}日`;
  return sameYear ? base : `${d.getFullYear()}年${base}`;
}
