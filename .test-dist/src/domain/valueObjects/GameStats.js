"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameStats = void 0;
const statRules_1 = require("../rules/statRules");
const initialState_1 = require("../../constants/initialState");
class GameStats {
    budget;
    clientHappiness;
    technicalDebt;
    teamMorale;
    deliveryProgress;
    complianceRisk;
    constructor(raw) {
        this.budget = raw.budget;
        this.clientHappiness = raw.clientHappiness;
        this.technicalDebt = raw.technicalDebt;
        this.teamMorale = raw.teamMorale;
        this.deliveryProgress = raw.deliveryProgress;
        this.complianceRisk = raw.complianceRisk;
    }
    static initial() {
        return new GameStats(initialState_1.INITIAL_STATS);
    }
    static from(raw) {
        return new GameStats({
            budget: (0, statRules_1.clampStat)(raw.budget),
            clientHappiness: (0, statRules_1.clampStat)(raw.clientHappiness),
            technicalDebt: (0, statRules_1.clampStat)(raw.technicalDebt),
            teamMorale: (0, statRules_1.clampStat)(raw.teamMorale),
            deliveryProgress: (0, statRules_1.clampStat)(raw.deliveryProgress),
            complianceRisk: (0, statRules_1.clampStat)(raw.complianceRisk),
        });
    }
    apply(changes) {
        const next = {
            budget: (0, statRules_1.clampStat)(this.budget + (0, statRules_1.clampStatChange)(changes.budget ?? 0)),
            clientHappiness: (0, statRules_1.clampStat)(this.clientHappiness + (0, statRules_1.clampStatChange)(changes.clientHappiness ?? 0)),
            technicalDebt: (0, statRules_1.clampStat)(this.technicalDebt + (0, statRules_1.clampStatChange)(changes.technicalDebt ?? 0)),
            teamMorale: (0, statRules_1.clampStat)(this.teamMorale + (0, statRules_1.clampStatChange)(changes.teamMorale ?? 0)),
            deliveryProgress: (0, statRules_1.clampStat)(this.deliveryProgress + (0, statRules_1.clampStatChange)(changes.deliveryProgress ?? 0)),
            complianceRisk: (0, statRules_1.clampStat)(this.complianceRisk + (0, statRules_1.clampStatChange)(changes.complianceRisk ?? 0)),
        };
        return new GameStats(next);
    }
    toPlain() {
        return {
            budget: this.budget,
            clientHappiness: this.clientHappiness,
            technicalDebt: this.technicalDebt,
            teamMorale: this.teamMorale,
            deliveryProgress: this.deliveryProgress,
            complianceRisk: this.complianceRisk,
        };
    }
}
exports.GameStats = GameStats;
