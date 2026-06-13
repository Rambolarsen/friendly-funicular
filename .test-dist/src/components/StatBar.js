"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatBar = StatBar;
const jsx_runtime_1 = require("react/jsx-runtime");
function StatBar({ label, value, max = 100, inverted = false, emoji }) {
    const pct = Math.max(0, Math.min(100, (value / max) * 100));
    let color = 'bg-green-500';
    if (inverted) {
        if (pct > 75)
            color = 'bg-red-500';
        else if (pct > 50)
            color = 'bg-orange-500';
        else if (pct > 25)
            color = 'bg-yellow-500';
    }
    else if (pct < 25)
        color = 'bg-red-500';
    else if (pct < 50)
        color = 'bg-orange-500';
    else if (pct < 75)
        color = 'bg-yellow-500';
    const isWarning = inverted ? pct > 75 : pct < 25;
    return ((0, jsx_runtime_1.jsxs)("div", { className: `mb-2 ${isWarning ? 'animate-pulse' : ''}`, children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-1 flex justify-between text-xs", children: [(0, jsx_runtime_1.jsxs)("span", { className: "text-gray-300", children: [emoji, " ", label] }), (0, jsx_runtime_1.jsx)("span", { className: `font-bold ${isWarning ? 'text-red-400' : 'text-gray-200'}`, children: value })] }), (0, jsx_runtime_1.jsx)("div", { className: "h-2.5 w-full overflow-hidden rounded-full bg-gray-800", children: (0, jsx_runtime_1.jsx)("div", { className: `h-2.5 rounded-full transition-all duration-700 ${color}`, style: { width: `${pct}%` } }) })] }));
}
