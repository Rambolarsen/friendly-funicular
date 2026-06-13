import { LevelData } from './types';

// Compact 1280×640 non-scrolling dungeon arena.
// No exit (horde mode). No enemies (server spawns them dynamically).
export const hordeArena: LevelData = {
  width: 1280,
  height: 640,
  playerStart: { x: 640, y: 520 },
  exitX: 99999, // never reached
  platforms: [
    // Ground — full width with two narrow gaps
    { x: 0, y: 590, w: 420, h: 20 },
    { x: 460, y: 590, w: 360, h: 20 },
    { x: 860, y: 590, w: 420, h: 20 },

    // Mid tier — left cluster
    { x: 60, y: 460, w: 180, h: 16 },
    { x: 300, y: 430, w: 160, h: 16 },

    // Mid tier — centre
    { x: 530, y: 400, w: 220, h: 16 },

    // Mid tier — right cluster
    { x: 820, y: 430, w: 160, h: 16 },
    { x: 1040, y: 460, w: 180, h: 16 },

    // High tier — left
    { x: 100, y: 290, w: 140, h: 16 },
    { x: 310, y: 270, w: 130, h: 16 },

    // High tier — centre
    { x: 560, y: 250, w: 160, h: 16 },

    // High tier — right
    { x: 840, y: 270, w: 130, h: 16 },
    { x: 1040, y: 290, w: 140, h: 16 },

    // Ceiling ledges (extra vertical reach)
    { x: 200, y: 150, w: 100, h: 16 },
    { x: 590, y: 130, w: 100, h: 16 },
    { x: 980, y: 150, w: 100, h: 16 },
  ],
  enemies: [],
  loots: [],
};
