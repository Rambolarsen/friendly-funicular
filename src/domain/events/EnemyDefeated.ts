import { RawStats } from '../../types/game';
import { DomainEvent } from './DomainEvent';
import { EnemyType } from '../entities/Enemy';

export interface EnemyDefeated extends DomainEvent {
  type: 'EnemyDefeated';
  enemyType: EnemyType;
  statChanges: Partial<RawStats>;
}
