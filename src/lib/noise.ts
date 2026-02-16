// Procedural noise generators for TextureSynth

export class NoiseGenerator {
  private perm: Uint8Array;

  constructor(seed = 0) {
    this.perm = new Uint8Array(512);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    let s = ((seed * 16807 + 1) | 0) || 1;
    for (let i = 255; i > 0; i--) {
      s = (Math.imul(s, 48271) + 1) & 0x7fffffff;
      const j = s % (i + 1);
      const tmp = p[i]; p[i] = p[j]; p[j] = tmp;
    }
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private grad2(hash: number, x: number, y: number): number {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
  }

  perlin2D(x: number, y: number): number {
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = this.fade(xf);
    const v = this.fade(yf);
    const p = this.perm;
    const aa = p[p[xi] + yi];
    const ab = p[p[xi] + yi + 1];
    const ba = p[p[xi + 1] + yi];
    const bb = p[p[xi + 1] + yi + 1];
    return this.lerp(
      this.lerp(this.grad2(aa, xf, yf), this.grad2(ba, xf - 1, yf), u),
      this.lerp(this.grad2(ab, xf, yf - 1), this.grad2(bb, xf - 1, yf - 1), u),
      v
    );
  }

  simplex2D(x: number, y: number): number {
    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;
    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const t = (i + j) * G2;
    const x0 = x - (i - t), y0 = y - (j - t);
    const i1 = x0 > y0 ? 1 : 0;
    const j1 = x0 > y0 ? 0 : 1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
    const p = this.perm;
    let n0 = 0, n1 = 0, n2 = 0;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 > 0) { t0 *= t0; n0 = t0 * t0 * this.grad2(p[ii + p[jj]], x0, y0); }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 > 0) { t1 *= t1; n1 = t1 * t1 * this.grad2(p[ii + i1 + p[jj + j1]], x1, y1); }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 > 0) { t2 *= t2; n2 = t2 * t2 * this.grad2(p[ii + 1 + p[jj + 1]], x2, y2); }
    return 70 * (n0 + n1 + n2);
  }

  fbm(x: number, y: number, octaves: number, lacunarity: number, persistence: number): number {
    let value = 0, amplitude = 1, frequency = 1, maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      value += amplitude * this.perlin2D(x * frequency, y * frequency);
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }
    return value / maxValue;
  }

  simplexFbm(x: number, y: number, octaves: number, lacunarity: number, persistence: number): number {
    let value = 0, amplitude = 1, frequency = 1, maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      value += amplitude * this.simplex2D(x * frequency, y * frequency);
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }
    return value / maxValue;
  }

  ridged(x: number, y: number, octaves: number, lacunarity: number, persistence: number): number {
    let value = 0, amplitude = 1, frequency = 1, maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      const n = 1 - Math.abs(this.perlin2D(x * frequency, y * frequency));
      value += amplitude * n * n;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }
    return value / maxValue;
  }

  voronoi(x: number, y: number, jitter: number): { f1: number; f2: number } {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    let f1 = 999, f2 = 999;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const cx = xi + dx;
        const cy = yi + dy;
        const h = this.hash2(cx, cy);
        const px = cx + 0.5 + (h[0] - 0.5) * jitter;
        const py = cy + 0.5 + (h[1] - 0.5) * jitter;
        const d = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
        if (d < f1) { f2 = f1; f1 = d; }
        else if (d < f2) { f2 = d; }
      }
    }
    return { f1, f2 };
  }

  private hash2(x: number, y: number): [number, number] {
    const p = this.perm;
    const a = p[(x & 255)];
    const b = p[((a + y) & 255)];
    const c = p[((b + x + 37) & 255)];
    return [b / 255, c / 255];
  }
}
