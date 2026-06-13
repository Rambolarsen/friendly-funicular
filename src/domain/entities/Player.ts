import { RawStats, ConsultantClass } from '../../types/game';
import { CLASS_MODIFIERS } from '../../constants/classes';
import { Health } from '../valueObjects/Health';
import { Enemy } from './Enemy';

const PLAYER_MAX_HP = 100;

export class Player {
  readonly classId: string;
  readonly health: Health;
  readonly classModifiers: Partial<RawStats>;

  private constructor(classId: string, health: Health, classModifiers: Partial<RawStats>) {
    this.classId = classId;
    this.health = health;
    this.classModifiers = classModifiers;
  }

  static create(cls: ConsultantClass): Player {
    const modifiers = CLASS_MODIFIERS[cls.id] ?? {};
    return new Player(cls.id, Health.of(PLAYER_MAX_HP), modifiers);
  }

  takeDamage(amount: number): Player {
    return new Player(this.classId, this.health.take(amount), this.classModifiers);
  }

  isAlive(): boolean {
    return !this.health.isDead();
  }

  killBonusFor(enemy: Enemy): Partial<RawStats> {
    if (this.classId === 'intern') {
      return this.randomInternBonus();
    }
    return mergePartialStats(enemy.statDropOnDefeat, this.classModifiers);
  }

  private randomInternBonus(): Partial<RawStats> {
    const keys: (keyof RawStats)[] = [
      'budget', 'clientHappiness', 'technicalDebt', 'teamMorale',
      'deliveryProgress', 'complianceRisk',
    ];
    const key = keys[Math.floor(Math.random() * keys.length)];
    const value = Math.floor(Math.random() * 20) - 8;
    return { [key]: value };
  }
}

function mergePartialStats(a: Partial<RawStats>, b: Partial<RawStats>): Partial<RawStats> {
  const result: Partial<RawStats> = { ...a };
  for (const k of Object.keys(b) as (keyof RawStats)[]) {
    result[k] = ((result[k] ?? 0) + (b[k] ?? 0)) as number;
  }
  return result;
}
