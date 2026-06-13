import { useState } from 'react';
import { EndScreen } from './screens/EndScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { StartScreen } from './screens/StartScreen';
import { ConsultantClass, GamePhase, RawStats } from './types/game';
import { PhaserGame, MultiplayerResult } from './game/PhaserGame';
import { SocketClient } from './game/network/SocketClient';

type GameResult = {
  outcome: 'win' | 'lose';
  stats: RawStats;
  loseReason: string | null;
  selectedClass: ConsultantClass;
  multiplayerResult?: MultiplayerResult;
};

function App() {
  const [phase, setPhase] = useState<GamePhase>('start');
  const [selectedClass, setSelectedClass] = useState<ConsultantClass | null>(null);
  const [result, setResult] = useState<GameResult | null>(null);
  const [socket, setSocket] = useState<SocketClient | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);

  if (phase === 'start') {
    return (
      <StartScreen
        onStart={(cls) => {
          SocketClient.reset();
          setSelectedClass(cls);
          setSocket(null);
          setRoomId(null);
          setPhase('playing');
        }}
        onMultiplayer={(cls) => {
          setSelectedClass(cls);
          setPhase('lobby');
        }}
      />
    );
  }

  if (phase === 'lobby' && selectedClass) {
    return (
      <LobbyScreen
        selectedClass={selectedClass}
        onJoined={(sc, rid) => {
          setSocket(sc);
          setRoomId(rid);
          setPhase('playing');
        }}
        onBack={() => {
          SocketClient.reset();
          setSocket(null);
          setRoomId(null);
          setPhase('start');
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
        multiplayerResult={result.multiplayerResult}
        onRestart={() => {
          SocketClient.reset();
          setSocket(null);
          setRoomId(null);
          setResult(null);
          setPhase('start');
        }}
      />
    );
  }

  return (
    <div className="w-screen h-screen bg-gray-950">
      <PhaserGame
        selectedClass={selectedClass!}
        socket={socket ?? undefined}
        roomId={roomId ?? undefined}
        onGameOver={(outcome, stats, reason, multiplayerResult) => {
          setResult({ outcome, stats, loseReason: reason, selectedClass: selectedClass!, multiplayerResult });
          setPhase('end');
        }}
      />
    </div>
  );
}

export default App;
