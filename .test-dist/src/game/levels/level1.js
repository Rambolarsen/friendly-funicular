"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.level1 = void 0;
const types_1 = require("./types");
exports.level1 = {
    width: 3200,
    height: 540,
    playerStart: { x: 80, y: 420 },
    exitX: 3100,
    platforms: [
        // Ground segments (with gaps to jump over)
        { x: 0, y: 490, w: 600, h: 20 },
        { x: 680, y: 490, w: 500, h: 20 },
        { x: 1260, y: 490, w: 400, h: 20 },
        { x: 1740, y: 490, w: 600, h: 20 },
        { x: 2420, y: 490, w: 400, h: 20 },
        { x: 2900, y: 490, w: 400, h: 20 },
        // Elevated platforms
        { x: 400, y: 380, w: 160, h: 16 },
        { x: 700, y: 320, w: 160, h: 16 },
        { x: 980, y: 370, w: 120, h: 16 },
        { x: 1200, y: 310, w: 160, h: 16 },
        { x: 1450, y: 360, w: 140, h: 16 },
        { x: 1650, y: 290, w: 180, h: 16 },
        { x: 1920, y: 360, w: 120, h: 16 },
        { x: 2100, y: 300, w: 160, h: 16 },
        { x: 2350, y: 360, w: 120, h: 16 },
        { x: 2600, y: 320, w: 160, h: 16 },
        { x: 2800, y: 260, w: 120, h: 16 },
    ],
    enemies: [
        { type: types_1.EnemyType.Goblin, x: 300, y: 440 },
        { type: types_1.EnemyType.Goblin, x: 750, y: 440 },
        { type: types_1.EnemyType.Wraith, x: 900, y: 440 },
        { type: types_1.EnemyType.Goblin, x: 1100, y: 440 },
        { type: types_1.EnemyType.Troll, x: 1350, y: 440 },
        { type: types_1.EnemyType.Wraith, x: 1550, y: 440 },
        { type: types_1.EnemyType.Spectre, x: 1800, y: 440 },
        { type: types_1.EnemyType.Goblin, x: 2000, y: 440 },
        { type: types_1.EnemyType.Troll, x: 2150, y: 440 },
        { type: types_1.EnemyType.Spectre, x: 2500, y: 440 },
        { type: types_1.EnemyType.Wraith, x: 2700, y: 440 },
        { type: types_1.EnemyType.Troll, x: 2950, y: 440 },
    ],
    loots: [
        { type: 'budget', x: 450, y: 350 },
        { type: 'morale', x: 1250, y: 280 },
        { type: 'debt', x: 2110, y: 270 },
        { type: 'budget', x: 2650, y: 290 },
    ],
};
