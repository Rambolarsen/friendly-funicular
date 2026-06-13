import { RawStats } from '../../types/game';
import { Health } from '../valueObjects/Health';

export type EnemyType =
  | 'scopeCreepGoblin'
  | 'jiraWraith'
  | 'procurementTroll'
  | 'gdprSpectre';

interface EnemyConfig {
  hp: number;
  statDropOnDefeat: Partial<RawStats>;
}

const ENEMY_CONFIGS: Record<EnemyType, EnemyConfig> = {
  scopeCreepGoblin:  { hp: 30, statDropOnDefeat: { budget: -5, deliveryProgress: 8 } },
  jiraWraith:        { hp: 20, statDropOnDefeat: { teamMorale: -3, deliveryProgress: 6 } },
  procurementTroll:  { hp: 60, statDropOnDefeat: { budget: -10, deliveryProgress: 12 } },
  gdprSpectre:       { hp: 25, statDropOnDefeat: { complianceRisk: -15 } },
};

export class Enemy {
  readonly instanceId: string;
  readonly type: EnemyType;
  readonly health: Health;
  readonly statDropOnDefeat: Partial<RawStats>;

  protected constructor(instanceId: string, type: EnemyType, health: Health, statDropOnDefeat: Partial<RawStats>) {
    this.instanceId = instanceId;
    this.type = type;
    this.health = health;
    this.statDropOnDefeat = statDropOnDefeat;
  }

  static spawn(type: EnemyType): Enemy {
    const cfg = ENEMY_CONFIGS[type];
    return new Enemy(crypto.randomUUID(), type, Health.of(cfg.hp), cfg.statDropOnDefeat);
  }

  takeDamage(amount: number): Enemy {
    return new Enemy(this.instanceId, this.type, this.health.take(amount), this.statDropOnDefeat);
  }

  isAlive(): boolean {
    return !this.health.isDead();
  }
}
