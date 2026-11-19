export interface ShareCardData {
  scenarioTitle: string;
  win: boolean;
  ratingLabel: string;
  rounds: number;
  favor: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** 生成结局分享卡（750x1000 PNG）并触发下载 */
export async function downloadShareCard(data: ShareCardData): Promise<void> {
  const W = 750;
  const H = 1000;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法创建画布");

  // 背景：床头灯暖米白
  ctx.fillStyle = "#FAF6F1";
  ctx.fillRect(0, 0, W, H);

  // 白色主卡
  const m = 56;
  roundedRect(ctx, m, m, W - m * 2, H - m * 2, 36);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();

  // 头像（和好/分手各一张）
  const avatarSrc = data.win ? "/avatar-happy.jpeg" : "/avatar-cold.jpeg";
  try {
    const avatar = await loadImage(avatarSrc);
    const size = 220;
    const cx = W / 2;
    const cy = m + 190;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, cx - size / 2, cy - size / 2, size, size);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2 + 5, 0, Math.PI * 2);
    ctx.strokeStyle = "#D9435F";
    ctx.lineWidth = 6;
    ctx.stroke();
  } catch {
    /* 头像加载失败时跳过，不影响卡片生成 */
  }

  ctx.textAlign = "center";

  // 产品名
  ctx.fillStyle = "#9A8F86";
  ctx.font = "500 30px 'Noto Sans SC', sans-serif";
  ctx.fillText("哄哄模拟器", W / 2, m + 380);

  // 主结果
  ctx.fillStyle = data.win ? "#D9435F" : "#B92C47";
  ctx.font = "900 68px 'Noto Sans SC', sans-serif";
  ctx.fillText(data.win ? "哄回来了！" : "被分手了…", W / 2, m + 478);

  // 场景与评级
  ctx.fillStyle = "#2B2420";
  ctx.font = "700 36px 'Noto Sans SC', sans-serif";
  const sceneLine = data.win
    ? `「${data.scenarioTitle}」 · ${data.ratingLabel}`
    : `「${data.scenarioTitle}」`;
  ctx.fillText(sceneLine, W / 2, m + 546);

  // 战绩
  ctx.fillStyle = "#9A8F86";
  ctx.font = "400 30px 'Noto Sans SC', sans-serif";
  ctx.fillText(
    data.win
      ? `用了 ${data.rounds} 轮 · 好感度 ${data.favor}`
      : `撑了 ${data.rounds} 轮 · 好感度 ${data.favor}`,
    W / 2,
    m + 606,
  );

  // 分隔线
  ctx.strokeStyle = "#EFE6DE";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(m + 60, m + 660);
  ctx.lineTo(W - m - 60, m + 660);
  ctx.stroke();

  // 口号
  ctx.fillStyle = "#2B2420";
  ctx.font = "700 34px 'Noto Sans SC', sans-serif";
  ctx.fillText(
    data.win ? "你能哄得比我快吗？" : "不服气？快来帮我哄回来！",
    W / 2,
    m + 736,
  );

  ctx.fillStyle = "#9A8F86";
  ctx.font = "400 26px 'Noto Sans SC', sans-serif";
  ctx.fillText("把愤怒值降到 0，把她哄回来。", W / 2, m + 792);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) throw new Error("分享卡生成失败");

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "哄哄模拟器-战绩.png";
  link.click();
  URL.revokeObjectURL(url);
}
