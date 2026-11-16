import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import type { Browser, Page } from 'playwright';
import { PNG } from 'pngjs';
import { preview } from 'vite';
import type { PreviewServer } from 'vite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { botAction } from '../src/game/bot';
import type { Action, GameState } from '../src/game/types';

type Snap = GameState & { busy: boolean; actions: number; relicPrice: number; canvas: { width: number; height: number; scale: number } };

const SHOTS = 'e2e/shots';
const errors: string[] = [];
let server: PreviewServer;
let browser: Browser;
let base = '';

beforeAll(async () => {
  mkdirSync(SHOTS, { recursive: true });
  server = await preview({ preview: { port: 4317 }, logLevel: 'silent' });
  base = server.resolvedUrls!.local[0];
  browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
});

afterAll(async () => {
  await browser?.close();
  await new Promise<void>((done) => server.httpServer.close(() => done()));
});

async function open(query: string): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  await page.goto(`${base}?${query}`);
  await page.waitForFunction(() => '__game' in window && document.fonts.check('11px Galmuri11'));
  return page;
}

const snap = (page: Page) => page.evaluate(() => JSON.parse(JSON.stringify((window as unknown as { __game: unknown }).__game))) as Promise<Snap>;

function keyFor(a: Action): string {
  switch (a.type) {
    case 'start': case 'ack': return 'Enter';
    case 'strike': return 'Space';
    case 'sell': return 'KeyS';
    case 'endDay': case 'leaveShop': return 'KeyN';
    case 'pick': case 'buy': return `Digit${a.index + 1}`;
    case 'reroll': case 'restart': return 'KeyR';
  }
}

/** 키를 한 번 누르고, 그 입력이 게임 상태에 반영될 때까지 기다린다. 상태는 읽기만 한다. */
async function press(page: Page, code: string): Promise<Snap> {
  const before = (await snap(page)).actions;
  await page.keyboard.press(code);
  await page.waitForFunction((n) => {
    const g = (window as unknown as { __game: { actions: number; busy: boolean } }).__game;
    return g.actions > n && !g.busy;
  }, before, { timeout: 5000 });
  return snap(page);
}

async function play(page: Page, policy: (s: Snap) => Action, stop: (s: Snap) => boolean, max = 3000): Promise<Snap> {
  let s = await snap(page);
  for (let i = 0; i < max && !stop(s); i++) s = await press(page, keyFor(policy(s)));
  return s;
}

async function shot(page: Page, name: string): Promise<PNG> {
  const buf = await page.locator('canvas').screenshot();
  writeFileSync(`${SHOTS}/${name}.png`, buf);
  return PNG.sync.read(buf);
}

function colors(png: PNG): number {
  const set = new Set<number>();
  for (let i = 0; i < png.data.length; i += 4) set.add((png.data[i] << 16) | (png.data[i + 1] << 8) | png.data[i + 2]);
  return set.size;
}

/** scale×scale 블록 중 한 가지 색으로만 이루어진 블록의 비율 */
function uniformBlocks(png: PNG, scale: number): number {
  let ok = 0, total = 0;
  for (let by = 0; by < png.height; by += scale) {
    for (let bx = 0; bx < png.width; bx += scale) {
      const o = (by * png.width + bx) * 4;
      let same = true;
      for (let y = 0; y < scale && same; y++) {
        for (let x = 0; x < scale; x++) {
          const i = ((by + y) * png.width + bx + x) * 4;
          if (png.data[i] !== png.data[o] || png.data[i + 1] !== png.data[o + 1] || png.data[i + 2] !== png.data[o + 2]) { same = false; break; }
        }
      }
      total++;
      if (same) ok++;
    }
  }
  return ok / total;
}

/** +5 이상이면 팔고, 타격이 없으면 하루를 넘기는 정책 */
const sellAtFive = (s: Snap): Action => {
  if (s.scene !== 'forge') return botAction(s);
  if (s.swordLevel >= 5) return { type: 'sell' };
  return s.strikesLeft > 0 ? { type: 'strike' } : s.swordLevel > 0 && s.day % 3 === 0 ? { type: 'sell' } : { type: 'endDay' };
};

describe('브라우저에서 키보드로 플레이', () => {
  it('① 강화 → 판매 → 첫 납부일 통과, ④ 상점에서 유물 구매', async () => {
    const page = await open('seed=2&speed=6');
    const title = await shot(page, 'title');
    expect(colors(title)).toBeGreaterThanOrEqual(16);
    expect((await snap(page)).scene).toBe('title');

    let s = await press(page, 'Enter');
    expect(s.scene).toBe('pick');
    await shot(page, 'pick');
    s = await press(page, 'Digit1');
    expect(s).toMatchObject({ scene: 'forge', day: 1, gold: 0 });
    expect(s.relics).toHaveLength(1);

    // 한 번 두드리면 남은 타격이 줄고 결과가 기록된다
    const struck = await press(page, 'Space');
    expect(struck.strikesLeft).toBe(s.strikesLeft - 1);
    expect(struck.lastOutcome).not.toBeNull();

    // 팔 수 있을 때까지 두드린 뒤 판다
    s = await play(page, () => ({ type: 'strike' }), (x) => x.swordLevel >= 3 || x.strikesLeft === 0);
    expect(s.swordLevel).toBeGreaterThan(0);
    const forge = await shot(page, 'forge');
    expect(colors(forge)).toBeGreaterThanOrEqual(16);
    const sold = await press(page, 'KeyS');
    expect(sold.gold).toBe(s.gold + (s as Snap & { sellPrice: number }).sellPrice);
    expect(sold.swordLevel).toBe(0);

    s = await play(page, sellAtFive, (x) => x.scene === 'tax');
    expect(s).toMatchObject({ day: 3, taxOk: true, taxesPaid: 1 });
    await shot(page, 'tax');
    s = await press(page, 'Enter');
    expect(s.scene).toBe('shop');
    const shop = await shot(page, 'shop');
    expect(colors(shop)).toBeGreaterThanOrEqual(16);

    expect(s.gold).toBeGreaterThanOrEqual(s.relicPrice);
    const bought = await press(page, 'Digit1');
    expect(bought.relics).toHaveLength(s.relics.length + 1);
    expect(bought.gold).toBe(s.gold - s.relicPrice);
    await shot(page, 'shop-bought');
    s = await press(page, 'KeyN');
    expect(s).toMatchObject({ scene: 'forge', day: 4 });
    await page.close();
  });

  it('② 세금을 못 내면 게임오버, 재시작하면 1일차 0골드', async () => {
    const page = await open('seed=3&speed=6&autostart');
    let s = await press(page, 'Digit2');
    s = await play(page, (x) => (x.scene === 'forge' ? (x.strikesLeft > 0 ? { type: 'strike' } : { type: 'endDay' }) : { type: 'ack' }), (x) => x.scene === 'gameover');
    expect(s).toMatchObject({ scene: 'gameover', day: 3, gold: 0 });
    await page.waitForTimeout(300);
    const over = await shot(page, 'gameover');
    expect(colors(over)).toBeGreaterThanOrEqual(16);
    s = await press(page, 'KeyR');
    expect(s).toMatchObject({ scene: 'title', day: 1, gold: 0, swordLevel: 0 });
    expect(s.relics).toHaveLength(0);
    s = await press(page, 'Enter');
    expect(s.scene).toBe('pick');
    await page.close();
  });

  it('③ 시드 1..20 중 하나 이상에서 정책 봇이 클리어한다', async () => {
    const results: string[] = [];
    let cleared = false;
    for (let seed = 1; seed <= 20 && !cleared; seed++) {
      const page = await open(`seed=${seed}&speed=40`);
      const s = await play(page, botAction, (x) => x.scene === 'gameover' || x.scene === 'clear', 6000);
      results.push(`${seed}:${s.scene}@${s.day}`);
      if (s.scene === 'clear') {
        cleared = true;
        expect(s).toMatchObject({ day: 21, taxesPaid: 7 });
        await page.waitForTimeout(600);
        await shot(page, 'clear');
      }
      await page.close();
    }
    console.log('bot runs:', results.join(' '));
    expect(cleared).toBe(true);
  });

  it('⑦ 픽셀 격자: 내부 해상도 480×270 이하, 정수배 확대, 블록 99% 이상 단색', async () => {
    const page = await open('seed=5&speed=6&autostart');
    await press(page, 'Digit1');
    await play(page, () => ({ type: 'strike' }), (x) => x.strikesLeft <= 5);
    await page.waitForTimeout(400);
    const s = await snap(page);
    expect(s.canvas.width).toBeLessThanOrEqual(480);
    expect(s.canvas.height).toBeLessThanOrEqual(270);
    expect(Number.isInteger(s.canvas.scale)).toBe(true);
    expect(s.canvas.scale).toBeGreaterThanOrEqual(2);
    const css = await page.locator('canvas').evaluate((el) => {
      const st = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return { rendering: st.imageRendering, w: r.width, h: r.height, x: r.x, y: r.y };
    });
    expect(css.rendering).toBe('pixelated');
    expect(css).toMatchObject({ w: s.canvas.width * s.canvas.scale, h: s.canvas.height * s.canvas.scale });
    expect(Number.isInteger(css.x) && Number.isInteger(css.y)).toBe(true);
    const png = await shot(page, 'forge-grid');
    expect(png.width).toBe(s.canvas.width * s.canvas.scale);
    const ratio = uniformBlocks(png, s.canvas.scale);
    console.log('uniform block ratio:', ratio.toFixed(4), 'scale', s.canvas.scale);
    expect(ratio).toBeGreaterThanOrEqual(0.99);
    await page.close();
  });

  it('⑤ 콘솔 에러와 pageerror가 없다', () => {
    expect(errors).toEqual([]);
  });
});
