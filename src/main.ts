import fontUrl from 'galmuri/dist/Galmuri11.woff2?url';
import { sfx, unlockAudio } from './audio';
import {
  TOTAL_DAYS, isTaxDay, newGame, nextTax, nextTaxDay, reduce, relicPrice, rerollCost, sellPrice,
  strikeProbs, strikesPerDay, swordName,
} from './game/engine';
import { relicInfo } from './game/relics';
import { OUTCOMES } from './game/types';
import type { Action, GameState, Outcome } from './game/types';
import { drawAnvil, drawBackground, drawCalendar, drawCoin, drawEyeWindow, drawFurnace, drawHammer, drawRelic, drawShowcase, drawSword } from './render/art';
import { clearFx, spawnFx, updateAndDrawFx } from './render/fx';
import { H, W, box, gold, rect, text } from './render/gfx';
import type { Ctx } from './render/gfx';

const OUTCOME_LABEL: Record<Outcome, string> = { destroy: '파괴', damage: '손상', hold: '유지', success: '성공', great: '대성공' };
const OUTCOME_COLOR: Record<Outcome, string> = { destroy: '#e0524a', damage: '#e09a4a', hold: '#9bd47a', success: '#7ac8e0', great: '#e58ae0' };
const INK = '#f3e9d2';
const DIM = '#a89a82';

const params = new URLSearchParams(location.search);
const speed = Math.max(1, Number(params.get('speed')) || 1);
let state: GameState = newGame(Number(params.get('seed')) || (Date.now() % 100000) + 1);

const canvas = document.getElementById('game') as HTMLCanvasElement;
canvas.width = W;
canvas.height = H;
const ctx = canvas.getContext('2d')!;
ctx.imageSmoothingEnabled = false;
let scale = 1;
function fit(): void {
  scale = Math.max(1, Math.floor(Math.min(innerWidth / W, innerHeight / H)));
  canvas.style.width = `${W * scale}px`;
  canvas.style.height = `${H * scale}px`;
}
addEventListener('resize', fit);
fit();

const bg = document.createElement('canvas');
bg.width = W;
bg.height = H;
drawBackground(bg.getContext('2d')!);

// 연출 상태 (게임 규칙과 무관)
let time = 0;
let actions = 0;
let swing = -1; // 망치 애니메이션 진행 시간, -1이면 쉬는 중
let struck = false;
let heat = 0;
let shake = 0;
let cursor = 0;
let shownGold = 0;
let message = '';
let messageT = 0;
const floats: { s: string; x: number; y: number; color: string; t: number }[] = [];

const SWING_HIT = 0.09;
const SWING_END = 0.26;

function dispatch(a: Action): boolean {
  const next = reduce(state, a);
  if (next === state) return false;
  const prevScene = state.scene;
  state = next;
  actions++;
  if (state.scene !== prevScene) {
    cursor = 0;
    clearFx();
    if (state.scene === 'gameover') sfx('fail');
    if (state.scene === 'clear') {
      sfx('clear');
      [120, 240, 360].forEach((x, i) => setTimeout(() => spawnFx('firework', x, 120 - (i % 2) * 30), i * 350));
    }
  }
  return true;
}

function say(s: string): void {
  message = s;
  messageT = 1.6;
}

function onStrikeImpact(): void {
  const before = state.swordLevel;
  if (!dispatch({ type: 'strike' })) return;
  const o = state.lastOutcome!;
  heat = 1;
  shake = o === 'destroy' ? 0.45 : o === 'great' ? 0.25 : 0.1;
  spawnFx(o, 262, 172);
  sfx(o);
  const diff = state.swordLevel - before;
  floats.push({ s: OUTCOME_LABEL[o] + (o === 'destroy' || diff === 0 ? '' : ` ${diff > 0 ? '+' : ''}${diff}`), x: 244, y: 140, color: OUTCOME_COLOR[o], t: 0 });
}

function key(code: string): void {
  unlockAudio();
  const confirm = code === 'Enter' || code === 'Space';
  const digit = /^Digit[123]$/.test(code) ? Number(code.slice(5)) - 1 : -1;
  switch (state.scene) {
    case 'title':
      if (confirm) dispatch({ type: 'start' });
      break;
    case 'pick':
    case 'shop': {
      const n = state.offer.length;
      const act = (i: number): void => {
        if (state.scene === 'pick') {
          if (dispatch({ type: 'pick', index: i })) sfx('coins');
        } else if (dispatch({ type: 'buy', index: i })) {
          sfx('coins');
          spawnFx('coins', 112 + i * 128, 150);
          cursor = Math.min(cursor, Math.max(0, state.offer.length - 1));
        } else say('골드가 모자랍니다');
      };
      if (code === 'ArrowLeft' && n) { cursor = (cursor + n - 1) % n; sfx('select'); }
      else if (code === 'ArrowRight' && n) { cursor = (cursor + 1) % n; sfx('select'); }
      else if (digit >= 0 && digit < n) act(digit);
      else if (confirm && n) act(cursor);
      else if (state.scene === 'shop' && code === 'KeyR') { if (dispatch({ type: 'reroll' })) sfx('select'); else say('골드가 모자랍니다'); }
      else if (state.scene === 'shop' && code === 'KeyN') dispatch({ type: 'leaveShop' });
      break;
    }
    case 'forge':
      if (swing >= 0) break;
      if (confirm) {
        if (state.strikesLeft > 0) { swing = 0; struck = false; }
        else say('오늘은 더 두드릴 수 없습니다 (N: 하루 넘기기)');
      } else if (code === 'KeyS') {
        const price = sellPrice(state);
        if (dispatch({ type: 'sell' })) {
          sfx('coins');
          spawnFx('coins', 240, 180);
          floats.push({ s: `+${gold(price)}`, x: 244, y: 140, color: '#ffde5e', t: 0 });
        } else say('+0 검은 팔 수 없습니다');
      } else if (code === 'KeyN') dispatch({ type: 'endDay' });
      break;
    case 'tax':
      if (confirm) dispatch({ type: 'ack' });
      break;
    case 'gameover':
    case 'clear':
      if (confirm || code === 'KeyR') dispatch({ type: 'restart' });
      break;
  }
}

addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (['Space', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  key(e.code);
});
canvas.addEventListener('pointerdown', () => key('Enter'));

function update(dt: number): void {
  time += dt;
  if (swing >= 0) {
    swing += dt;
    if (!struck && swing >= SWING_HIT) { struck = true; onStrikeImpact(); }
    if (swing >= SWING_END) swing = -1;
  }
  heat = Math.max(0, heat - dt * 1.5);
  shake = Math.max(0, shake - dt);
  messageT = Math.max(0, messageT - dt);
  shownGold += (state.gold - shownGold) * Math.min(1, dt * 10);
  if (Math.abs(state.gold - shownGold) < 1) shownGold = state.gold;
  for (const f of floats) f.t += dt;
  while (floats.length && floats[0].t > 1) floats.shift();
}

function drawForgeWorld(c: Ctx, withUi: boolean): void {
  c.drawImage(bg, 0, 0);
  drawFurnace(c, time);
  drawEyeWindow(c, 380, 16, 80, 46, time, false);
  drawAnvil(c);
  if (state.scene === 'forge' || withUi) drawSword(c, state.swordLevel, heat, time);
  const s = swing < 0 ? 0 : swing < SWING_HIT ? swing / SWING_HIT : 1 - (swing - SWING_HIT) / (SWING_END - SWING_HIT);
  drawHammer(c, s);
}

function drawHud(c: Ctx): void {
  drawCalendar(c, state.day, TOTAL_DAYS, isTaxDay);
  text(c, `${state.day}일차`, 62, 16, '#fff6dc', { align: 'center' });
  // 강화 패널
  box(c, 122, 10, 236, 88, '#3a2c20', '#1a120c');
  rect(c, 124, 12, 232, 1, '#5a4632');
  text(c, swordName(state.swordLevel), 130, 15, INK);
  text(c, `+${state.swordLevel}`, 350, 15, '#ffde5e', { align: 'right' });
  text(c, '파는 값', 130, 29, DIM);
  text(c, gold(sellPrice(state)), 350, 29, INK, { align: 'right' });
  const per = strikesPerDay(state);
  text(c, `남은 타격 ${state.strikesLeft}/${per}`, 130, 43, DIM);
  for (let i = 0; i < per; i++) rect(c, 350 - (per - i) * 8, 46, 6, 5, i < state.strikesLeft ? '#ffb84a' : '#1a120c');
  const p = strikeProbs(state);
  let bx = 130;
  OUTCOMES.forEach((o, i) => {
    const cx = 152 + i * 44;
    text(c, OUTCOME_LABEL[o], cx, 58, OUTCOME_COLOR[o], { align: 'center' });
    text(c, `${(p[o] * 100).toFixed(1)}%`, cx, 71, INK, { align: 'center' });
    const w = Math.round(p[o] * 220);
    rect(c, bx, 87, w, 4, OUTCOME_COLOR[o]);
    bx += w;
  });
  // 세금 안내
  text(c, `${nextTaxDay(state)}일차 세금`, 420, 68, DIM, { align: 'center', shadow: '#000' });
  text(c, gold(nextTax(state)), 420, 81, state.gold >= nextTax(state) ? '#9bd47a' : '#ff8a6b', { align: 'center', shadow: '#000' });
  drawPurse(c);
  text(c, state.strikesLeft > 0 ? 'Space 두드리기 · S 팔기 · N 하루 넘기기' : 'S 팔기 · N 하루 넘기기', 472, 254, DIM, { align: 'right', shadow: '#000' });
}

function drawPurse(c: Ctx): void {
  state.relics.forEach((id, i) => {
    box(c, 8 + i * 20, 226, 20, 20, '#1d2b28', '#8a6a1e');
    drawRelic(c, id, 10 + i * 20, 228, 1);
  });
  drawCoin(c, 10, 254);
  text(c, gold(Math.round(shownGold)), 24, 253, '#ffde5e', { shadow: '#000' });
}

function dim(c: Ctx, a: string): void {
  rect(c, 0, 0, W, H, a);
}

function drawOffer(c: Ctx, title: string, hint: string): void {
  dim(c, '#000000b0');
  text(c, title, 240, 22, INK, { align: 'center', size: 22, shadow: '#000' });
  const n = state.offer.length;
  state.offer.forEach((id, i) => drawShowcase(c, 60 + i * 128, 62, id, i === cursor));
  for (let i = n; i < 3; i++) drawShowcase(c, 60 + i * 128, 62, null, false);
  state.offer.forEach((_, i) => text(c, `${i + 1}`, 66 + i * 128, 66, DIM));
  box(c, 60, 170, 360, 44, '#16120e', '#8a6a1e');
  const sel = state.offer[cursor];
  if (sel) {
    const info = relicInfo(sel);
    text(c, info.name, 70, 176, '#ffde5e');
    text(c, info.desc, 70, 192, INK);
    text(c, state.scene === 'shop' ? gold(relicPrice(state)) : '무료', 410, 176, state.scene === 'shop' && state.gold < relicPrice(state) ? '#ff8a6b' : '#9bd47a', { align: 'right' });
  } else text(c, '진열장이 비었습니다', 240, 184, DIM, { align: 'center' });
  text(c, hint, 240, 222, DIM, { align: 'center', shadow: '#000' });
}

function render(dt: number): void {
  const c = ctx;
  c.save();
  if (shake > 0) c.translate(Math.round((Math.random() - 0.5) * 6 * Math.min(1, shake * 5)), Math.round((Math.random() - 0.5) * 4 * Math.min(1, shake * 5)));
  switch (state.scene) {
    case 'title':
      drawForgeWorld(c, false);
      dim(c, '#00000080');
      text(c, '모루와 세리', 240, 70, '#ffde5e', { align: 'center', size: 44, shadow: '#3a1208' });
      text(c, '검을 두드려 값을 올리고, 사흘마다 찾아오는 세리에게 세금을 바쳐라', 240, 130, INK, { align: 'center', shadow: '#000' });
      text(c, '21일을 버티면 계약이 끝난다', 240, 146, DIM, { align: 'center', shadow: '#000' });
      if (Math.floor(time * 2) % 2 === 0) text(c, 'Enter 또는 Space로 시작', 240, 190, INK, { align: 'center', shadow: '#000' });
      break;
    case 'pick':
      drawForgeWorld(c, false);
      drawOffer(c, '첫 유물을 고르세요', '← → 고르기 · Enter 선택 (1·2·3 바로 선택)');
      break;
    case 'forge':
      drawForgeWorld(c, true);
      drawHud(c);
      break;
    case 'tax': {
      c.drawImage(bg, 0, 0);
      dim(c, '#000000a0');
      drawEyeWindow(c, 150, 30, 180, 100, time, !state.taxOk);
      text(c, `${state.day}일차 세금  ${gold(state.taxDue)}`, 240, 150, INK, { align: 'center', size: 22, shadow: '#000' });
      if (state.taxOk) text(c, '세리가 금화를 세어 보고는 눈을 가늘게 뜬다. 납부 완료.', 240, 184, '#9bd47a', { align: 'center' });
      else text(c, `가진 돈은 ${gold(state.gold)}뿐이다. 세리의 눈이 붉게 타오른다.`, 240, 184, '#ff8a6b', { align: 'center' });
      text(c, 'Enter 계속', 240, 222, DIM, { align: 'center' });
      drawPurse(c);
      break;
    }
    case 'shop':
      drawForgeWorld(c, false);
      drawOffer(c, '유물 진열장', `Enter 구매 · R 새로 들이기 ${gold(rerollCost(state))} · N 대장간으로`);
      drawPurse(c);
      break;
    case 'gameover':
      c.drawImage(bg, 0, 0);
      dim(c, '#200000c0');
      drawEyeWindow(c, 170, 24, 140, 80, time, true);
      text(c, '대장간을 빼앗겼다', 240, 122, '#ff8a6b', { align: 'center', size: 22, shadow: '#000' });
      text(c, `${state.day}일차 · 세금 ${state.taxesPaid}번 납부 · 유물 ${state.relics.length}개`, 240, 160, INK, { align: 'center' });
      text(c, 'R 또는 Enter로 다시 시작', 240, 200, DIM, { align: 'center' });
      break;
    case 'clear':
      drawForgeWorld(c, false);
      dim(c, '#00000090');
      text(c, '계약 완수!', 240, 80, '#ffde5e', { align: 'center', size: 44, shadow: '#3a1208' });
      text(c, `21일 동안 세금을 모두 냈다 · 남은 돈 ${gold(state.gold)}`, 240, 140, INK, { align: 'center' });
      text(c, 'R 또는 Enter로 다시 시작', 240, 200, DIM, { align: 'center' });
      break;
  }
  updateAndDrawFx(c, dt);
  for (const f of floats) text(c, f.s, f.x, f.y - Math.round(f.t * 26), f.color, { align: 'center', size: 22, shadow: '#000' });
  if (messageT > 0) {
    box(c, 110, 236, 260, 16, '#16120e', '#8a6a1e');
    text(c, message, 240, 238, '#ff8a6b', { align: 'center' });
  }
  c.restore();
}

// 읽기 전용 상태 스냅샷. 상태를 바꾸는 함수는 내보내지 않는다.
Object.defineProperty(window, '__game', {
  get: () =>
    Object.freeze({
      ...state,
      relics: [...state.relics],
      offer: [...state.offer],
      busy: swing >= 0,
      actions,
      cursor,
      nextTax: nextTax(state),
      sellPrice: sellPrice(state),
      relicPrice: relicPrice(state),
      canvas: { width: canvas.width, height: canvas.height, scale },
    }),
});

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000) * speed;
  last = now;
  update(dt);
  render(dt);
  requestAnimationFrame(frame);
}

const font = new FontFace('Galmuri11', `url(${fontUrl})`);
font
  .load()
  .then((f) => document.fonts.add(f))
  .catch(() => undefined)
  .finally(() => {
    if (params.has('autostart')) dispatch({ type: 'start' });
    requestAnimationFrame(frame);
  });
