import type { RelicId } from '../game/types';
import { H, W, box, line, rect } from './gfx';
import type { Ctx } from './gfx';

const hash = (x: number, y: number) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};

const FLOOR_Y = 210;
const BRICK_WARM = ['#1a1014', '#2a1616', '#3d1e18', '#58291b', '#74361f'];
const BRICK_COOL = ['#11141a', '#161b22', '#1c232b'];

/** 벽돌 벽과 돌바닥. 화로에 가까울수록 붉게 밝아진다. 한 번만 그려 캐시한다. */
export function drawBackground(c: Ctx): void {
  rect(c, 0, 0, W, H, '#0b0b10');
  for (let row = 0; row * 9 < FLOOR_Y; row++) {
    const off = row % 2 ? 9 : 0;
    for (let x = -off; x < W; x += 18) {
      const y = row * 9;
      const d = Math.hypot(x + 9 - 415, (y + 4 - 165) * 1.3);
      const n = hash(x, y);
      let color: string;
      if (d < 250) color = BRICK_WARM[Math.max(0, Math.min(4, Math.floor(4.6 - d / 55 + n * 0.9)))];
      else color = BRICK_COOL[Math.floor(n * 3)];
      rect(c, x, y, 17, 8, color);
      if (n > 0.7) rect(c, x, y, 17, 1, '#ffffff10');
    }
  }
  // 바닥
  rect(c, 0, FLOOR_Y, W, H - FLOOR_Y, '#0d0f13');
  for (let row = 0; row < 3; row++) {
    for (let x = -(row * 14); x < W; x += 48) {
      const y = FLOOR_Y + 2 + row * 20;
      const d = Math.abs(x + 24 - 400);
      rect(c, x, y, 46, 18, d < 110 ? '#2a1a16' : d < 200 ? '#1b1717' : '#14171c');
      rect(c, x, y, 46, 1, d < 110 ? '#3a241b' : '#1d2127');
    }
  }
  rect(c, 0, FLOOR_Y, W, 2, '#06070a');
}

export function drawFurnace(c: Ctx, t: number): void {
  const x = 362, y = 104;
  // 돌 아치
  for (let r = 0; r < 12; r++) {
    for (let k = 0; k < 6; k++) {
      const bx = x + k * 18 - (r % 2 ? 9 : 0), by = y + r * 9;
      rect(c, bx, by, 17, 8, hash(bx, by) > 0.5 ? '#4a3a36' : '#3b2e2c');
      rect(c, bx, by, 17, 1, '#5d4a42');
    }
  }
  rect(c, x - 10, y - 4, 118, 5, '#5d4a42');
  // 아궁이
  const mx = x + 16, my = y + 30, mw = 70, mh = 76;
  rect(c, mx, my + 10, mw, mh - 10, '#120806');
  rect(c, mx + 4, my + 4, mw - 8, 6, '#120806');
  rect(c, mx + 10, my, mw - 20, 4, '#120806');
  // 안쪽 불빛
  rect(c, mx + 4, my + 36, mw - 8, mh - 36, '#3a1208');
  rect(c, mx + 8, my + 48, mw - 16, mh - 48, '#6b200a');
  // 불꽃 (초당 10프레임으로 끊어 픽셀아트 느낌을 준다)
  const f = Math.floor(t * 10);
  for (let i = 0; i < 15; i++) {
    const fx = mx + 6 + i * 4;
    const hgt = 14 + Math.floor(hash(i, f) * 22) + Math.round(Math.sin(i * 0.9 + f * 0.7) * 5);
    const base = my + mh - 12;
    rect(c, fx, base - hgt, 4, hgt, '#c9361c');
    rect(c, fx, base - hgt * 0.7, 4, hgt * 0.7, '#f2701d');
    rect(c, fx + 1, base - hgt * 0.4, 2, hgt * 0.4, '#ffc23d');
    if (hash(i + 3, f) > 0.75) rect(c, fx + 1, base - hgt - 4 - Math.floor(hash(i, f + 1) * 8), 1, 1, '#ffe26b');
  }
  // 숯
  for (let i = 0; i < 8; i++) {
    const hot = hash(i, Math.floor(t * 4)) > 0.4;
    rect(c, mx + 4 + i * 8, my + mh - 13, 7, 6, hot ? '#ff8a2a' : '#a8321a');
    rect(c, mx + 5 + i * 8, my + mh - 12, 3, 2, hot ? '#ffe26b' : '#f2701d');
  }
  // 쇠살
  rect(c, mx, my + mh - 7, mw, 3, '#1c1513');
  for (let i = 0; i < 7; i++) rect(c, mx + 4 + i * 10, my + mh - 22, 2, 16, '#1c1513');
  rect(c, x - 6, y + 106, 120, 4, '#2a211f');
}

export function drawAnvil(c: Ctx): void {
  // 받침 통나무
  rect(c, 214, 200, 60, 12, '#3b2a20');
  rect(c, 214, 200, 60, 2, '#56402f');
  for (let i = 0; i < 5; i++) rect(c, 220 + i * 12, 203, 1, 8, '#2a1d16');
  // 모루
  rect(c, 190, 176, 104, 8, '#5c6470');
  rect(c, 190, 176, 104, 2, '#aab3c0');
  rect(c, 178, 178, 12, 4, '#5c6470');
  rect(c, 170, 179, 8, 2, '#5c6470');
  rect(c, 178, 178, 12, 1, '#aab3c0');
  rect(c, 212, 184, 60, 6, '#434a55');
  rect(c, 224, 190, 36, 6, '#363c46');
  rect(c, 208, 196, 68, 6, '#434a55');
  rect(c, 208, 196, 68, 1, '#6d7683');
}

const BLADES = [
  { body: '#8a8f98', hi: '#c5cad2', edge: '#555a63', guard: '#6b4a2a' },
  { body: '#a9b8c8', hi: '#e6eef6', edge: '#62707f', guard: '#8a8f98' },
  { body: '#d7dde6', hi: '#ffffff', edge: '#7d8794', guard: '#d4a017' },
  { body: '#8fe3f2', hi: '#eaffff', edge: '#2f8fb0', guard: '#f5c542' },
  { body: '#ffd6f4', hi: '#ffffff', edge: '#c44fd0', guard: '#ffe26b' },
];

/** 모루 위에 눕힌 검. 단계가 오를수록 길어지고 5단계마다 재질이 바뀐다. heat는 방금 두드린 열기(0..1). */
export function drawSword(c: Ctx, level: number, heat: number, t: number): void {
  const tier = Math.min(4, Math.floor(level / 5));
  const p = BLADES[tier];
  const x = 196, y = 168;
  const len = Math.min(84, 34 + level * 3);
  // 손잡이
  rect(c, x, y + 1, 4, 5, p.guard);
  rect(c, x + 4, y + 2, 12, 3, '#4a3020');
  for (let i = 0; i < 3; i++) rect(c, x + 6 + i * 4, y + 2, 1, 3, '#2c1c12');
  rect(c, x + 16, y - 3 - tier, 3, 13 + tier * 2, p.guard);
  rect(c, x + 16, y - 3 - tier, 3, 1, '#ffffff60');
  // 검신
  const bx = x + 19, bh = 5 + Math.min(3, tier);
  const by = y + 3 - Math.floor(bh / 2);
  rect(c, bx, by, len, bh, p.body);
  rect(c, bx, by, len, 1, p.hi);
  rect(c, bx, by + bh - 1, len, 1, p.edge);
  rect(c, bx + 3, by + Math.floor(bh / 2), len - 6, 1, p.edge);
  for (let i = 0; i < Math.ceil(bh / 2); i++) rect(c, bx + len + i * 2, by + i, 2, bh - i * 2, i ? p.body : p.hi);
  if (tier >= 3) {
    // 빛나는 검은 날을 따라 반짝임이 흐른다
    const s = Math.floor((t * 40) % (len + 20));
    if (s < len) rect(c, bx + s, by, 3, bh, '#ffffff');
  }
  if (heat > 0.05) {
    const hot = heat > 0.6 ? '#ffe26bcc' : heat > 0.3 ? '#ff8a2a99' : '#c9361c66';
    rect(c, bx + len * 0.35, by, len * 0.4, bh, hot);
  }
}

/** swing: 0(들어 올림) → 1(내려침) */
export function drawHammer(c: Ctx, swing: number): void {
  const hx = Math.round(318 - 52 * swing), hy = Math.round(124 + 36 * swing);
  const ex = hx + 30 + Math.round(12 * swing), ey = hy + 36 - Math.round(26 * swing);
  line(c, hx + 6, hy + 8, ex, ey, 5, '#5a3b25');
  line(c, hx + 6, hy + 7, ex, ey - 1, 2, '#7d5636');
  for (let i = 1; i < 4; i++) rect(c, hx + 6 + ((ex - hx - 6) * (i + 3)) / 7 - 2, hy + 8 + ((ey - hy - 8) * (i + 3)) / 7 - 3, 4, 2, '#c9553c');
  rect(c, hx - 12, hy - 2, 30, 16, '#3a3f48');
  rect(c, hx - 12, hy - 2, 30, 2, '#8a929e');
  rect(c, hx - 12, hy + 12, 30, 2, '#22262c');
  rect(c, hx - 14, hy, 2, 12, '#565d69');
  rect(c, hx + 18, hy, 2, 12, '#565d69');
}

/** 창살 뒤에서 지켜보는 세리의 눈 */
export function drawEyeWindow(c: Ctx, x: number, y: number, w: number, h: number, t: number, angry: boolean): void {
  box(c, x - 4, y - 4, w + 8, h + 8, '#2b3038', '#14161b');
  rect(c, x, y, w, h, '#050507');
  const cx = x + w / 2, cy = y + h / 2;
  const blink = t % 4.2 > 4.05;
  const rw = Math.round(w * 0.36), rh = blink ? 1 : Math.round(h * (angry ? 0.2 : 0.28));
  for (let i = -rh; i <= rh; i++) {
    const k = Math.sqrt(1 - (i * i) / ((rh + 0.5) * (rh + 0.5)));
    const half = Math.round(rw * k);
    rect(c, cx - half, cy + i, half * 2, 1, Math.abs(i) > rh * 0.6 ? '#8f1d12' : '#d8361e');
  }
  if (!blink) {
    const pw = Math.max(2, Math.round(w * 0.05));
    rect(c, cx - pw / 2 + Math.round(Math.sin(t * 0.6) * rw * 0.25), cy - rh + 1, pw, rh * 2 - 1, '#150302');
    rect(c, cx - rw * 0.5, cy - rh * 0.5, 2, 1, '#ff9a6b');
  }
  const bars = Math.max(4, Math.round(w / 12));
  for (let i = 0; i <= bars; i++) {
    const bx = x + Math.round((w - 3) * (i / bars));
    rect(c, bx, y, 3, h, '#3a404a');
    rect(c, bx, y, 1, h, '#5f6874');
  }
  rect(c, x, y + Math.round(h * 0.3), w, 2, '#3a404a');
  rect(c, x, y + Math.round(h * 0.7), w, 2, '#3a404a');
}

export function drawCoin(c: Ctx, x: number, y: number): void {
  rect(c, x + 2, y, 5, 9, '#d48e18');
  rect(c, x, y + 2, 9, 5, '#d48e18');
  rect(c, x + 1, y + 1, 7, 7, '#f5b92c');
  rect(c, x + 2, y + 2, 2, 2, '#fff4bc');
  rect(c, x + 4, y + 3, 1, 4, '#9a5a0e');
}

/** 달력: 지난 날은 X, 납부일은 동전 표시, 오늘은 붉은 테두리 */
export function drawCalendar(c: Ctx, day: number, totalDays: number, isTaxDay: (d: number) => boolean): void {
  const x = 14, y = 14;
  box(c, x, y, 96, 70, '#d9c9a3', '#6b5a3a');
  rect(c, x + 1, y + 1, 94, 13, '#b23a2a');
  rect(c, x + 44, y - 3, 8, 5, '#3a404a');
  for (let d = 1; d <= totalDays; d++) {
    const cx = x + 5 + ((d - 1) % 7) * 13, cy = y + 18 + Math.floor((d - 1) / 7) * 17;
    rect(c, cx, cy, 11, 14, d === day ? '#fff6dc' : '#cdbb92');
    if (isTaxDay(d)) {
      rect(c, cx + 3, cy + 8, 5, 5, '#d48e18');
      rect(c, cx + 4, cy + 9, 3, 3, '#ffde5e');
    }
    if (d < day) {
      line(c, cx + 2, cy + 2, cx + 8, cy + 11, 1, '#b23a2a');
      line(c, cx + 8, cy + 2, cx + 2, cy + 11, 1, '#b23a2a');
    }
    if (d === day) {
      rect(c, cx - 1, cy - 1, 13, 1, '#e0302c');
      rect(c, cx - 1, cy + 14, 13, 1, '#e0302c');
      rect(c, cx - 1, cy - 1, 1, 16, '#e0302c');
      rect(c, cx + 11, cy - 1, 1, 16, '#e0302c');
    }
  }
}

/** 16×16 유물 아이콘을 s배로 그린다. */
export function drawRelic(c: Ctx, id: RelicId, x: number, y: number, s: number): void {
  const r = (a: number, b: number, w: number, h: number, col: string) => rect(c, x + a * s, y + b * s, w * s, h * s, col);
  switch (id) {
    case 'temper_oil':
      r(7, 0, 2, 1, '#6b4a2a'); r(7, 1, 2, 3, '#9aa3ad'); r(4, 4, 8, 10, '#c98a1e'); r(4, 13, 8, 1, '#8a5a10'); r(5, 5, 1, 6, '#ffe08a'); r(4, 4, 8, 1, '#e6b24a');
      break;
    case 'lucky_nail':
      r(3, 2, 7, 2, '#c5cad2'); r(5, 4, 3, 8, '#8a8f98'); r(5, 4, 1, 8, '#c5cad2'); r(6, 12, 2, 1, '#8a8f98'); r(6, 13, 1, 1, '#8a8f98'); r(12, 2, 1, 5, '#ffe26b'); r(10, 4, 5, 1, '#ffe26b');
      break;
    case 'merchant_seal':
      r(5, 0, 6, 2, '#a8432f'); r(6, 2, 4, 5, '#7d2f20'); r(3, 7, 10, 3, '#3a2a22'); r(2, 10, 12, 2, '#d4a017'); r(2, 10, 12, 1, '#ffde5e'); r(5, 13, 6, 1, '#c9361c');
      break;
    case 'big_bellows':
      r(4, 1, 5, 2, '#6b4a2a'); r(2, 3, 9, 10, '#8a5a34'); r(2, 5, 9, 1, '#c98a55'); r(2, 8, 9, 1, '#c98a55'); r(2, 11, 9, 1, '#c98a55'); r(11, 7, 4, 2, '#8a8f98'); r(4, 13, 5, 2, '#6b4a2a');
      break;
    case 'scrap_magnet':
      r(3, 2, 10, 3, '#c9361c'); r(3, 5, 3, 6, '#c9361c'); r(10, 5, 3, 6, '#c9361c'); r(3, 2, 10, 1, '#f2701d'); r(3, 11, 3, 3, '#d7dde6'); r(10, 11, 3, 3, '#d7dde6'); r(7, 12, 2, 2, '#8a8f98');
      break;
    case 'callus_glove':
      r(4, 2, 2, 4, '#c9a06a'); r(6, 1, 2, 5, '#c9a06a'); r(8, 1, 2, 5, '#c9a06a'); r(10, 2, 2, 4, '#c9a06a'); r(4, 6, 8, 7, '#c9a06a'); r(2, 8, 2, 3, '#c9a06a'); r(5, 8, 5, 3, '#a87c4a'); r(4, 13, 8, 2, '#6b4a2a');
      break;
    case 'waiting_stone':
      r(7, 2, 2, 2, '#7ac8e0'); r(7, 5, 2, 1, '#7ac8e0'); r(2, 8, 12, 5, '#6d7f95'); r(2, 8, 12, 1, '#aebdd0'); r(2, 12, 12, 1, '#44505f'); r(4, 10, 4, 1, '#aebdd0');
      break;
    case 'iron_maul':
      r(2, 2, 12, 6, '#3a3f48'); r(2, 2, 12, 1, '#8a929e'); r(2, 7, 12, 1, '#22262c'); r(7, 8, 2, 7, '#7d5636'); r(7, 8, 1, 7, '#a8794f');
      break;
    case 'old_ledger':
      r(3, 2, 10, 12, '#2f6b4a'); r(3, 2, 2, 12, '#1d4530'); r(12, 3, 1, 10, '#e6dcc0'); r(6, 5, 5, 2, '#e6dcc0'); r(6, 9, 5, 1, '#8fc9a8'); r(6, 11, 4, 1, '#8fc9a8');
      break;
    case 'ember_heart':
      r(3, 3, 4, 2, '#c9361c'); r(9, 3, 4, 2, '#c9361c'); r(2, 5, 12, 4, '#f2561d'); r(3, 9, 10, 2, '#f2561d'); r(5, 11, 6, 2, '#c9361c'); r(7, 13, 2, 1, '#c9361c'); r(6, 6, 4, 3, '#ffe26b'); r(7, 7, 2, 1, '#ffffff');
      break;
  }
}

/** 유물 진열장 한 칸 */
export function drawShowcase(c: Ctx, x: number, y: number, id: RelicId | null, selected: boolean): void {
  box(c, x, y, 104, 96, '#1d2b28', selected ? '#ffde5e' : '#8a6a1e');
  rect(c, x + 3, y + 3, 98, 90, '#16211f');
  // 조명
  for (let i = 0; i < 5; i++) rect(c, x + 22 - i * 4, y + 3 + i * 14, 60 + i * 8, 14, i % 2 ? '#1f2f2b' : '#243632');
  rect(c, x + 20, y + 78, 64, 5, '#2b3d38');
  if (id) drawRelic(c, id, x + 28, y + 22, 3);
  if (selected) {
    rect(c, x - 2, y - 2, 108, 2, '#ffde5e');
    rect(c, x - 2, y + 96, 108, 2, '#ffde5e');
    rect(c, x - 2, y, 2, 96, '#ffde5e');
    rect(c, x + 104, y, 2, 96, '#ffde5e');
  }
}
