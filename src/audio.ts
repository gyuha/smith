let ac: AudioContext | null = null;

/** 첫 입력 때 호출한다. 그 전에는 소리를 내지 않는다. */
export function unlockAudio(): void {
  if (!ac) ac = new AudioContext();
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, slide = 0, delay = 0): void {
  if (!ac) return;
  const t = ac.currentTime + delay;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(ac.destination);
  o.start(t);
  o.stop(t + dur);
}

export type Sfx = 'hold' | 'damage' | 'success' | 'great' | 'destroy' | 'coins' | 'select' | 'fail' | 'clear';

export function sfx(kind: Sfx): void {
  switch (kind) {
    case 'hold': tone(180, 0.09, 'square', 0.08, -90); break;
    case 'damage': tone(160, 0.18, 'sawtooth', 0.08, -100); break;
    case 'success': tone(180, 0.06, 'square', 0.08, -60); tone(880, 0.18, 'triangle', 0.1, 0, 0.03); break;
    case 'great': tone(180, 0.06, 'square', 0.08, -60); [880, 1175, 1568].forEach((f, i) => tone(f, 0.2, 'triangle', 0.1, 0, 0.04 + i * 0.07)); break;
    case 'destroy': tone(120, 0.5, 'sawtooth', 0.14, -95); tone(60, 0.6, 'square', 0.1, -30, 0.05); break;
    case 'coins': [1320, 1760].forEach((f, i) => tone(f, 0.12, 'square', 0.05, 0, i * 0.07)); break;
    case 'select': tone(660, 0.05, 'square', 0.04); break;
    case 'fail': [330, 262, 196].forEach((f, i) => tone(f, 0.3, 'sawtooth', 0.08, 0, i * 0.22)); break;
    case 'clear': [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, 'triangle', 0.1, 0, i * 0.14)); break;
  }
}
