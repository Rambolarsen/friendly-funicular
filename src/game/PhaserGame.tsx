import Phaser from 'phaser';
import { useEffect, useMemo, useRef, useState } from 'react';
import { INITIAL_STATS } from '../constants/initialState';
import { AbilityUsedPayload, AttackUsedPayload, ConsultantClass, GameOverPayload, RawStats } from '../types/game';
import { StatBar } from '../components/StatBar';
import { getAbilityCooldownState, getAbilityDefinition } from './abilities';
import { CLASS_ATTACK_DAMAGE } from '../constants/classes';
import { createGameConfig } from './config';
import { ABILITY_USED, ATTACK_USED, GAME_OVER, LEVEL_STARTED, STATS_CHANGED } from './eventKeys';
import { ATTACK_COOLDOWN } from './entities/Player';

interface PhaserGameProps {
  selectedClass: ConsultantClass;
  onGameOver: (outcome: 'win' | 'lose', stats: RawStats, reason: string | null) => void;
}

const ABILITY_THEME_BY_CLASS: Record<string, { accent: string; accentSoft: string; shadow: string }> = {
  architect: { accent: '#a78bfa', accentSoft: 'rgba(167, 139, 250, 0.22)', shadow: 'rgba(167, 139, 250, 0.35)' },
  developer: { accent: '#38bdf8', accentSoft: 'rgba(56, 189, 248, 0.22)', shadow: 'rgba(56, 189, 248, 0.35)' },
  ux: { accent: '#f472b6', accentSoft: 'rgba(244, 114, 182, 0.22)', shadow: 'rgba(244, 114, 182, 0.35)' },
  datascientist: { accent: '#34d399', accentSoft: 'rgba(52, 211, 153, 0.22)', shadow: 'rgba(52, 211, 153, 0.35)' },
  pm: { accent: '#f59e0b', accentSoft: 'rgba(245, 158, 11, 0.22)', shadow: 'rgba(245, 158, 11, 0.35)' },
  security: { accent: '#fb7185', accentSoft: 'rgba(251, 113, 133, 0.22)', shadow: 'rgba(251, 113, 133, 0.35)' },
  accountmanager: { accent: '#2dd4bf', accentSoft: 'rgba(45, 212, 191, 0.22)', shadow: 'rgba(45, 212, 191, 0.35)' },
  intern: { accent: '#e879f9', accentSoft: 'rgba(232, 121, 249, 0.22)', shadow: 'rgba(232, 121, 249, 0.35)' },
};

export function PhaserGame({ selectedClass, onGameOver }: PhaserGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const onGameOverRef = useRef(onGameOver);
  const [stats, setStats] = useState<RawStats>({ ...INITIAL_STATS });
  const [abilityCooldown, setAbilityCooldown] = useState<(AbilityUsedPayload & { activatedAt: number }) | null>(null);
  const [cooldownNow, setCooldownNow] = useState(() => Date.now());
  const [attackCooldown, setAttackCooldown] = useState<(AttackUsedPayload & { activatedAt: number }) | null>(null);
  const [attackCooldownNow, setAttackCooldownNow] = useState(() => Date.now());
  const abilityDefinition = useMemo(() => getAbilityDefinition(selectedClass.id), [selectedClass.id]);

  useEffect(() => {
    onGameOverRef.current = onGameOver;
  }, [onGameOver]);

  useEffect(() => {
    if (!abilityCooldown) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setCooldownNow(Date.now());
      if (Date.now() - abilityCooldown.activatedAt >= abilityCooldown.cooldownMs) {
        window.clearInterval(timer);
      }
    }, 100);

    return () => {
      window.clearInterval(timer);
    };
  }, [abilityCooldown]);

  useEffect(() => {
    if (!attackCooldown) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setAttackCooldownNow(Date.now());
      if (Date.now() - attackCooldown.activatedAt >= attackCooldown.cooldownMs) {
        window.clearInterval(timer);
      }
    }, 50);

    return () => {
      window.clearInterval(timer);
    };
  }, [attackCooldown]);

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

    const onAbilityUsed = ({ name, cooldownMs }: AbilityUsedPayload) => {
      const activatedAt = Date.now();
      setAbilityCooldown({ name, cooldownMs, activatedAt });
      setCooldownNow(activatedAt);
    };

    const onAttackUsed = ({ cooldownMs }: AttackUsedPayload) => {
      const activatedAt = Date.now();
      setAttackCooldown({ cooldownMs, activatedAt });
      setAttackCooldownNow(activatedAt);
    };

    const onLevelStarted = () => {
      setAbilityCooldown(null);
      setCooldownNow(Date.now());
    };

    game.events.on(STATS_CHANGED, onStatsChanged);
    game.events.on(GAME_OVER, onGameOverEvent);
    game.events.on(ABILITY_USED, onAbilityUsed);
    game.events.on(ATTACK_USED, onAttackUsed);
    game.events.on(LEVEL_STARTED, onLevelStarted);

    return () => {
      game.events.off(STATS_CHANGED, onStatsChanged);
      game.events.off(GAME_OVER, onGameOverEvent);
      game.events.off(ABILITY_USED, onAbilityUsed);
      game.events.off(ATTACK_USED, onAttackUsed);
      game.events.off(LEVEL_STARTED, onLevelStarted);
      game.destroy(true);
      gameRef.current = null;
    };
  // selectedClass intentionally omitted: registry is set once at game creation
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const abilityUi = useMemo(() => {
    return getAbilityCooldownState(
      abilityCooldown
        ? {
          activatedAt: abilityCooldown.activatedAt,
          cooldownMs: abilityCooldown.cooldownMs,
          now: cooldownNow,
        }
        : null,
    );
  }, [abilityCooldown, cooldownNow]);

  const attackUi = useMemo(() => {
    return getAbilityCooldownState(
      attackCooldown
        ? {
          activatedAt: attackCooldown.activatedAt,
          cooldownMs: attackCooldown.cooldownMs,
          now: attackCooldownNow,
        }
        : null,
    );
  }, [attackCooldown, attackCooldownNow]);

  const attackDamageLabel = useMemo(() => {
    const dmg = CLASS_ATTACK_DAMAGE[selectedClass.id];
    return dmg === null || dmg === undefined ? '10–40 dmg (random)' : `${dmg} dmg`;
  }, [selectedClass.id]);

  const abilityTheme = ABILITY_THEME_BY_CLASS[selectedClass.id] ?? ABILITY_THEME_BY_CLASS.developer;
  const totalCooldownLabel = `${(abilityDefinition.cooldownMs / 1000).toFixed(0)}s cooldown`;
  const cooldownDegrees = abilityUi.progress * 360;
  const cooldownRing = `conic-gradient(${abilityTheme.accent} 0deg ${cooldownDegrees}deg, rgba(15, 23, 42, 0.72) ${cooldownDegrees}deg 360deg)`;

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

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

      <div className="group pointer-events-auto absolute left-56 top-2">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl p-[3px] shadow-lg transition-transform duration-150 group-hover:scale-105"
          style={{
            background: `conic-gradient(#94a3b8 0deg ${attackUi.progress * 360}deg, rgba(15, 23, 42, 0.72) ${attackUi.progress * 360}deg 360deg)`,
            boxShadow: '0 0 12px rgba(148, 163, 184, 0.3)',
          }}
        >
          <div
            className="flex h-full w-full items-center justify-center rounded-[8px] border border-slate-700/60 bg-slate-950/90 backdrop-blur-sm"
            style={{ color: '#94a3b8' }}
          >
            <span className="text-base font-black uppercase leading-none">E</span>
          </div>
        </div>
        <div className="pointer-events-none absolute left-0 top-full mt-2 w-48 rounded-lg border border-slate-700/60 bg-slate-950/95 p-3 opacity-0 shadow-lg transition-all duration-150 group-hover:translate-y-0 group-hover:opacity-100">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-300">
            E · Basic Attack
          </p>
          <p className="mt-2 text-[11px] text-slate-100">
            Melee strike that deals damage to enemies in range.
          </p>
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            {attackDamageLabel}
          </p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            {attackUi.remainingLabel} · {(ATTACK_COOLDOWN / 1000).toFixed(1)}s cooldown
          </p>
        </div>
      </div>

      <div className="group pointer-events-auto absolute left-72 top-2">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-xl p-[3px] shadow-lg transition-transform duration-150 group-hover:scale-105"
          style={{
            background: cooldownRing,
            boxShadow: `0 0 18px ${abilityTheme.shadow}`,
          }}
        >
          <div
            className="flex h-full w-full items-center justify-center rounded-[10px] border bg-slate-950/90 backdrop-blur-sm"
            style={{
              borderColor: abilityTheme.accentSoft,
              color: abilityTheme.accent,
            }}
          >
            <span className="text-2xl font-black uppercase leading-none">Q</span>
          </div>
        </div>
        <div
          className="pointer-events-none absolute left-0 top-full mt-2 w-64 rounded-lg border bg-slate-950/95 p-3 opacity-0 shadow-lg transition-all duration-150 group-hover:translate-y-0 group-hover:opacity-100"
          style={{
            borderColor: abilityTheme.accentSoft,
            boxShadow: `0 10px 30px ${abilityTheme.shadow}`,
          }}
        >
          <p className="text-[10px] font-black uppercase tracking-[0.24em]" style={{ color: abilityTheme.accent }}>
            Q · {abilityDefinition.name}
          </p>
          <p className="mt-2 text-[11px] text-slate-100">
            {abilityDefinition.description}
          </p>
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: abilityTheme.accent }}>
            {abilityDefinition.rangeLabel}
          </p>
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: abilityTheme.accent }}>
            {abilityUi.remainingLabel} · {totalCooldownLabel}
          </p>
        </div>
      </div>
    </div>
  );
}
