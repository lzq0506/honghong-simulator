let sharedAudio: HTMLAudioElement | null = null;
let activeOnEnd: (() => void) | null = null;

/** 停止当前播放，并通知上一段语音的监听方（用于复位语音条动画） */
export function stopVoice(): void {
  if (sharedAudio) {
    sharedAudio.pause();
    sharedAudio.currentTime = 0;
  }
  const end = activeOnEnd;
  activeOnEnd = null;
  end?.();
}

export interface SpeakCallbacks {
  /** 真正开始播放时触发 */
  onStart?: () => void;
  /** 播放结束、被打断或失败时触发（保证一定会回调） */
  onEnd?: () => void;
}

/**
 * 调后端 TTS 合成并播放女友台词。
 * 受浏览器自动播放策略限制时静默降级，不影响游戏流程。
 */
export async function speakText(
  text: string,
  mood: string,
  cb?: SpeakCallbacks,
): Promise<void> {
  const content = text.trim();
  if (!content) return;
  stopVoice();
  activeOnEnd = cb?.onEnd ?? null;
  try {
    const res = await fetch("/api/game/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: content, mood }),
    });
    if (!res.ok) {
      stopVoice();
      return;
    }
    const data = (await res.json()) as { audioUri?: string };
    if (!data.audioUri) {
      stopVoice();
      return;
    }
    if (!sharedAudio) sharedAudio = new Audio();
    sharedAudio.src = data.audioUri;
    sharedAudio.onended = () => stopVoice();
    sharedAudio.onerror = () => stopVoice();
    cb?.onStart?.();
    await sharedAudio.play();
  } catch {
    /* 语音是增强体验，失败时静默降级 */
    stopVoice();
  }
}
