import assert from 'node:assert/strict';
import test from 'node:test';
import { CONSULTANT_CLASSES } from '../../src/constants/classes';
import { ABILITY_USED, LEVEL_STARTED } from '../../src/game/eventKeys';
import { level2 } from '../../src/game/levels/level2';
import { level3 } from '../../src/game/levels/level3';

test('class metadata exposes the active ability names from the gameplay docs', () => {
  assert.deepEqual(
    CONSULTANT_CLASSES.map((cls) => cls.abilityName),
    [
      'Draft Architecture',
      'Ship Hotfix',
      'User Research',
      'Run the Model',
      'Call a Meeting',
      'Deploy Firewall',
      'Escalate',
      'Wildcard',
    ],
  );
});

test('ability usage emits the dedicated gameplay event key', () => {
  assert.equal(ABILITY_USED, 'ability-used');
});

test('level transitions emit a dedicated scene-start event key', () => {
  assert.equal(LEVEL_STARTED, 'level-started');
});

test('level 2 and level 3 extend progression with the planned loot mix', () => {
  assert.equal(level2.width, 4000);
  assert.equal(level2.loots.length, 5);
  assert.equal(level2.loots.some((loot) => loot.type === 'compliance'), true);
  assert.equal(level3.width, 3600);
  assert.equal(level3.loots.length, 5);
  assert.equal(level3.loots.some((loot) => loot.type === 'compliance'), true);
});
