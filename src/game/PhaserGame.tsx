import Phaser from 'phaser';
import { useEffect, useRef, useState } from 'react';
import { INITIAL_STATS } from '../constants/initialState';
import { ConsultantClass, GameOverPayload, GameStats } from '../types/game';
import { createGameConfig } from './config';
import { GAME_OVER, STATS_CHANGED } from './eventKeys';

interface PhaserGameProps {
  selectedClass: ConsultantClass;
  onGameOver: (outcome: 'win' | 'lose', stats: GameStats, reason: string | null) => void;
}

export function PhaserGame({ selectedClass, onGameOver }: PhaserGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const onGameOverRef = useRef(onGameOver);
  const [, setStats] = useState<GameStats>({ ...INITIAL_STATS });

  useEffect(() => {
    onGameOverRef.current = onGameOver;
  }, [onGameOver]);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const game = new Phaser.Game(createGameConfig(containerRef.current, selectedClass));
    gameRef.current = game;

    const onStatsChanged = (newStats: GameStats) => {
      setStats({ ...newStats });
    };

    const onGameOverEvent = ({ outcome, stats: finalStats, reason }: GameOverPayload) => {
      onGameOverRef.current(outcome, finalStats, reason);
    };

    game.events.on(STATS_CHANGED, onStatsChanged);
    game.events.on(GAME_OVER, onGameOverEvent);

    return () => {
      game.events.off(STATS_CHANGED, onStatsChanged);
      game.events.off(GAME_OVER, onGameOverEvent);
      game.destroy(true);
      gameRef.current = null;
    };
  // selectedClass intentionally omitted: registry is set once at game creation; onGameOver called once at game end
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} />
      {/* HUD overlay mounts here in issue #10; introduce named stats binding then */}
    </div>
  );
}
