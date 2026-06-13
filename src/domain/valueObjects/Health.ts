export class Health {
  readonly current: number;
  readonly max: number;

  private constructor(current: number, max: number) {
    this.current = current;
    this.max = max;
  }

  static of(max: number): Health {
    return new Health(max, max);
  }

  take(damage: number): Health {
    return new Health(Math.max(0, this.current - damage), this.max);
  }

  isDead(): boolean {
    return this.current <= 0;
  }
}
