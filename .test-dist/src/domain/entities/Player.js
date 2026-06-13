"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Player = void 0;
const classes_1 = require("../../constants/classes");
const Health_1 = require("../valueObjects/Health");
const PLAYER_MAX_HP = 100;
class Player {
    classId;
    health;
    classModifiers;
    constructor(classId, health, classModifiers) {
        this.classId = classId;
        this.health = health;
        this.classModifiers = classModifiers;
    }
    static create(cls) {
        const modifiers = classes_1.CLASS_MODIFIERS[cls.id] ?? {};
        return new Player(cls.id, Health_1.Health.of(PLAYER_MAX_HP), modifiers);
    }
    takeDamage(amount) {
        return new Player(this.classId, this.health.take(amount), this.classModifiers);
    }
    isAlive() {
        return !this.health.isDead();
    }
    killBonusFor(enemy) {
        if (this.classId === 'intern') {
            return this.randomInternBonus();
        }
        return mergePartialStats(enemy.statDropOnDefeat, this.classModifiers);
    }
    randomInternBonus() {
        const keys = [
            'budget', 'clientHappiness', 'technicalDebt', 'teamMorale',
            'deliveryProgress', 'complianceRisk',
        ];
        const key = keys[Math.floor(Math.random() * keys.length)];
        const value = Math.floor(Math.random() * 20) - 8;
        return { [key]: value };
    }
}
exports.Player = Player;
function mergePartialStats(a, b) {
    const result = { ...a };
    for (const k of Object.keys(b)) {
        result[k] = ((result[k] ?? 0) + (b[k] ?? 0));
    }
    return result;
}
