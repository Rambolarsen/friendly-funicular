"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StartScreen = StartScreen;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const ClassCard_1 = require("../components/ClassCard");
const classes_1 = require("../constants/classes");
function StartScreen({ onStart }) {
    const [selected, setSelected] = (0, react_1.useState)(null);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex min-h-screen flex-col items-center justify-start overflow-y-auto bg-gray-950 p-6 text-gray-100", children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-8 mt-4 text-center", children: [(0, jsx_runtime_1.jsx)("div", { className: "mb-4 text-6xl", children: "\uD83C\uDFF0" }), (0, jsx_runtime_1.jsx)("h1", { className: "mb-2 text-4xl font-black tracking-widest text-purple-300 md:text-5xl", style: { fontFamily: 'Cinzel Decorative, serif' }, children: "DUNGEONS" }), (0, jsx_runtime_1.jsx)("h2", { className: "mb-4 text-2xl font-bold tracking-wider text-amber-400 md:text-3xl", style: { fontFamily: 'Cinzel Decorative, serif' }, children: "& DELIVERABLES" }), (0, jsx_runtime_1.jsxs)("div", { className: "mx-auto max-w-lg rounded-lg border border-gray-800 bg-gray-900/50 p-4 text-sm leading-relaxed text-gray-400", children: [(0, jsx_runtime_1.jsx)("p", { className: "mb-2", children: "You are a consultant. The client is a dungeon." }), (0, jsx_runtime_1.jsx)("p", { className: "mb-2", children: "Navigate rooms of vague requirements, legacy systems, procurement trolls, and GDPR wraiths." }), (0, jsx_runtime_1.jsx)("p", { children: "Survive the Boardroom Boss with strong delivery progress before your budget, morale, or sanity runs out." })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "w-full max-w-4xl", children: [(0, jsx_runtime_1.jsx)("h3", { className: "mb-4 text-center text-xl font-bold tracking-widest text-purple-300", children: "\u2694\uFE0F CHOOSE YOUR CLASS \u2694\uFE0F" }), (0, jsx_runtime_1.jsx)("div", { className: "mb-8 grid grid-cols-2 gap-3 md:grid-cols-4", children: classes_1.CONSULTANT_CLASSES.map((cls) => ((0, jsx_runtime_1.jsx)(ClassCard_1.ClassCard, { cls: cls, onSelect: setSelected, selected: selected?.id === cls.id }, cls.id))) }), (0, jsx_runtime_1.jsx)("div", { className: "text-center", children: (0, jsx_runtime_1.jsx)("button", { onClick: () => selected && onStart(selected), disabled: !selected, className: `
              rounded-xl px-10 py-4 text-lg font-bold tracking-widest transition-all duration-200
              ${selected
                                ? 'cursor-pointer bg-purple-700 text-white shadow-lg shadow-purple-900/50 hover:bg-purple-600 active:scale-95'
                                : 'cursor-not-allowed bg-gray-800 text-gray-600'}
            `, children: selected ? `⚔️ ENTER THE DUNGEON AS ${selected.name.toUpperCase()} ⚔️` : 'SELECT A CLASS TO BEGIN' }) })] })] }));
}
