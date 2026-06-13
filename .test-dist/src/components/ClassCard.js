"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassCard = ClassCard;
const jsx_runtime_1 = require("react/jsx-runtime");
function ClassCard({ cls, onSelect, selected }) {
    return ((0, jsx_runtime_1.jsxs)("button", { onClick: () => onSelect(cls), className: `
        cursor-pointer rounded-xl border-2 p-4 text-left transition-all duration-200
        ${selected
            ? 'border-purple-400 bg-purple-900/40 shadow-lg shadow-purple-900/50'
            : 'border-gray-700 bg-gray-900 hover:border-purple-600 hover:bg-gray-800'}
      `, children: [(0, jsx_runtime_1.jsx)("div", { className: "mb-2 text-3xl", children: cls.emoji }), (0, jsx_runtime_1.jsx)("div", { className: "mb-1 text-sm font-bold text-purple-200", children: cls.name }), (0, jsx_runtime_1.jsxs)("div", { className: "mb-2 text-xs font-semibold italic text-amber-400", children: ["\u2728 ", cls.abilityName] }), (0, jsx_runtime_1.jsx)("div", { className: "mb-2 text-xs text-gray-400", children: cls.description }), (0, jsx_runtime_1.jsxs)("div", { className: "text-xs italic text-gray-500", children: ["\"", cls.flavor, "\""] })] }));
}
