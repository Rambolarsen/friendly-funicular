"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Boss = void 0;
const Health_1 = require("../valueObjects/Health");
const Enemy_1 = require("./Enemy");
const BOSS_HP = 300;
const BOSS_CHARGED_ATTACK_DAMAGE = 20;
const BOSS_STAT_DROP = { deliveryProgress: 20, clientHappiness: 10 };
class Boss extends Enemy_1.Enemy {
    chargedAttackDamage;
    constructor(instanceId, health, chargedAttackDamage) {
        super(instanceId, 'procurementTroll', health, BOSS_STAT_DROP);
        this.chargedAttackDamage = chargedAttackDamage;
    }
    static spawnBoss() {
        return new Boss(crypto.randomUUID(), Health_1.Health.of(BOSS_HP), BOSS_CHARGED_ATTACK_DAMAGE);
    }
    takeDamage(amount) {
        return new Boss(this.instanceId, this.health.take(amount), this.chargedAttackDamage);
    }
}
exports.Boss = Boss;
