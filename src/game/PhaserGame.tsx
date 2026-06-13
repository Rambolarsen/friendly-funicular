import Phaser from 'phaser';
import { useEffect, useRef, useState } from 'react';
import { INITIAL_STATS } from '../constants/initialState';
import { ConsultantClass, GameOverPayload, RawStats } from '../types/game';
import { StatBar } from '../components/StatBar';
import { createGameConfig } from './config';
import { GAME_OVER, STATS_CHANGED } from './eventKeys';

interface PhaserGameProps {
  selectedClass: ConsultantClass;
  onGameOver: (outcome: 'win' | 'lose', stats: RawStats, reason: string | null) => void;
}

export function PhaserGame({ selectedClass, onGameOver }: PhaserGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const onGameOverRef = useRef(onGameOver);
  const [stats, setStats] = useState<RawStats>({ ...INITIAL_STATS });

  useEffect(() => {
    onGameOverRef.current = onGameOver;
  }, [onGameOver]);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const game = new Phaser.Game(createGameConfig(containerRef.current, selectedClass));
    gameRef.current = game;

    const onStatsChanged = (newStats: RawStats) => {
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
  // selectedClass intentionally omitted: registry is set once at game creation
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} />

      {/* HUD overlay — stat bars rendered over the Phaser canvas */}
      <div className="pointer-events-none absolute right-2 top-2 w-48 rounded-xl border border-gray-700 bg-gray-950/80 p-3 backdrop-blur-sm">
        <p className="mb-2 text-[10px] font-bold tracking-widest text-purple-300">
          {selectedClass.emoji} {selectedClass.name.toUpperCase()}
        </p>
        <StatBar label="Budget"           value={stats.budget}           emoji="💰" />
        <StatBar label="Client Happiness" value={stats.clientHappiness}  emoji="😊" />
        <StatBar label="Team Morale"      value={stats.teamMorale}       emoji="💪" />
        <StatBar label="Delivery"         value={stats.deliveryProgress} emoji="🚀" />
        <StatBar label="Tech Debt"        value={stats.technicalDebt}    emoji="🕷️" inverted />
        <StatBar label="Compliance Risk"  value={stats.complianceRisk}   emoji="⚖️" inverted />
      </div>
    </div>
  );
}
