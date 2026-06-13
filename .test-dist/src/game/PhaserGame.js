"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhaserGame = PhaserGame;
const jsx_runtime_1 = require("react/jsx-runtime");
const phaser_1 = __importDefault(require("phaser"));
const react_1 = require("react");
const initialState_1 = require("../constants/initialState");
const StatBar_1 = require("../components/StatBar");
const abilities_1 = require("./abilities");
const config_1 = require("./config");
const eventKeys_1 = require("./eventKeys");
function PhaserGame({ selectedClass, onGameOver }) {
    const containerRef = (0, react_1.useRef)(null);
    const gameRef = (0, react_1.useRef)(null);
    const onGameOverRef = (0, react_1.useRef)(onGameOver);
    const [stats, setStats] = (0, react_1.useState)({ ...initialState_1.INITIAL_STATS });
    const [abilityCooldown, setAbilityCooldown] = (0, react_1.useState)(null);
    const [cooldownNow, setCooldownNow] = (0, react_1.useState)(() => Date.now());
    const abilityDefinition = (0, react_1.useMemo)(() => (0, abilities_1.getAbilityDefinition)(selectedClass.id), [selectedClass.id]);
    (0, react_1.useEffect)(() => {
        onGameOverRef.current = onGameOver;
    }, [onGameOver]);
    (0, react_1.useEffect)(() => {
        if (!abilityCooldown) {
            return undefined;
        }
        const timer = window.setInterval(() => {
            setCooldownNow(Date.now());
            if (Date.now() - abilityCooldown.activatedAt >= abilityCooldown.cooldownMs) {
                window.clearInterval(timer);
            }
        }, 100);
        return () => {
            window.clearInterval(timer);
        };
    }, [abilityCooldown]);
    (0, react_1.useEffect)(() => {
        if (!containerRef.current || gameRef.current)
            return;
        const game = new phaser_1.default.Game((0, config_1.createGameConfig)(containerRef.current, selectedClass));
        gameRef.current = game;
        const onStatsChanged = (newStats) => {
            setStats({ ...newStats });
        };
        const onGameOverEvent = ({ outcome, stats: finalStats, reason }) => {
            onGameOverRef.current(outcome, finalStats, reason);
        };
        const onAbilityUsed = ({ name, cooldownMs }) => {
            const activatedAt = Date.now();
            setAbilityCooldown({ name, cooldownMs, activatedAt });
            setCooldownNow(activatedAt);
        };
        const onLevelStarted = () => {
            setAbilityCooldown(null);
            setCooldownNow(Date.now());
        };
        game.events.on(eventKeys_1.STATS_CHANGED, onStatsChanged);
        game.events.on(eventKeys_1.GAME_OVER, onGameOverEvent);
        game.events.on(eventKeys_1.ABILITY_USED, onAbilityUsed);
        game.events.on(eventKeys_1.LEVEL_STARTED, onLevelStarted);
        return () => {
            game.events.off(eventKeys_1.STATS_CHANGED, onStatsChanged);
            game.events.off(eventKeys_1.GAME_OVER, onGameOverEvent);
            game.events.off(eventKeys_1.ABILITY_USED, onAbilityUsed);
            game.events.off(eventKeys_1.LEVEL_STARTED, onLevelStarted);
            game.destroy(true);
            gameRef.current = null;
        };
        // selectedClass intentionally omitted: registry is set once at game creation
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const abilityUi = (0, react_1.useMemo)(() => {
        return (0, abilities_1.getAbilityCooldownState)(abilityCooldown
            ? {
                activatedAt: abilityCooldown.activatedAt,
                cooldownMs: abilityCooldown.cooldownMs,
                now: cooldownNow,
            }
            : null);
    }, [abilityCooldown, cooldownNow]);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "relative w-full h-full", children: [(0, jsx_runtime_1.jsx)("div", { ref: containerRef, className: "w-full h-full" }), (0, jsx_runtime_1.jsxs)("div", { className: "pointer-events-none absolute right-2 top-2 w-48 rounded-xl border border-gray-700 bg-gray-950/80 p-3 backdrop-blur-sm", children: [(0, jsx_runtime_1.jsxs)("p", { className: "mb-2 text-[10px] font-bold tracking-widest text-purple-300", children: [selectedClass.emoji, " ", selectedClass.name.toUpperCase()] }), (0, jsx_runtime_1.jsx)(StatBar_1.StatBar, { label: "Budget", value: stats.budget, emoji: "\uD83D\uDCB0" }), (0, jsx_runtime_1.jsx)(StatBar_1.StatBar, { label: "Client Happiness", value: stats.clientHappiness, emoji: "\uD83D\uDE0A" }), (0, jsx_runtime_1.jsx)(StatBar_1.StatBar, { label: "Team Morale", value: stats.teamMorale, emoji: "\uD83D\uDCAA" }), (0, jsx_runtime_1.jsx)(StatBar_1.StatBar, { label: "Delivery", value: stats.deliveryProgress, emoji: "\uD83D\uDE80" }), (0, jsx_runtime_1.jsx)(StatBar_1.StatBar, { label: "Tech Debt", value: stats.technicalDebt, emoji: "\uD83D\uDD77\uFE0F", inverted: true }), (0, jsx_runtime_1.jsx)(StatBar_1.StatBar, { label: "Compliance Risk", value: stats.complianceRisk, emoji: "\u2696\uFE0F", inverted: true })] }), (0, jsx_runtime_1.jsx)("div", { className: "pointer-events-none absolute left-28 top-2 max-w-[min(28rem,calc(100%-14rem))] rounded-xl border border-cyan-400/35 bg-slate-950/80 px-3 py-2 backdrop-blur-sm", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-start justify-between gap-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "min-w-0", children: [(0, jsx_runtime_1.jsxs)("p", { className: "truncate text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100", children: ["Q \u00B7 ", abilityDefinition.name] }), (0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-[11px] text-slate-100", children: abilityDefinition.description }), (0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300/90", children: abilityDefinition.rangeLabel })] }), (0, jsx_runtime_1.jsxs)("div", { className: "min-w-14 text-right", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300", children: abilityUi.remainingLabel }), (0, jsx_runtime_1.jsx)("div", { className: "mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800", children: (0, jsx_runtime_1.jsx)("div", { className: "h-full rounded-full bg-cyan-400 transition-[width] duration-100", style: { width: `${abilityUi.progress * 100}%` } }) })] })] }) })] }));
}
