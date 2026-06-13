export type SpawnType = 'regular' | 'brute' | 'boss';

export class HordeSpawner {
  private trickleTimer = 0;
  private bruteTimer = 0;
  private bossTimer = 0;
  private accelerateTimer = 0;
  private baseInterval = 4000; // ms between regular spawns
  private readonly minInterval = 1500;

  /** Call once per game loop tick with elapsed ms. Calls onSpawn for each enemy to spawn. */
  tick(delta: number, bossAlive: boolean, onSpawn: (type: SpawnType) => void): void {
    this.accelerateTimer += delta;
    if (this.accelerateTimer >= 120_000) {
      this.accelerateTimer = 0;
      this.baseInterval = Math.max(this.minInterval, this.baseInterval - 500);
    }

    this.bruteTimer += delta;
    this.bossTimer += delta;

    // Trickle pauses while boss is alive
    if (!bossAlive) {
      this.trickleTimer += delta;
      const jitter = Math.random() * 2000 - 1000; // ±1s
      if (this.trickleTimer >= this.baseInterval + jitter) {
        this.trickleTimer = 0;
        onSpawn('regular');
      }
    }

    if (this.bruteTimer >= 30_000) {
      this.bruteTimer = 0;
      onSpawn('brute');
    }

    if (this.bossTimer >= 120_000) {
      this.bossTimer = 0;
      onSpawn('boss');
    }
  }

  reset(): void {
    this.trickleTimer = 0;
    this.bruteTimer = 0;
    this.bossTimer = 0;
    this.accelerateTimer = 0;
    this.baseInterval = 4000;
  }
}
