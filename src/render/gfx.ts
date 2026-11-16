export const W = 480;
export const H = 270;
export type Ctx = CanvasRenderingContext2D;

export function rect(c: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export function box(c: Ctx, x: number, y: number, w: number, h: number, fill: string, border: string): void {
  rect(c, x, y, w, h, border);
  rect(c, x + 1, y + 1, w - 2, h - 2, fill);
}

/** 굵기가 있는 계단식 선 */
export function line(c: Ctx, x0: number, y0: number, x1: number, y1: number, t: number, color: string): void {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) rect(c, x0 + ((x1 - x0) * i) / n - t / 2, y0 + ((y1 - y0) * i) / n - t / 2, t, t, color);
}

export interface TextOpts { align?: CanvasTextAlign; size?: number; shadow?: string }

export function text(c: Ctx, s: string, x: number, y: number, color: string, o: TextOpts = {}): void {
  c.font = `${o.size ?? 11}px Galmuri11, monospace`;
  c.textBaseline = 'top';
  c.textAlign = o.align ?? 'left';
  if (o.shadow) {
    c.fillStyle = o.shadow;
    c.fillText(s, Math.round(x) + 1, Math.round(y) + 1);
  }
  c.fillStyle = color;
  c.fillText(s, Math.round(x), Math.round(y));
}

export const gold = (n: number) => `${n.toLocaleString('en-US')} G`;
