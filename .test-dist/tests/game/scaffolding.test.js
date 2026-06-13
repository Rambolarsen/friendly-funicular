"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const classes_1 = require("../../src/constants/classes");
const eventKeys_1 = require("../../src/game/eventKeys");
const level2_1 = require("../../src/game/levels/level2");
const level3_1 = require("../../src/game/levels/level3");
(0, node_test_1.default)('class metadata exposes the active ability names from the gameplay docs', () => {
    strict_1.default.deepEqual(classes_1.CONSULTANT_CLASSES.map((cls) => cls.abilityName), [
        'Draft Architecture',
        'Ship Hotfix',
        'User Research',
        'Run the Model',
        'Call a Meeting',
        'Deploy Firewall',
        'Escalate',
        'Wildcard',
    ]);
});
(0, node_test_1.default)('ability usage emits the dedicated gameplay event key', () => {
    strict_1.default.equal(eventKeys_1.ABILITY_USED, 'ability-used');
});
(0, node_test_1.default)('level transitions emit a dedicated scene-start event key', () => {
    strict_1.default.equal(eventKeys_1.LEVEL_STARTED, 'level-started');
});
(0, node_test_1.default)('level 2 and level 3 extend progression with the planned loot mix', () => {
    strict_1.default.equal(level2_1.level2.width, 4000);
    strict_1.default.equal(level2_1.level2.loots.length, 5);
    strict_1.default.equal(level2_1.level2.loots.some((loot) => loot.type === 'compliance'), true);
    strict_1.default.equal(level3_1.level3.width, 3600);
    strict_1.default.equal(level3_1.level3.loots.length, 5);
    strict_1.default.equal(level3_1.level3.loots.some((loot) => loot.type === 'compliance'), true);
});
