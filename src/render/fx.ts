import { clearFrame, composite, createFrame, createFx } from 'pixelfx';
import type { Fx } from 'pixelfx';
import * as bluntHit from 'pixelfx/fx/impacts/blunt-hit';
import * as hitSpark from 'pixelfx/fx/impacts/hit-spark';
import * as critHit from 'pixelfx/fx/impacts/crit-hit';
import * as explosion from 'pixelfx/fx/explosions/small-explosion';
import * as collectBurst from 'pixelfx/fx/pickups/collect-burst';
import * as firework from 'pixelfx/fx/explosions/firework-burst';
import { H, W } from './gfx';
import type { Ctx } from './gfx';

const GOLD = ['#2a1405', '#5c3008', '#9a5a0e', '#d48e18', '#f5b92c', '#ffde5e', '#fff4bc', '#ffffff'];
const RED = ['#1d1620', '#4a2a2c', '#7d3a36', '#b05040', '#dc7a64', '#f6b2a2', '#ffffff'];

export type FxKind = 'hold' | 'damage' | 'success' | 'great' | 'destroy' | 'coins' | 'firework';

const frame = createFrame(W, H);
const image = new ImageData(W, H);
const layer = document.createElement('canvas');
layer.width = W;
layer.height = H;
const lctx = layer.getContext('2d')!;
let live: Fx[] = [];
let seed = 1;

export function spawnFx(kind: FxKind, x: number, y: number): void {
  const o = { x, y, seed: seed++ };
  if (kind === 'hold') live.push(createFx(bluntHit, o));
  else if (kind === 'damage') live.push(createFx(bluntHit, { ...o, palette: RED, warm: '#ff8a6b' }));
  else if (kind === 'success') live.push(createFx(hitSpark, o));
  else if (kind === 'great') live.push(createFx(critHit, { ...o, palette: GOLD }));
  else if (kind === 'destroy') live.push(createFx(explosion, { ...o, size: 0.55 }));
  else if (kind === 'coins') live.push(createFx(collectBurst, { ...o, palette: GOLD }));
  else live.push(createFx(firework, o));
}

export function clearFx(): void {
  live = [];
}

export function updateAndDrawFx(c: Ctx, dt: number): void {
  if (live.length === 0) return;
  clearFrame(frame);
  for (const f of live) {
    f.update(dt);
    f.draw(frame);
  }
  live = live.filter((f) => !f.done());
  composite(frame, image.data, null);
  lctx.putImageData(image, 0, 0);
  c.drawImage(layer, 0, 0);
}
