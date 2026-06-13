import { RawStats } from '../../types/game';
import { DomainEvent } from './DomainEvent';

export interface GameOver extends DomainEvent {
  type: 'GameOver';
  outcome: 'win' | 'lose';
  stats: RawStats;
  reason: string | null;
}
