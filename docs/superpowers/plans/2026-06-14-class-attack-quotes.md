# Class Attack Quotes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a random class-specific one-liner above the player with a ~15% chance on each attack, floating up and fading out in golden text.

**Architecture:** Add `CLASS_ATTACK_QUOTES` data to `src/constants/classes.ts`. Add display logic as a private method `maybeShowAttackQuote(time)` on `Player` in `src/game/entities/Player.ts`, called in the existing attack block. No new files.

**Tech Stack:** TypeScript, Phaser 4 (`scene.add.text`, `scene.tweens.add`)

---

## File Map

| File | Change |
|---|---|
| `src/constants/classes.ts` | Add `CLASS_ATTACK_QUOTES: Record<string, string[]>` constant |
| `src/game/entities/Player.ts` | Add `quoteVisibleUntil` field, `maybeShowAttackQuote()` method, call it in attack block |

---

### Task 1: Add quote data to classes.ts

**Files:**
- Modify: `src/constants/classes.ts` (after the `CLASS_ATTACK_DAMAGE` block at the end of the file)

- [ ] **Step 1: Append `CLASS_ATTACK_QUOTES` to `src/constants/classes.ts`**

Add the following block at the end of the file, after the `CLASS_ATTACK_DAMAGE` export:

```ts
/** One-liners each class may say at random when attacking (15% chance per attack). */
export const CLASS_ATTACK_QUOTES: Record<string, string[]> = {
  architect:      [
    'Have you considered a microservices approach?',
    'The monolith must die.',
    'We should decouple this.',
    'This needs an event sourcing layer.',
  ],
  developer:      [
    'It works on my machine.',
    'Just push to prod.',
    "I'll fix it after the release.",
    'Ship it.',
  ],
  ux:             [
    'Did you test this with real users?',
    'The button should be bigger.',
    'More whitespace.',
    "Users don't read.",
  ],
  datascientist:  [
    "Correlation isn't causation.",
    'The model needs more data.',
    'Statistically insignificant.',
    "I'll just train another model.",
  ],
  pm:             [
    'Per my last email\u2026',
    "Let's sync on this.",
    'Can we park that?',
    'Moving the deadline forward.',
  ],
  security:       [
    "That's a security risk.",
    'Password must be 64 characters.',
    'We need a pentest.',
    'Zero trust.',
  ],
  accountmanager: [
    "I'll set up a call.",
    'The client loves this.',
    'Just say yes for now.',
    "Let's manage expectations.",
  ],
  intern:         [
    'I Googled it.',
    'ChatGPT wrote this.',
    'Is this right?',
    'I just started Monday.',
  ],
};
```

- [ ] **Step 2: Verify TypeScript is happy**

```bash
npx tsc --noEmit
```

Expected: no errors. If there are errors, fix them before continuing.

- [ ] **Step 3: Commit**

```bash
git add src/constants/classes.ts
git commit -m "feat: add CLASS_ATTACK_QUOTES data for all consultant classes"
```

---

### Task 2: Add quote display logic to Player

**Files:**
- Modify: `src/game/entities/Player.ts`

- [ ] **Step 1: Add `quoteVisibleUntil` field**

In `src/game/entities/Player.ts`, add this field alongside the other private timer fields (near `attackCooldownTimer`):

```ts
private quoteVisibleUntil = 0;
```

The field block before the change looks like this:
```ts
private attackCooldownTimer = 0;
private abilityCooldownUntil = 0;
private projectileImmunityUntil = 0;
private invincibleUntil = 0;
```

After the change:
```ts
private attackCooldownTimer = 0;
private abilityCooldownUntil = 0;
private projectileImmunityUntil = 0;
private invincibleUntil = 0;
private quoteVisibleUntil = 0;
```

- [ ] **Step 2: Add the `CLASS_ATTACK_QUOTES` import**

The file already imports from `../../constants/classes`. Extend that import to include `CLASS_ATTACK_QUOTES`:

Before:
```ts
import { CLASS_MODIFIERS, CLASS_ATTACK_DAMAGE } from '../../constants/classes';
```

After:
```ts
import { CLASS_MODIFIERS, CLASS_ATTACK_DAMAGE, CLASS_ATTACK_QUOTES } from '../../constants/classes';
```

- [ ] **Step 3: Add `maybeShowAttackQuote()` private method**

Add this method directly after `spawnSlashEffect()` (around line 195, before `isAttackHitting`):

```ts
private maybeShowAttackQuote(time: number): void {
  if (time < this.quoteVisibleUntil) return;
  if (Math.random() >= 0.15) return;

  const quotes = CLASS_ATTACK_QUOTES[this.classId];
  if (!quotes || quotes.length === 0) return;

  const quote = quotes[Math.floor(Math.random() * quotes.length)];
  const text = this.scene.add.text(this.x, this.y - 40, quote, {
    color: '#ffd040',
    fontSize: '13px',
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 3,
  });
  text.setOrigin(0.5, 1);
  text.setDepth(25);

  this.quoteVisibleUntil = time + 1500;

  this.scene.tweens.add({
    targets: text,
    y: text.y - 48,
    alpha: 0,
    duration: 1500,
    ease: 'Quad.easeOut',
    onComplete: () => { text.destroy(); },
  });
}
```

- [ ] **Step 4: Call `maybeShowAttackQuote` in the attack block**

In `update()`, the attack block currently reads:

```ts
const attackPressed = Phaser.Input.Keyboard.JustDown(this.attackKey);
if (attackPressed && time > this.attackCooldownTimer) {
  this.attackCooldownTimer = time + ATTACK_COOLDOWN;
  this.showAttackBox();
  soundManager.attack();
  this.scene.game.events.emit(ATTACK_USED, { cooldownMs: ATTACK_COOLDOWN });
}
```

Add the `maybeShowAttackQuote` call after `soundManager.attack()`:

```ts
const attackPressed = Phaser.Input.Keyboard.JustDown(this.attackKey);
if (attackPressed && time > this.attackCooldownTimer) {
  this.attackCooldownTimer = time + ATTACK_COOLDOWN;
  this.showAttackBox();
  soundManager.attack();
  this.maybeShowAttackQuote(time);
  this.scene.game.events.emit(ATTACK_USED, { cooldownMs: ATTACK_COOLDOWN });
}
```

- [ ] **Step 5: Verify TypeScript is happy**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Smoke-test in the browser**

```bash
npm run dev
```

Open `http://localhost:5173`, pick any class, start the game, and press `E` to attack repeatedly. Every ~7 attacks on average a golden quote should float up above the player and fade out over ~1.5 seconds. Confirm no stacking (a new quote won't appear until the previous one has faded).

- [ ] **Step 7: Commit**

```bash
git add src/game/entities/Player.ts
git commit -m "feat: show random class attack quotes above player on attack

15% chance per attack. Golden text floats up 48px and fades over 1500ms.
No stacking guard via quoteVisibleUntil timer.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```
