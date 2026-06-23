import './index.css';

import { context, requestExpandedMode } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

export const Splash = () => {
  return (
    <main className="min-h-screen bg-zinc-900 flex items-center justify-center px-4 py-4">
      <section className="mx-auto flex min-h-[320px] max-w-xl w-full flex-col justify-between overflow-hidden rounded-xl border border-zinc-700 bg-zinc-800 shadow-2xl">
        {/* Title screen image fills the hero area */}
        <div
          className="relative flex-1 min-h-[200px] bg-cover bg-center"
          style={{ backgroundImage: 'url(/assets/screens/title_screen_fast.webp)' }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70" />
          <div className="relative z-10 flex h-full flex-col justify-end px-5 pb-4 pt-5">
            <p className="text-xs font-bold uppercase text-orange-400 drop-shadow">
              u/{context.username ?? 'keeper'}
            </p>
            <h1 className="mt-1 text-3xl font-black leading-none text-white drop-shadow-lg">
              D9 Raid Keeper
            </h1>
            <p className="mt-2 text-sm font-semibold text-zinc-200 drop-shadow">
              Together with your department, fight the destiny.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto] items-center gap-3 px-5 py-4 bg-zinc-800">
          <div>
            <p className="text-xs font-bold uppercase text-zinc-400">
              Community Turn-based RPG
            </p>
            <p className="text-lg font-black text-white">The Management is waiting</p>
          </div>
          <button
            className="h-11 rounded-md bg-orange-500 px-6 text-sm font-black text-white shadow-md transition hover:bg-orange-400 active:scale-95"
            onClick={(event) => {
              void requestExpandedMode(event.nativeEvent, 'game');
            }}
          >
            Play
          </button>
        </div>
      </section>
    </main>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
