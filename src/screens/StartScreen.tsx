import { useState } from 'react';
import { ClassCard } from '../components/ClassCard';
import { CONSULTANT_CLASSES } from '../constants/classes';
import { ConsultantClass } from '../types/game';

type Props = {
  onStart: (cls: ConsultantClass) => void;
  onMultiplayer?: (cls: ConsultantClass) => void;
};

export function StartScreen({ onStart, onMultiplayer }: Props) {
  const [selected, setSelected] = useState<ConsultantClass | null>(null);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 p-4 text-gray-100">
      <div className="mb-4 text-center">
        <div className="mb-1 text-4xl">🏰</div>
        <h1
          className="mb-1 text-3xl font-black tracking-widest text-purple-300 md:text-4xl"
          style={{ fontFamily: 'Cinzel Decorative, serif' }}
        >
          DUNGEONS
        </h1>
        <h2
          className="mb-0 text-xl font-bold tracking-wider text-amber-400 md:text-2xl"
          style={{ fontFamily: 'Cinzel Decorative, serif' }}
        >
          & DELIVERABLES
        </h2>
      </div>

      <div className="w-full max-w-4xl">
        <h3 className="mb-3 text-center text-lg font-bold tracking-widest text-purple-300">⚔️ CHOOSE YOUR CLASS ⚔️</h3>
        <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          {CONSULTANT_CLASSES.map((cls) => (
            <ClassCard
              key={cls.id}
              cls={cls}
              onSelect={setSelected}
              selected={selected?.id === cls.id}
            />
          ))}
        </div>

        <div className="flex flex-col items-center gap-2">
          <button
            onClick={() => selected && onStart(selected)}
            disabled={!selected}
            className={`rounded-xl px-10 py-3 text-base font-bold tracking-widest transition-all duration-200 ${
              selected
                ? 'cursor-pointer bg-purple-700 text-white shadow-lg shadow-purple-900/50 hover:bg-purple-600 active:scale-95'
                : 'cursor-not-allowed bg-gray-800 text-gray-600'
            }`}
          >
            {selected ? `▶ SOLO — ${selected.name.toUpperCase()}` : 'SELECT A CLASS TO BEGIN'}
          </button>
          <button
            onClick={() => selected && onMultiplayer?.(selected)}
            disabled={!selected}
            className={`rounded-xl px-10 py-2 text-sm font-bold tracking-widest transition-all duration-200 ${
              selected
                ? 'cursor-pointer bg-blue-800 text-white hover:bg-blue-700 active:scale-95'
                : 'cursor-not-allowed bg-gray-800 text-gray-600'
            }`}
          >
            🌐 MULTIPLAYER
          </button>
        </div>
      </div>
    </div>
  );
}
