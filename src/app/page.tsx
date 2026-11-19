import { GameApp } from "@/components/game/game-app";

export default function Home() {
  return (
    <main className="min-h-screen bg-cream-deep">
      <div className="mx-auto min-h-screen w-full max-w-md bg-cream shadow-[0_0_48px_rgba(43,36,32,0.08)]">
        <GameApp />
      </div>
    </main>
  );
}
