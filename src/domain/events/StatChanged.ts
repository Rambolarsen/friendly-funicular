import { RawStats } from '../../types/game';
import { DomainEvent } from './DomainEvent';

export interface StatChanged extends DomainEvent {
  type: 'StatChanged';
  before: RawStats;
  after: RawStats;
  reason: string;
}
