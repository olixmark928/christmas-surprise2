class FestiveSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private muted = false;

  private ensureOutput(): { ctx: AudioContext; destination: AudioNode } | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.setValueAtTime(-6, this.ctx.currentTime);
        this.compressor.knee.setValueAtTime(12, this.ctx.currentTime);
        this.compressor.ratio.setValueAtTime(4, this.ctx.currentTime);
        this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
        this.compressor.release.setValueAtTime(0.15, this.ctx.currentTime);

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(2.4, this.ctx.currentTime);

        this.compressor.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (!this.ctx || !this.compressor) return null;
    return { ctx: this.ctx, destination: this.compressor };
  }

  public unlock(): void {
    this.ensureOutput();
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    if (!this.muted) {
      this.ensureOutput();
    }
    return this.muted;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.35,
    delay = 0
  ): void {
    const output = this.ensureOutput();
    if (!output) return;
    const { ctx, destination } = output;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(destination);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public tick(): void {
    this.playTone(880, 0.07, 'triangle', 0.45);
  }

  public urgentTick(): void {
    this.playTone(1046.5, 0.09, 'triangle', 0.62);
  }

  public phaseChange(): void {
    this.playTone(523.25, 0.11, 'triangle', 0.64, 0);
    this.playTone(783.99, 0.16, 'triangle', 0.7, 0.08);
  }

  public correct(): void {
    // Festive chime triad (C5 -> E5 -> G5 -> C6)
    this.playTone(523.25, 0.13, 'triangle', 0.66, 0);
    this.playTone(659.25, 0.13, 'triangle', 0.68, 0.08);
    this.playTone(783.99, 0.15, 'triangle', 0.72, 0.16);
    this.playTone(1046.5, 0.28, 'triangle', 0.78, 0.24);
  }

  public wrong(): void {
    this.playTone(260, 0.16, 'sawtooth', 0.5, 0);
    this.playTone(196, 0.26, 'sawtooth', 0.54, 0.13);
  }

  public finish(): void {
    // Jingle-inspired bright arpeggio
    const notes = [
      { f: 659.25, d: 0.15, t: 0 },
      { f: 659.25, d: 0.15, t: 0.14 },
      { f: 659.25, d: 0.26, t: 0.28 },
      { f: 523.25, d: 0.15, t: 0.52 },
      { f: 783.99, d: 0.17, t: 0.66 },
      { f: 1046.5, d: 0.38, t: 0.84 },
    ];
    for (const n of notes) {
      this.playTone(n.f, n.d, 'triangle', 0.72, n.t);
    }
  }
}

export const sfx = new FestiveSoundEngine();
