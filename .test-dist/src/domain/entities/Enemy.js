"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Enemy = void 0;
const Health_1 = require("../valueObjects/Health");
const ENEMY_CONFIGS = {
    scopeCreepGoblin: { hp: 30, statDropOnDefeat: { budget: -5, deliveryProgress: 8 } },
    jiraWraith: { hp: 20, statDropOnDefeat: { teamMorale: -3, deliveryProgress: 6 } },
    procurementTroll: { hp: 60, statDropOnDefeat: { budget: -10, deliveryProgress: 12 } },
    gdprSpectre: { hp: 25, statDropOnDefeat: { complianceRisk: -15 } },
};
class Enemy {
    instanceId;
    type;
    health;
    statDropOnDefeat;
    constructor(instanceId, type, health, statDropOnDefeat) {
        this.instanceId = instanceId;
        this.type = type;
        this.health = health;
        this.statDropOnDefeat = statDropOnDefeat;
    }
    static spawn(type) {
        const cfg = ENEMY_CONFIGS[type];
        return new Enemy(crypto.randomUUID(), type, Health_1.Health.of(cfg.hp), cfg.statDropOnDefeat);
    }
    takeDamage(amount) {
        return new Enemy(this.instanceId, this.type, this.health.take(amount), this.statDropOnDefeat);
    }
    isAlive() {
        return !this.health.isDead();
    }
}
exports.Enemy = Enemy;
