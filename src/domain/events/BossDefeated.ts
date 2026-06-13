import { RawStats } from '../../types/game';
import { DomainEvent } from './DomainEvent';

export interface BossDefeated extends DomainEvent {
  type: 'BossDefeated';
  stats: RawStats;
}
