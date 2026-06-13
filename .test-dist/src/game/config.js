"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGameConfig = createGameConfig;
const phaser_1 = __importDefault(require("phaser"));
const initialState_1 = require("../constants/initialState");
const BootScene_1 = require("./scenes/BootScene");
const GameScene_1 = require("./scenes/GameScene");
function createGameConfig(parent, selectedClass) {
    return {
        type: phaser_1.default.AUTO,
        backgroundColor: '#1a1a2e',
        scale: {
            mode: phaser_1.default.Scale.FIT,
            autoCenter: phaser_1.default.Scale.CENTER_BOTH,
            width: 960,
            height: 540,
            parent,
        },
        physics: {
            default: 'arcade',
            arcade: { gravity: { x: 0, y: 1800 }, debug: false },
        },
        scene: [BootScene_1.BootScene, GameScene_1.GameScene],
        callbacks: {
            preBoot: (game) => {
                game.registry.set('selectedClass', selectedClass);
                game.registry.set('stats', { ...initialState_1.INITIAL_STATS });
                game.registry.set('levelIndex', 0);
            },
        },
    };
}
