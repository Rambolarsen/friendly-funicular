# Class Card Visual Differentiation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each consultant class card a unique accent color and pixel-art sprite so players can distinguish classes at a glance.

**Architecture:** Add `color` and `spriteFrame` to the `ConsultantClass` type, populate them in `classes.ts`, then update `ClassCard.tsx` to render a CSS-sprite character instead of the emoji and apply per-class border/name coloring.

**Tech Stack:** TypeScript, React, Tailwind CSS, Vite

---

## File Map

| File | Change |
|------|--------|
| `src/types/game.ts` | Add `color: string` and `spriteFrame: number` to `ConsultantClass` |
| `src/constants/classes.ts` | Add `color` and `spriteFrame` values to each class entry |
| `src/components/ClassCard.tsx` | Render sprite div instead of emoji; use `cls.color` for border/name |

No new files. No test suite exists in this project — verify with lint, build, and visual inspection via `npm run dev`.

---

### Task 1: Extend the ConsultantClass type

**Files:**
- Modify: `src/types/game.ts`

- [ ] **Step 1: Add `color` and `spriteFrame` to `ConsultantClass`**

Replace the `ConsultantClass` type in `src/types/game.ts`:

```ts
export type ConsultantClass = {
  id: string;
  name: string;
  emoji: string;
  abilityName: string;
  description: string;
  flavor: string;
  color: string;       // CSS accent color for border and name text
  spriteFrame: number; // Frame index in chars.png (9×3 spritesheet, 24×24 frames, 1px gap)
};
```

- [ ] **Step 2: Run the build to see which files now have type errors**

```bash
npm run build
```

Expected: TypeScript errors in `src/constants/classes.ts` because the class objects are missing `color` and `spriteFrame`. No errors anywhere else.

---

### Task 2: Add color and spriteFrame to each class constant

**Files:**
- Modify: `src/constants/classes.ts`

- [ ] **Step 1: Update CONSULTANT_CLASSES with color and spriteFrame**

Replace the full `CONSULTANT_CLASSES` array in `src/constants/classes.ts`:

```ts
import { ConsultantClass, RawStats } from '../types/game';

export const CONSULTANT_CLASSES: ConsultantClass[] = [
  {
    id: 'architect',
    name: 'Architect',
    emoji: '🏛️',
    abilityName: 'Draw Boxes and Arrows',
    description: 'Master of diagrams and abstractions. Reduces technical debt but clients grow impatient.',
    flavor: '"Have you considered a microservices approach?"',
    color: '#f59e0b',
    spriteFrame: 11,
  },
  {
    id: 'developer',
    name: 'Developer',
    emoji: '💻',
    abilityName: 'Ship MVP',
    description: 'Gets things done fast. Delivery progress surges but technical debt may follow.',
    flavor: '"It works on my machine."',
    color: '#22d3ee',
    spriteFrame: 12,
  },
  {
    id: 'ux',
    name: 'UX Designer',
    emoji: '🎨',
    abilityName: 'Talk to Users',
    description: 'Clarifies requirements and boosts client happiness. Enemies hate being understood.',
    flavor: '"But did you test it with actual users?"',
    color: '#f472b6',
    spriteFrame: 13,
  },
  {
    id: 'datascientist',
    name: 'Data Scientist',
    emoji: '📊',
    abilityName: 'Train Model Anyway',
    description: 'Devastating in AI rooms. Powerful but risky — compliance risk may spike.',
    flavor: '"The model is 94% accurate. On training data."',
    color: '#a78bfa',
    spriteFrame: 14,
  },
  {
    id: 'pm',
    name: 'Project Manager',
    emoji: '📋',
    abilityName: 'Rebaseline Timeline',
    description: 'Restores budget and morale. May frustrate stakeholders with new slide decks.',
    flavor: '"According to my updated Gantt chart…"',
    color: '#34d399',
    spriteFrame: 15,
  },
  {
    id: 'security',
    name: 'Security Consultant',
    emoji: '🔒',
    abilityName: 'Threat Model',
    description: 'Slays compliance threats. Slows delivery but keeps the regulators away.',
    flavor: '"That feature is a GDPR violation waiting to happen."',
    color: '#fb923c',
    spriteFrame: 16,
  },
  {
    id: 'accountmanager',
    name: 'Account Manager',
    emoji: '🤝',
    abilityName: 'Relationship Shield',
    description: 'Prevents client happiness from dropping once per encounter. Smooth talker.',
    flavor: '"I\'ll set up a call."',
    color: '#fbbf24',
    spriteFrame: 17,
  },
  {
    id: 'intern',
    name: 'Intern',
    emoji: '🎲',
    abilityName: 'Wild Vibe Code',
    description: 'Total wildcard. Massive upside or catastrophic disaster. No in-between.',
    flavor: '"I used ChatGPT for the whole backend, is that okay?"',
    color: '#e879f9',
    spriteFrame: 18,
  },
];

/** Passive stat bonuses applied when this class kills an enemy. */
export const CLASS_MODIFIERS: Record<string, Partial<RawStats>> = {
  architect:      { technicalDebt: -4 },
  developer:      { deliveryProgress: 3 },
  ux:             { clientHappiness: 4 },
  datascientist:  { deliveryProgress: 4, complianceRisk: 2 },
  pm:             { teamMorale: 3 },
  security:       { complianceRisk: -5 },
  accountmanager: { clientHappiness: 3 },
  intern:         {},
};
```

- [ ] **Step 2: Run build to confirm type errors are resolved**

```bash
npm run build
```

Expected: No TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/game.ts src/constants/classes.ts
git commit -m "feat: add color and spriteFrame to ConsultantClass type and constants"
```

---

### Task 3: Update ClassCard to render sprite and per-class accent color

**Files:**
- Modify: `src/components/ClassCard.tsx`

The spritesheet (`chars.png`) is 224×74 px (9 cols × 3 rows, 24×24 frames, 1px gap).  
At 2× scale: `background-size: 448px 148px`.  
Frame position: `col = spriteFrame % 9`, `row = Math.floor(spriteFrame / 9)`.  
CSS `background-position`: `-${col * 50}px -${row * 50}px` (each cell is 25px original → 50px at 2×).

- [ ] **Step 1: Replace ClassCard with sprite + per-class color version**

Replace the entire contents of `src/components/ClassCard.tsx`:

```tsx
import { ConsultantClass } from '../types/game';

type Props = {
  cls: ConsultantClass;
  onSelect: (cls: ConsultantClass) => void;
  selected?: boolean;
};

function spriteStyle(frame: number): React.CSSProperties {
  const col = frame % 9;
  const row = Math.floor(frame / 9);
  return {
    width: 48,
    height: 48,
    imageRendering: 'pixelated',
    backgroundImage: "url('/assets/sprites/chars.png')",
    backgroundSize: '448px 148px',
    backgroundPosition: `-${col * 50}px -${row * 50}px`,
    backgroundRepeat: 'no-repeat',
    display: 'inline-block',
  };
}

export function ClassCard({ cls, onSelect, selected }: Props) {
  return (
    <button
      onClick={() => onSelect(cls)}
      style={{
        borderColor: selected ? cls.color : undefined,
        boxShadow: selected ? `0 0 12px ${cls.color}55` : undefined,
      }}
      className={`
        cursor-pointer rounded-xl border-2 p-4 text-left transition-all duration-200
        ${selected
          ? 'bg-gray-900'
          : 'border-gray-700 bg-gray-900 hover:bg-gray-800'
        }
      `}
    >
      <div className="mb-2">
        <span style={spriteStyle(cls.spriteFrame)} />
      </div>
      <div className="mb-1 text-sm font-bold" style={{ color: cls.color }}>{cls.name}</div>
      <div className="mb-2 text-xs font-semibold italic text-amber-400">✨ {cls.abilityName}</div>
      <div className="mb-2 text-xs text-gray-400">{cls.description}</div>
      <div className="text-xs italic text-gray-500">"{cls.flavor}"</div>
    </button>
  );
}
```

- [ ] **Step 2: Run lint and build**

```bash
npm run lint
npm run build
```

Expected: No errors or warnings.

- [ ] **Step 3: Start dev server and visually verify**

```bash
npm run dev
```

Open http://localhost:5173. On the start screen:
- Each class card should show a different pixel-art sprite (2× scale, crisp)
- Each card's border should be invisible when unselected, colored when selected
- Each class name should appear in its accent color
- Hovering should darken the background
- Selecting a card should show a colored border + subtle glow

- [ ] **Step 4: Commit**

```bash
git add src/components/ClassCard.tsx
git commit -m "feat: differentiate class cards with unique sprites and accent colors"
```
