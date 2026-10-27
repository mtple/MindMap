// Tiny procedural sound engine built on the Web Audio API: there are no audio
// files. Sound effects are synthesised on the fly and each realm hums with its
// own ambient drone.

export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (this.ctx) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);

    // Ambient drone: two detuned oscillators through a slow low-pass filter
    this.droneFilter = this.ctx.createBiquadFilter();
    this.droneFilter.type = 'lowpass';
    this.droneFilter.frequency.value = 400;
    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.value = 0.07;
    this.droneFilter.connect(this.droneGain).connect(this.master);
    this.drones = [0, 7.02, -12].map((semis) => {
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = 110 * Math.pow(2, semis / 12);
      o.detune.value = (Math.random() - 0.5) * 12;
      o.connect(this.droneFilter);
      o.start();
      return { o, semis };
    });
    this.lfo = this.ctx.createOscillator();
    this.lfo.frequency.value = 0.08;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 180;
    this.lfo.connect(lfoGain).connect(this.droneFilter.frequency);
    this.lfo.start();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  setDrone(freq) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    for (const { o, semis } of this.drones) {
      o.frequency.setTargetAtTime(freq * Math.pow(2, semis / 12), now, 0.8);
    }
  }

  tone(freq, dur, { type = 'sine', vol = 0.2, slide = null, delay = 0 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  noise(dur, { vol = 0.2, freq = 1000, delay = 0 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
  }

  arpeggio(notes, step = 0.08, opts = {}) {
    notes.forEach((n, i) => this.tone(n, 0.35, { type: 'triangle', vol: 0.15, delay: i * step, ...opts }));
  }

  cast() { this.tone(900, 0.18, { type: 'triangle', vol: 0.1, slide: 1600 }); }
  nova() { this.tone(260, 0.7, { vol: 0.25, slide: 50 }); this.noise(0.5, { vol: 0.25, freq: 600 }); }
  hit() { this.noise(0.1, { vol: 0.25, freq: 1400 }); this.tone(300, 0.08, { type: 'square', vol: 0.05, slide: 150 }); }
  enemyShoot() { this.tone(240, 0.25, { type: 'sawtooth', vol: 0.05, slide: 120 }); }
  hurt() { this.tone(180, 0.3, { type: 'sawtooth', vol: 0.15, slide: 70 }); this.noise(0.15, { vol: 0.2, freq: 500 }); }
  enemyDie() { this.tone(500, 0.4, { type: 'square', vol: 0.06, slide: 80 }); this.noise(0.3, { vol: 0.15, freq: 2500 }); }
  shatter() { this.noise(0.6, { vol: 0.3, freq: 6000 }); this.arpeggio([2093, 1760, 2637, 1568], 0.03, { vol: 0.06 }); }
  pickup() { this.arpeggio([523, 659, 784, 1047]); }
  fragment() { this.arpeggio([392, 523, 659, 784, 1047, 1319], 0.1); }
  levelUp() { this.arpeggio([523, 659, 784, 1047, 784, 1047, 1319], 0.07, { type: 'sine', vol: 0.18 }); }
  realm() { this.tone(660, 1.2, { vol: 0.08 }); this.tone(990, 1.2, { vol: 0.05, delay: 0.15 }); }
  talk() { this.tone(440 + Math.random() * 200, 0.06, { type: 'triangle', vol: 0.05 }); }
  denied() { this.tone(200, 0.15, { type: 'square', vol: 0.06 }); }
  activate() { this.tone(110, 1.5, { vol: 0.2, slide: 220 }); this.arpeggio([330, 440, 554, 660], 0.15, { vol: 0.08 }); }
  victory() { this.arpeggio([262, 330, 392, 523, 659, 784, 1047, 1319, 1568], 0.18, { type: 'sine', vol: 0.18 }); }
}
