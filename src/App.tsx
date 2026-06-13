import { useState } from 'react';
import { INITIAL_STATS } from './constants/initialState';
import { EndScreen } from './screens/EndScreen';
import { StartScreen } from './screens/StartScreen';
import { ConsultantClass, GamePhase, GameStats } from './types/game';

type GameResult = {
  outcome: 'win' | 'lose';
  stats: GameStats;
  loseReason: string | null;
  selectedClass: ConsultantClass;
};

function App() {
  const [phase, setPhase] = useState<GamePhase>('start');
  const [selectedClass, setSelectedClass] = useState<ConsultantClass | null>(null);
  const [result, setResult] = useState<GameResult | null>(null);

  if (phase === 'start') {
    return (
      <StartScreen
        onStart={(cls) => {
          setSelectedClass(cls);
          setPhase('playing');
        }}
      />
    );
  }

  if (phase === 'end' && result) {
    return (
      <EndScreen
        outcome={result.outcome}
        stats={result.stats}
        loseReason={result.loseReason}
        selectedClass={result.selectedClass}
        onRestart={() => {
          setResult(null);
          setPhase('start');
        }}
      />
    );
  }

  // 'playing' phase — PhaserGame component mounts here (Issue #4)
  // Placeholder: simulate a quick loss so the flow is testable
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-950 text-gray-100">
      <p className="text-lg font-bold tracking-widest text-purple-300">🎮 Loading game engine...</p>
      <button
        onClick={() => {
          setResult({
            outcome: 'lose',
            stats: { ...INITIAL_STATS },
            loseReason: 'The game engine has not been wired up yet.',
            selectedClass: selectedClass!,
          });
          setPhase('end');
        }}
        className="rounded-xl bg-red-800 px-6 py-3 text-sm font-bold tracking-widest text-white hover:bg-red-700"
      >
        Simulate game over
      </button>
    </div>
  );
}

export default App;
