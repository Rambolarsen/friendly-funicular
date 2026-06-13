import { useCallback, useRef, useState } from 'react';
import { FALLBACK_ROOMS } from '../constants/fallbackRooms';
import { INITIAL_GAME_STATE, INITIAL_STATS } from '../constants/initialState';
import { applyStatChanges, checkWinLose, formatStatChange, makeLogEntry } from '../engine/gameEngine';
import { generateFinalReport, generateRoom, resolveAction } from '../services/aiService';
import { Action, ConsultantClass, GameState, GameStats, LogEntry, Resolution, Room } from '../types/game';

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function pickRange(seed: number, min: number, max: number): number {
  const span = max - min + 1;
  return min + (seed % span);
}

function buildFallbackResolution(
  current: GameState,
  room: Room,
  action: Action,
  customAction?: string,
): Resolution {
  const classId = current.selectedClass?.id ?? 'generalist';
  const seedBase = hashString(`${room.id}|${action.id}|${customAction ?? action.label}|${classId}|${current.roomCount}`);
  const resolution: Resolution = {
    narration: '',
    statChanges: {
      budget: -pickRange(seedBase + 11, 2, 6),
      clientHappiness: pickRange(seedBase + 13, -3, 5),
      technicalDebt: pickRange(seedBase + 17, -2, 6),
      teamMorale: pickRange(seedBase + 19, -4, 4),
      deliveryProgress: pickRange(seedBase + 23, 5, room.isBoss ? 16 : 12),
      complianceRisk: pickRange(seedBase + 29, -3, 4),
    },
  };

  if (room.isBoss) {
    resolution.statChanges.clientHappiness = pickRange(seedBase + 31, 0, 8);
    resolution.statChanges.deliveryProgress = pickRange(seedBase + 37, 10, 18);
  }

  const classModifiers: Record<string, Partial<GameStats>> = {
    architect: { technicalDebt: -6, clientHappiness: -2 },
    developer: { deliveryProgress: 4, technicalDebt: 5 },
    ux: { clientHappiness: 6, complianceRisk: -2 },
    datascientist: { deliveryProgress: 5, complianceRisk: 6, budget: -2 },
    pm: { budget: 5, teamMorale: 4, deliveryProgress: -2 },
    security: { complianceRisk: -7, deliveryProgress: -2, technicalDebt: -1 },
    accountmanager: { clientHappiness: 7, budget: 2 },
    intern: {
      budget: pickRange(seedBase + 41, -12, 12),
      clientHappiness: pickRange(seedBase + 43, -10, 10),
      technicalDebt: pickRange(seedBase + 47, -12, 12),
      teamMorale: pickRange(seedBase + 53, -10, 10),
      deliveryProgress: pickRange(seedBase + 59, -5, 18),
      complianceRisk: pickRange(seedBase + 61, -8, 12),
    },
  };

  const modifier = classModifiers[classId] ?? {};
  for (const [key, value] of Object.entries(modifier) as [keyof GameStats, number][]) {
    resolution.statChanges[key] = (resolution.statChanges[key] ?? 0) + value;
  }

  const effectiveAction = customAction?.trim() || action.label;
  resolution.narration = `You choose to ${effectiveAction.toLowerCase()}. The corporate machinery groans, a slide deck is hastily updated, and at least one senior stakeholder says “let's take this offline.” Somehow, against all governance odds, the engagement lurches forward.`;

  if ((seedBase & 1) === 0) {
    const lootTable = [
      'A blessed RAID of reusable slides',
      'An amulet of executive alignment',
      'A procurement bypass stamp',
      'One suspiciously confident intern',
      'A backlog-clearing enchanted macro',
    ];
    resolution.loot = lootTable[seedBase % lootTable.length];
  }

  return resolution;
}

export function useGameState() {
  const [state, setState] = useState<GameState>(INITIAL_GAME_STATE);
  const stateRef = useRef<GameState>(INITIAL_GAME_STATE);

  const updateState = useCallback((updater: (prev: GameState) => GameState) => {
    setState((prev) => {
      const next = updater(prev);
      stateRef.current = next;
      return next;
    });
  }, []);

  const loadRoom = useCallback(
    async (roomCount: number, isBoss: boolean) => {
      const snapshot = stateRef.current;
      let room = await generateRoom(snapshot, roomCount, isBoss);

      if (!room) {
        const bossRoom = FALLBACK_ROOMS.find((entry) => entry.isBoss)!;
        const nonBossRooms = FALLBACK_ROOMS.filter((entry) => !entry.isBoss);
        room = isBoss
          ? { ...bossRoom, roomNumber: roomCount, floor: Math.ceil(roomCount / 2) }
          : {
              ...nonBossRooms[(roomCount - 1) % nonBossRooms.length],
              roomNumber: roomCount,
              floor: Math.ceil(roomCount / 2),
            };
      }

      updateState((prev) => ({
        ...prev,
        phase: 'playing',
        currentRoom: room,
        roomCount,
        floor: Math.ceil(roomCount / 2),
        log: [...prev.log, makeLogEntry('room', `🚪 Floor ${Math.ceil(roomCount / 2)}, Room ${room.roomNumber}: ${room.roomName}`)],
      }));
    },
    [updateState],
  );

  const startGame = useCallback(
    async (selectedClass: ConsultantClass) => {
      const initialLog: LogEntry[] = [
        makeLogEntry('system', `You have chosen the path of the ${selectedClass.name}. Special ability: ${selectedClass.abilityName}.`),
        makeLogEntry('system', 'The dungeon awaits. May your estimates be accurate and your stakeholders reasonable. Good luck.'),
      ];

      const freshState: GameState = {
        ...INITIAL_GAME_STATE,
        phase: 'playing',
        selectedClass,
        stats: { ...INITIAL_STATS },
        roomCount: 0,
        floor: 1,
        log: initialLog,
      };

      stateRef.current = freshState;
      setState(freshState);
      await loadRoom(1, false);
    },
    [loadRoom],
  );

  const chooseAction = useCallback(
    async (action: Action, customAction?: string) => {
      const current = stateRef.current;
      if (!current.currentRoom || current.phase !== 'playing') {
        return;
      }

      updateState((prev) => ({ ...prev, phase: 'resolving' }));

      const room = current.currentRoom;
      let resolution = await resolveAction(current, room, action, customAction);
      if (!resolution) {
        resolution = buildFallbackResolution(current, room, action, customAction);
      }

      const newStats = applyStatChanges(current.stats, resolution.statChanges);
      const newLogs: LogEntry[] = [...current.log, makeLogEntry('narration', resolution.narration)];

      for (const [key, change] of Object.entries(resolution.statChanges) as [keyof GameStats, number][]) {
        if (change) {
          const clamped = Math.max(-20, Math.min(20, change));
          if (clamped !== 0) {
            newLogs.push(makeLogEntry('stat', formatStatChange(key, clamped)));
          }
        }
      }

      if (resolution.loot) {
        newLogs.push(makeLogEntry('system', `✨ Loot: ${resolution.loot}`));
      }

      const { outcome, reason } = checkWinLose(newStats, room.isBoss);
      if (outcome) {
        const endLog = outcome === 'win'
          ? makeLogEntry('system', '🏆 Delivery complete! Generating final delivery report...')
          : makeLogEntry('system', `💀 Game over: ${reason}`);

        updateState((prev) => ({
          ...prev,
          stats: newStats,
          log: [...newLogs, endLog],
          phase: 'end',
          outcome,
          loseReason: reason,
          finalReport: null,
          currentRoom: room,
        }));

        const reportState: GameState = {
          ...stateRef.current,
          stats: newStats,
          log: [...newLogs, endLog],
          phase: 'end',
          outcome,
          loseReason: reason,
          finalReport: null,
          currentRoom: room,
        };
        const report = await generateFinalReport(reportState);
        updateState((prev) => ({ ...prev, finalReport: report }));
        return;
      }

      const nextRoomCount = room.roomNumber + 1;
      const nextIsBoss = nextRoomCount >= 8;

      updateState((prev) => ({
        ...prev,
        stats: newStats,
        log: newLogs,
        phase: 'playing',
        currentRoom: null,
        roomCount: room.roomNumber,
        floor: Math.ceil(room.roomNumber / 2),
      }));

      await loadRoom(nextRoomCount, nextIsBoss);
    },
    [loadRoom, updateState],
  );

  const resetGame = useCallback(() => {
    const freshState: GameState = {
      ...INITIAL_GAME_STATE,
      stats: { ...INITIAL_STATS },
      log: [],
    };
    stateRef.current = freshState;
    setState(freshState);
  }, []);

  return { state, startGame, chooseAction, resetGame };
}
