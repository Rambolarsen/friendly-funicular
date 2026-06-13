"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clampStat = clampStat;
exports.clampStatChange = clampStatChange;
exports.applyStatChanges = applyStatChanges;
function clampStat(value) {
    return Math.max(0, Math.min(100, value));
}
function clampStatChange(change) {
    return Math.max(-20, Math.min(20, change));
}
function applyStatChanges(current, changes) {
    const next = { ...current };
    for (const key of Object.keys(changes)) {
        const clamped = clampStatChange(changes[key] ?? 0);
        next[key] = clampStat(current[key] + clamped);
    }
    return next;
}
