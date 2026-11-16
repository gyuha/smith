declare module 'pixelfx' {
  export interface Frame { w: number; h: number; color: Uint32Array; light: Uint32Array }
  export interface Fx { update(dt: number): void; draw(frame: Frame, layer?: 'back' | 'front'): void; done(): boolean }
  export function createFrame(w: number, h: number): Frame;
  export function clearFrame(f: Frame): Frame;
  export function createFx(mod: unknown, o?: Record<string, unknown>): Fx;
  export function composite(f: Frame, out: Uint8ClampedArray, bg?: number | null): Uint8ClampedArray;
}
declare module 'pixelfx/fx/*' {
  const mod: unknown;
  export = mod;
}
declare module '*.woff2?url' {
  const url: string;
  export default url;
}
