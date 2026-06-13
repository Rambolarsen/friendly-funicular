/**
 * Procedural chiptune sound engine built on the Web Audio API.
 * No asset files required — all sounds are synthesised at runtime.
 *
 * Usage: import { soundManager } from './sound'; then call e.g. soundManager.jump().
 * The AudioContext is created lazily on first use (satisfies browser autoplay policy).
 */

type OscType = OscillatorType;

class SoundManager {
  private ctx: AudioContext | null = null;
  private sfxOut!: GainNode;
  private bgmOut!: GainNode;
  private bgmActive = false;
  private bgmLoopHandle: ReturnType<typeof setTimeout> | null = null;

  // ── AudioContext lifecycle ─────────────────────────────────────────────────

  private ensureCtx(): AudioContext | null {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
        this.sfxOut = this.ctx.createGain();
        this.sfxOut.gain.value = 0.55;
        this.sfxOut.connect(this.ctx.destination);

        this.bgmOut = this.ctx.createGain();
        this.bgmOut.gain.value = 0.14;
        this.bgmOut.connect(this.ctx.destination);
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  // ── Internal primitive ─────────────────────────────────────────────────────

  /** Schedule a single oscillator note. `at` is an absolute AudioContext timestamp. */
  private note(
    out: GainNode,
    freq: number,
    at: number,
    dur: number,
    type: OscType = 'square',
    vol = 0.35,
    freqEnd?: number,
  ): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    if (freqEnd !== undefined) {
      osc.frequency.linearRampToValueAtTime(freqEnd, at + dur * 0.82);
    }
    gain.gain.setValueAtTime(vol, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur * 0.92);
    osc.connect(gain);
    gain.connect(out);
    osc.start(at);
    osc.stop(at + dur + 0.01);
  }

  /** Helper: schedule SFX relative to "now". */
  private sfx(
    freq: number,
    dur: number,
    type: OscType = 'square',
    vol = 0.35,
    offset = 0,
    freqEnd?: number,
  ): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    this.note(this.sfxOut, freq, ctx.currentTime + offset, dur, type, vol, freqEnd);
  }

  // ── Public SFX ────────────────────────────────────────────────────────────

  jump(): void {
    this.sfx(260, 0.12, 'square', 0.26, 0, 500);
  }

  attack(): void {
    this.sfx(240, 0.07, 'sawtooth', 0.4, 0, 100);
    this.sfx(90, 0.1, 'square', 0.28, 0.02);
  }

  enemyDeath(): void {
    this.sfx(400, 0.06, 'square', 0.26);
    this.sfx(300, 0.07, 'square', 0.22, 0.06);
    this.sfx(200, 0.1, 'square', 0.18, 0.13);
  }

  playerHurt(): void {
    this.sfx(180, 0.18, 'sawtooth', 0.48, 0, 70);
  }

  lootPickup(): void {
    this.sfx(523, 0.07, 'sine', 0.3);
    this.sfx(659, 0.07, 'sine', 0.24, 0.08);
    this.sfx(784, 0.12, 'sine', 0.2, 0.15);
  }

  levelComplete(): void {
    [523, 659, 784, 1047].forEach((f, i) => this.sfx(f, 0.18, 'square', 0.3, i * 0.13));
  }

  bossDeath(): void {
    [261, 392, 523, 659, 784, 1047].forEach((f, i) =>
      this.sfx(f, 0.22, 'square', 0.38, i * 0.14),
    );
  }

  gameOver(): void {
    [392, 330, 262, 196].forEach((f, i) => this.sfx(f, 0.3, 'square', 0.4, i * 0.24));
  }

  win(): void {
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) =>
      this.sfx(f, 0.18, 'square', 0.35, i * 0.13),
    );
  }

  // ── Background music ───────────────────────────────────────────────────────

  startBgm(): void {
    if (this.bgmActive) return;
    if (!this.ensureCtx()) return;
    this.bgmActive = true;
    this.scheduleBgmLoop(this.ctx!.currentTime + 0.1);
  }

  stopBgm(): void {
    this.bgmActive = false;
    if (this.bgmLoopHandle !== null) {
      clearTimeout(this.bgmLoopHandle);
      this.bgmLoopHandle = null;
    }
  }

  /**
   * Procedural chiptune loop — 16 eighth notes at 128 BPM in C minor pentatonic.
   * Melody on 'square', bass on 'triangle'. Seamlessly self-reschedules.
   *
   * C minor pentatonic Hz reference (approx):
   *   G2=98  Bb2=117  C3=131  Eb3=156  F3=175  G3=196
   *   Bb3=233  C4=262  Eb4=311  F4=349  G4=392  Bb4=466  C5=523
   */
  private scheduleBgmLoop(startAt: number): void {
    if (!this.bgmActive || !this.ctx) return;
    const ctx = this.ctx;
    const step = 60 / 128 / 2; // eighth note at 128 BPM ≈ 0.234 s

    // melody: null = rest
    const mel: Array<[number, number] | null> = [
      [392, step * 0.85], // G4
      null,
      [311, step * 0.85], // Eb4
      [392, step * 0.85], // G4
      [466, step * 1.6],  // Bb4 (hold)
      null,
      null,
      [392, step * 0.85], // G4
      [349, step * 0.85], // F4
      [311, step * 0.85], // Eb4
      null,
      [262, step * 1.6],  // C4 (hold)
      null,
      [311, step * 0.85], // Eb4
      [349, step * 0.85], // F4
      null,
    ];

    const bass: Array<[number, number] | null> = [
      [98,  step * 1.8],  // G2
      null, null, null,
      [98,  step * 0.85], // G2
      null,
      [87,  step * 1.8],  // F2
      null, null, null,
      [65,  step * 1.8],  // C2
      null, null, null,
      [73,  step * 1.8],  // D2
      null,
    ];

    for (let i = 0; i < 16; i++) {
      const t = startAt + i * step;
      const m = mel[i];
      const b = bass[i];
      if (m) this.note(this.bgmOut, m[0], t, m[1], 'square', 0.22);
      if (b) this.note(this.bgmOut, b[0], t, b[1], 'triangle', 0.25);
    }

    const loopDuration = 16 * step;
    const msUntilReschedule = Math.max(
      0,
      (startAt + loopDuration - ctx.currentTime - 0.2) * 1000,
    );

    this.bgmLoopHandle = setTimeout(() => {
      if (!this.bgmActive || !this.ctx) return;
      const nextStart = Math.max(startAt + loopDuration, this.ctx.currentTime + 0.05);
      this.scheduleBgmLoop(nextStart);
    }, msUntilReschedule);
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────

  destroy(): void {
    this.stopBgm();
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}

export const soundManager = new SoundManager();
