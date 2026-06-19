import './index.css';

import { context, requestExpandedMode } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

export const Splash = () => {
  return (
    <main className="min-h-screen bg-[#f4f1ea] px-4 py-4 text-zinc-950">
      <section className="mx-auto flex min-h-[320px] max-w-xl flex-col justify-between overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="relative flex flex-1 items-center justify-between gap-3 bg-[#dbe7dd] px-5 py-5">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase text-orange-700">
              u/{context.username ?? 'keeper'}
            </p>
            <h1 className="mt-1 text-3xl font-black leading-none text-zinc-950">
              Reddit Raid Keeper
            </h1>
            <p className="mt-3 max-w-[14rem] text-sm font-semibold text-zinc-700">
              Build a party, break the raid boss, claim the loot.
            </p>
          </div>
          <div className="relative h-32 w-32 shrink-0">
            <div className="absolute inset-x-3 bottom-0 h-24 rounded-t-full bg-white/80" />
            <img
              className="absolute bottom-3 left-1/2 h-24 w-24 -translate-x-1/2 drop-shadow-md"
              src="/snoo.png"
              alt="Snoo"
            />
            <div className="absolute right-0 top-2 flex h-12 w-12 items-center justify-center rounded-md border-4 border-red-300 bg-red-500 text-sm font-black text-white shadow-lg">
              Raid
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto] items-center gap-3 px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase text-zinc-500">
              Turn based RPG
            </p>
            <p className="text-lg font-black">Snoo Prime is waiting</p>
          </div>
          <button
            className="h-11 rounded-md bg-orange-500 px-5 text-sm font-black text-white shadow-sm transition hover:bg-orange-400"
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
