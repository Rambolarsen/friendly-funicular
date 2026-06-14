import { useEffect, useState } from 'react';
import { EndScreen } from './screens/EndScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { StartScreen } from './screens/StartScreen';
import { ConsultantClass, GamePhase, RawStats } from './types/game';
import { PhaserGame, MultiplayerResult } from './game/PhaserGame';
import { SocketClient } from './game/network/SocketClient';
import { useIsMobile } from './hooks/useIsMobile';

type GameResult = {
  outcome: 'win' | 'lose';
  stats: RawStats;
  loseReason: string | null;
  selectedClass: ConsultantClass;
  multiplayerResult?: MultiplayerResult;
};

/**
 * Returns the actual visible viewport dimensions in CSS pixels, updated on
 * resize. Uses visualViewport when available (more accurate on iOS Safari)
 * rather than CSS vh/vw units which can include the collapsed address bar.
 */
function useViewportSize() {
  const measure = () => ({
    w: window.visualViewport?.width  ?? window.innerWidth,
    h: window.visualViewport?.height ?? window.innerHeight,
  });
  const [size, setSize] = useState(measure);
  useEffect(() => {
    const update = () => setSize(measure());
    window.visualViewport?.addEventListener('resize', update);
    window.addEventListener('resize', update);
    return () => {
      window.visualViewport?.removeEventListener('resize', update);
      window.removeEventListener('resize', update);
    };
  }, []);
  return size;
}

function App() {
  const [phase, setPhase] = useState<GamePhase>('start');
  const [selectedClass, setSelectedClass] = useState<ConsultantClass | null>(null);
  const [result, setResult] = useState<GameResult | null>(null);
  const [socket, setSocket] = useState<SocketClient | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const { w, h } = useViewportSize();
  const isPortrait = h > w;

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

  // When on a mobile phone held in portrait, rotate the game container so it
  // fills the screen in landscape. Use exact pixel values (not vh/vw) so Phaser
  // reads correct landscape dimensions from offsetWidth/offsetHeight, and so
  // iOS Safari's large-viewport 100vh bug doesn't affect positioning.
  // position:fixed escapes overflow-hidden clipping on ancestors.
  const shouldRotate = isMobile && isPortrait;
  const gameStyle: React.CSSProperties = shouldRotate
    ? {
        width: `${h}px`,
        height: `${w}px`,
        position: 'fixed',
        top: `${h}px`,
        left: 0,
        transform: 'rotate(-90deg)',
        transformOrigin: 'left top',
      }
    : { width: '100%', height: '100%' };

  return (
    <div className="w-screen h-screen bg-gray-950">
      <div style={gameStyle}>
        <PhaserGame
          selectedClass={selectedClass!}
          socket={socket ?? undefined}
          roomId={roomId ?? undefined}
          onGameOver={(outcome, stats, reason, multiplayerResult) => {
            setResult({ outcome, stats, loseReason: reason, selectedClass: selectedClass!, multiplayerResult });
            setPhase('end');
          }}
          onReturnHome={() => {
            SocketClient.reset();
            setSocket(null);
            setRoomId(null);
            setResult(null);
            setPhase('start');
          }}
        />
      </div>
    </div>
  );
}

export default App;
