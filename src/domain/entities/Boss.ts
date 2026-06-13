import { RawStats } from '../../types/game';
import { Health } from '../valueObjects/Health';
import { Enemy } from './Enemy';

const BOSS_HP = 300;
const BOSS_CHARGED_ATTACK_DAMAGE = 20;
const BOSS_STAT_DROP: Partial<RawStats> = { deliveryProgress: 20, clientHappiness: 10 };

export class Boss extends Enemy {
  readonly chargedAttackDamage: number;

  private constructor(instanceId: string, health: Health, chargedAttackDamage: number) {
    super(instanceId, 'procurementTroll', health, BOSS_STAT_DROP);
    this.chargedAttackDamage = chargedAttackDamage;
  }

  static spawnBoss(): Boss {
    return new Boss(crypto.randomUUID(), Health.of(BOSS_HP), BOSS_CHARGED_ATTACK_DAMAGE);
  }

  takeDamage(amount: number): Boss {
    return new Boss(this.instanceId, this.health.take(amount), this.chargedAttackDamage);
  }
}
