"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const EndScreen_1 = require("./screens/EndScreen");
const StartScreen_1 = require("./screens/StartScreen");
const PhaserGame_1 = require("./game/PhaserGame");
function App() {
    const [phase, setPhase] = (0, react_1.useState)('start');
    const [selectedClass, setSelectedClass] = (0, react_1.useState)(null);
    const [result, setResult] = (0, react_1.useState)(null);
    if (phase === 'start') {
        return ((0, jsx_runtime_1.jsx)(StartScreen_1.StartScreen, { onStart: (cls) => {
                setSelectedClass(cls);
                setPhase('playing');
            } }));
    }
    if (phase === 'end' && result) {
        return ((0, jsx_runtime_1.jsx)(EndScreen_1.EndScreen, { outcome: result.outcome, stats: result.stats, loseReason: result.loseReason, selectedClass: result.selectedClass, onRestart: () => {
                setResult(null);
                setPhase('start');
            } }));
    }
    // 'playing' phase — PhaserGame component mounts here (Issue #4)
    return ((0, jsx_runtime_1.jsx)("div", { className: "w-screen h-screen bg-gray-950", children: (0, jsx_runtime_1.jsx)(PhaserGame_1.PhaserGame, { selectedClass: selectedClass, onGameOver: (outcome, stats, reason) => {
                setResult({ outcome, stats, loseReason: reason, selectedClass: selectedClass });
                setPhase('end');
            } }) }));
}
exports.default = App;
