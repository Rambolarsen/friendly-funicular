import { useState } from 'react';
import { EndScreen } from './screens/EndScreen';
import { StartScreen } from './screens/StartScreen';
import { ConsultantClass, GamePhase, RawStats } from './types/game';
import { PhaserGame } from './game/PhaserGame';

type GameResult = {
  outcome: 'win' | 'lose';
  stats: RawStats;
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
  return (
    <div className="w-screen h-screen bg-gray-950">
      <PhaserGame
        selectedClass={selectedClass!}
        onGameOver={(outcome, stats, reason) => {
          setResult({ outcome, stats, loseReason: reason, selectedClass: selectedClass! });
          setPhase('end');
        }}
      />
    </div>
  );
}

export default App;
