export type GardenAtmospherePreset = 'golden' | 'daylight' | 'bioluminescent';

export interface EnvironmentSoundProfile {
  preset: GardenAtmospherePreset;
  shortLabel: string;
  description: string;
  windCutoffHz: number;
  windGain: number;
  rainGain: number;
  birdIntervalMs: [number, number];
  cricketRate: number;
}

export const SOUND_PROFILES: Record<GardenAtmospherePreset, EnvironmentSoundProfile> = {
  golden: {
    preset: 'golden',
    shortLabel: 'Leaves & Birds',
    description: 'Rustling sunset canopy leaves and gentle evening songbirds',
    windCutoffHz: 520,
    windGain: 0.22,
    rainGain: 0.03,
    birdIntervalMs: [2200, 4800],
    cricketRate: 0,
  },
  daylight: {
    preset: 'daylight',
    shortLabel: 'Forest Birds',
    description: 'Bright morning woodland birdsong and soft conservatory mist',
    windCutoffHz: 780,
    windGain: 0.14,
    rainGain: 0.05,
    birdIntervalMs: [1200, 2900],
    cricketRate: 0,
  },
  bioluminescent: {
    preset: 'bioluminescent',
    shortLabel: 'Night Rain',
    description: 'Soothing tropical rainfall, water droplets, and nocturnal crickets',
    windCutoffHz: 380,
    windGain: 0.08,
    rainGain: 0.26,
    birdIntervalMs: [5500, 9500],
    cricketRate: 1,
  },
};

export function getEnvironmentSoundProfile(preset: GardenAtmospherePreset): EnvironmentSoundProfile {
  return SOUND_PROFILES[preset] || SOUND_PROFILES.golden;
}

function createNoiseBuffer(ctx: AudioContext, seconds = 3, type: 'pink' | 'white' = 'pink'): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  if (type === 'white') {
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // Paul Kellet's refined pink-noise filter for organic wind & rain textures
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.09;
    b6 = white * 0.115926;
  }
  return buffer;
}

/**
 * Dependency-free procedural Web Audio API engine that generates real-time
 * ambient nature soundscapes synchronized with VirtualGarden3D's lighting presets.
 */
export class AmbientNatureSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windGainNode: GainNode | null = null;
  private rainFilter: BiquadFilterNode | null = null;
  private rainGainNode: GainNode | null = null;
  private sources: AudioScheduledSourceNode[] = [];
  private birdTimerId: number | null = null;
  private dropletTimerId: number | null = null;
  private currentEnv: GardenAtmospherePreset = 'golden';
  private volume = 0.55;
  private active = false;

  public isActive(): boolean {
    return this.active;
  }

  public getEnvironment(): GardenAtmospherePreset {
    return this.currentEnv;
  }

  public getVolume(): number {
    return this.volume;
  }

  public async start(env: GardenAtmospherePreset = this.currentEnv): Promise<boolean> {
    this.currentEnv = env;
    if (typeof window === 'undefined') return false;

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return false;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
      this.setupAudioGraph(this.ctx);
    }

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    this.active = true;
    this.applyProfile(this.currentEnv);
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.25);
    }
    this.scheduleOrganicEvents();
    return true;
  }

  public stop(): void {
    this.active = false;
    this.clearTimers();
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
    }
  }

  public setEnvironment(env: GardenAtmospherePreset): void {
    this.currentEnv = env;
    if (this.active && this.ctx) {
      this.applyProfile(env);
      this.scheduleOrganicEvents();
    }
  }

  public setVolume(nextVol: number): void {
    this.volume = Math.max(0, Math.min(1, nextVol));
    if (this.active && this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.08);
    }
  }

  public dispose(): void {
    this.active = false;
    this.clearTimers();
    for (const src of this.sources) {
      try {
        src.stop();
        src.disconnect();
      } catch {
        // ignore already stopped source
      }
    }
    this.sources = [];
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
    this.masterGain = null;
    this.windFilter = null;
    this.windGainNode = null;
    this.rainFilter = null;
    this.rainGainNode = null;
  }

  private setupAudioGraph(ctx: AudioContext): void {
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    this.masterGain = master;

    // 1. Rustling Leaves / Canopy Wind Bus (Pink Noise -> Bandpass + LFO modulation)
    const pinkBuffer = createNoiseBuffer(ctx, 4, 'pink');
    const windSrc = ctx.createBufferSource();
    windSrc.buffer = pinkBuffer;
    windSrc.loop = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 520;
    windFilter.Q.value = 0.85;

    const windLfo = ctx.createOscillator();
    windLfo.frequency.value = 0.14;
    const windLfoGain = ctx.createGain();
    windLfoGain.gain.value = 180;
    windLfo.connect(windLfoGain);
    windLfoGain.connect(windFilter.frequency);

    const windGain = ctx.createGain();
    windGain.gain.value = 0.2;

    windSrc.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(master);

    windSrc.start();
    windLfo.start();
    this.sources.push(windSrc, windLfo);
    this.windFilter = windFilter;
    this.windGainNode = windGain;

    // 2. Tropical Rainfall / Mist Bus (White Noise -> High-shelf/Lowpass rain filter)
    const whiteBuffer = createNoiseBuffer(ctx, 3, 'white');
    const rainSrc = ctx.createBufferSource();
    rainSrc.buffer = whiteBuffer;
    rainSrc.loop = true;

    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'lowpass';
    rainFilter.frequency.value = 1850;
    rainFilter.Q.value = 0.5;

    const rainGain = ctx.createGain();
    rainGain.gain.value = 0.03;

    rainSrc.connect(rainFilter);
    rainFilter.connect(rainGain);
    rainGain.connect(master);

    rainSrc.start();
    this.sources.push(rainSrc);
    this.rainFilter = rainFilter;
    this.rainGainNode = rainGain;
  }

  private applyProfile(env: GardenAtmospherePreset): void {
    if (!this.ctx) return;
    const profile = getEnvironmentSoundProfile(env);
    const t = this.ctx.currentTime;
    if (this.windFilter && this.windGainNode) {
      this.windFilter.frequency.setTargetAtTime(profile.windCutoffHz, t, 0.4);
      this.windGainNode.gain.setTargetAtTime(profile.windGain, t, 0.4);
    }
    if (this.rainFilter && this.rainGainNode) {
      this.rainFilter.frequency.setTargetAtTime(env === 'bioluminescent' ? 2400 : 1200, t, 0.4);
      this.rainGainNode.gain.setTargetAtTime(profile.rainGain, t, 0.4);
    }
  }

  private clearTimers(): void {
    if (this.birdTimerId !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.birdTimerId);
      this.birdTimerId = null;
    }
    if (this.dropletTimerId !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.dropletTimerId);
      this.dropletTimerId = null;
    }
  }

  private scheduleOrganicEvents(): void {
    this.clearTimers();
    if (!this.active || typeof window === 'undefined') return;

    const scheduleNextBird = () => {
      if (!this.active) return;
      const profile = getEnvironmentSoundProfile(this.currentEnv);
      const [minMs, maxMs] = profile.birdIntervalMs;
      const delay = minMs + Math.random() * (maxMs - minMs);
      this.birdTimerId = window.setTimeout(() => {
        if (this.active) {
          if (this.currentEnv === 'bioluminescent') {
            this.triggerCricketPulse();
          } else {
            this.triggerBirdChirp(this.currentEnv === 'daylight');
          }
          scheduleNextBird();
        }
      }, delay);
    };

    const scheduleNextDroplet = () => {
      if (!this.active) return;
      const delay = this.currentEnv === 'bioluminescent' ? 320 + Math.random() * 580 : 1800 + Math.random() * 2600;
      this.dropletTimerId = window.setTimeout(() => {
        if (this.active) {
          if (this.currentEnv === 'bioluminescent') {
            this.triggerRaindropPlink();
          }
          scheduleNextDroplet();
        }
      }, delay);
    };

    // Play an immediate subtle cue on activation so user gets instant confirmation
    if (this.currentEnv === 'bioluminescent') {
      this.triggerRaindropPlink();
    } else {
      this.triggerBirdChirp(this.currentEnv === 'daylight');
    }

    scheduleNextBird();
    scheduleNextDroplet();
  }

  private triggerBirdChirp(brightMorning: boolean): void {
    if (!this.ctx || !this.masterGain || !this.active) return;
    const now = this.ctx.currentTime;
    const notes = brightMorning ? 3 : 2;
    const baseFreq = brightMorning ? 2350 + Math.random() * 650 : 1750 + Math.random() * 450;

    for (let i = 0; i < notes; i++) {
      const start = now + i * 0.11;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * (1 + i * 0.12), start);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * (1.35 + i * 0.08), start + 0.06);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.92, start + 0.095);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.075, start + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.095);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + 0.105);
    }
  }

  private triggerRaindropPlink(): void {
    if (!this.ctx || !this.masterGain || !this.active) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const freq = 900 + Math.random() * 1400;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.45, now + 0.055);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.04, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  private triggerCricketPulse(): void {
    if (!this.ctx || !this.masterGain || !this.active) return;
    const now = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const start = now + i * 0.055;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(4150, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.018, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.04);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + 0.045);
    }
  }
}
