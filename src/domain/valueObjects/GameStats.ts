import { RawStats } from '../../types/game';
import { clampStat, clampStatChange } from '../rules/statRules';
import { INITIAL_STATS } from '../../constants/initialState';

export class GameStats {
  readonly budget: number;
  readonly clientHappiness: number;
  readonly technicalDebt: number;
  readonly teamMorale: number;
  readonly deliveryProgress: number;
  readonly complianceRisk: number;

  private constructor(raw: RawStats) {
    this.budget = raw.budget;
    this.clientHappiness = raw.clientHappiness;
    this.technicalDebt = raw.technicalDebt;
    this.teamMorale = raw.teamMorale;
    this.deliveryProgress = raw.deliveryProgress;
    this.complianceRisk = raw.complianceRisk;
  }

  static initial(): GameStats {
    return new GameStats(INITIAL_STATS);
  }

  static from(raw: RawStats): GameStats {
    return new GameStats({
      budget: clampStat(raw.budget),
      clientHappiness: clampStat(raw.clientHappiness),
      technicalDebt: clampStat(raw.technicalDebt),
      teamMorale: clampStat(raw.teamMorale),
      deliveryProgress: clampStat(raw.deliveryProgress),
      complianceRisk: clampStat(raw.complianceRisk),
    });
  }

  apply(changes: Partial<RawStats>): GameStats {
    const next: RawStats = {
      budget: clampStat(this.budget + clampStatChange(changes.budget ?? 0)),
      clientHappiness: clampStat(this.clientHappiness + clampStatChange(changes.clientHappiness ?? 0)),
      technicalDebt: clampStat(this.technicalDebt + clampStatChange(changes.technicalDebt ?? 0)),
      teamMorale: clampStat(this.teamMorale + clampStatChange(changes.teamMorale ?? 0)),
      deliveryProgress: clampStat(this.deliveryProgress + clampStatChange(changes.deliveryProgress ?? 0)),
      complianceRisk: clampStat(this.complianceRisk + clampStatChange(changes.complianceRisk ?? 0)),
    };
    return new GameStats(next);
  }

  toPlain(): RawStats {
    return {
      budget: this.budget,
      clientHappiness: this.clientHappiness,
      technicalDebt: this.technicalDebt,
      teamMorale: this.teamMorale,
      deliveryProgress: this.deliveryProgress,
      complianceRisk: this.complianceRisk,
    };
  }
}
