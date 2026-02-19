// Procedural noise generators for TextureSynth — expanded with 3D, 4D, curl, value, Gabor, Worley

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

  private fade(t: number): number { return t * t * t * (t * (t * 6 - 15) + 10); }
  private lerp(a: number, b: number, t: number): number { return a + t * (b - a); }

  private grad2(hash: number, x: number, y: number): number {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
  }

  private grad3(hash: number, x: number, y: number, z: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
  }

  private grad4(hash: number, x: number, y: number, z: number, w: number): number {
    const h = hash & 31;
    const a = h >> 3;
    const s1 = a === 0 ? x : a === 1 ? y : a === 2 ? z : w;
    const s2 = a === 0 ? y : a === 1 ? z : a === 2 ? w : x;
    const s3 = a === 0 ? z : a === 1 ? w : a === 2 ? x : y;
    return ((h & 4) ? -s1 : s1) + ((h & 2) ? -s2 : s2) + ((h & 1) ? -s3 : s3);
  }

  // ──── 2D Perlin ────
  perlin2D(x: number, y: number): number {
    const xi = Math.floor(x) & 255, yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x), yf = y - Math.floor(y);
    const u = this.fade(xf), v = this.fade(yf);
    const p = this.perm;
    const aa = p[p[xi] + yi], ab = p[p[xi] + yi + 1];
    const ba = p[p[xi + 1] + yi], bb = p[p[xi + 1] + yi + 1];
    return this.lerp(
      this.lerp(this.grad2(aa, xf, yf), this.grad2(ba, xf - 1, yf), u),
      this.lerp(this.grad2(ab, xf, yf - 1), this.grad2(bb, xf - 1, yf - 1), u), v
    );
  }

  // ──── 3D Perlin ────
  perlin3D(x: number, y: number, z: number): number {
    const xi = Math.floor(x) & 255, yi = Math.floor(y) & 255, zi = Math.floor(z) & 255;
    const xf = x - Math.floor(x), yf = y - Math.floor(y), zf = z - Math.floor(z);
    const u = this.fade(xf), v = this.fade(yf), w = this.fade(zf);
    const p = this.perm;
    const a = p[xi] + yi, aa = p[a] + zi, ab = p[a + 1] + zi;
    const b = p[xi + 1] + yi, ba = p[b] + zi, bb = p[b + 1] + zi;
    return this.lerp(
      this.lerp(
        this.lerp(this.grad3(p[aa], xf, yf, zf), this.grad3(p[ba], xf - 1, yf, zf), u),
        this.lerp(this.grad3(p[ab], xf, yf - 1, zf), this.grad3(p[bb], xf - 1, yf - 1, zf), u), v),
      this.lerp(
        this.lerp(this.grad3(p[aa + 1], xf, yf, zf - 1), this.grad3(p[ba + 1], xf - 1, yf, zf - 1), u),
        this.lerp(this.grad3(p[ab + 1], xf, yf - 1, zf - 1), this.grad3(p[bb + 1], xf - 1, yf - 1, zf - 1), u), v), w
    );
  }

  // ──── 4D Perlin ────
  perlin4D(x: number, y: number, z: number, w: number): number {
    const xi = Math.floor(x) & 255, yi = Math.floor(y) & 255;
    const zi = Math.floor(z) & 255, wi = Math.floor(w) & 255;
    const xf = x - Math.floor(x), yf = y - Math.floor(y);
    const zf = z - Math.floor(z), wf = w - Math.floor(w);
    const fu = this.fade(xf), fv = this.fade(yf), fw = this.fade(zf), ft = this.fade(wf);
    const p = this.perm;
    const g = (ix: number, iy: number, iz: number, iw: number) =>
      this.grad4(p[p[p[p[(xi + ix) & 255] + ((yi + iy) & 255)] + ((zi + iz) & 255)] + ((wi + iw) & 255)],
        xf - ix, yf - iy, zf - iz, wf - iw);
    return this.lerp(
      this.lerp(
        this.lerp(this.lerp(g(0,0,0,0), g(1,0,0,0), fu), this.lerp(g(0,1,0,0), g(1,1,0,0), fu), fv),
        this.lerp(this.lerp(g(0,0,1,0), g(1,0,1,0), fu), this.lerp(g(0,1,1,0), g(1,1,1,0), fu), fv), fw),
      this.lerp(
        this.lerp(this.lerp(g(0,0,0,1), g(1,0,0,1), fu), this.lerp(g(0,1,0,1), g(1,1,0,1), fu), fv),
        this.lerp(this.lerp(g(0,0,1,1), g(1,0,1,1), fu), this.lerp(g(0,1,1,1), g(1,1,1,1), fu), fv), fw), ft
    );
  }

  // ──── 2D Simplex ────
  simplex2D(x: number, y: number): number {
    const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
    const s = (x + y) * F2;
    const i = Math.floor(x + s), j = Math.floor(y + s);
    const t = (i + j) * G2;
    const x0 = x - (i - t), y0 = y - (j - t);
    const i1 = x0 > y0 ? 1 : 0, j1 = x0 > y0 ? 0 : 1;
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

  // ──── 3D Simplex ────
  simplex3D(x: number, y: number, z: number): number {
    const F3 = 1 / 3, G3 = 1 / 6;
    const s = (x + y + z) * F3;
    const i = Math.floor(x + s), j = Math.floor(y + s), k = Math.floor(z + s);
    const t = (i + j + k) * G3;
    const x0 = x - (i - t), y0 = y - (j - t), z0 = z - (k - t);
    let i1: number, j1: number, k1: number, i2: number, j2: number, k2: number;
    if (x0 >= y0) {
      if (y0 >= z0) { i1=1;j1=0;k1=0;i2=1;j2=1;k2=0; }
      else if (x0 >= z0) { i1=1;j1=0;k1=0;i2=1;j2=0;k2=1; }
      else { i1=0;j1=0;k1=1;i2=1;j2=0;k2=1; }
    } else {
      if (y0 < z0) { i1=0;j1=0;k1=1;i2=0;j2=1;k2=1; }
      else if (x0 < z0) { i1=0;j1=1;k1=0;i2=0;j2=1;k2=1; }
      else { i1=0;j1=1;k1=0;i2=1;j2=1;k2=0; }
    }
    const x1=x0-i1+G3, y1=y0-j1+G3, z1=z0-k1+G3;
    const x2=x0-i2+2*G3, y2=y0-j2+2*G3, z2=z0-k2+2*G3;
    const x3=x0-1+3*G3, y3=y0-1+3*G3, z3=z0-1+3*G3;
    const ii=i&255, jj=j&255, kk=k&255;
    const p = this.perm;
    let n = 0;
    const contrib = (tx: number, ty: number, tz: number, gi: number) => {
      let tt = 0.6 - tx*tx - ty*ty - tz*tz;
      if (tt > 0) { tt *= tt; n += tt * tt * this.grad3(gi, tx, ty, tz); }
    };
    contrib(x0,y0,z0, p[ii+p[jj+p[kk]]]);
    contrib(x1,y1,z1, p[ii+i1+p[jj+j1+p[kk+k1]]]);
    contrib(x2,y2,z2, p[ii+i2+p[jj+j2+p[kk+k2]]]);
    contrib(x3,y3,z3, p[ii+1+p[jj+1+p[kk+1]]]);
    return 32 * n;
  }

  // ──── Value Noise ────
  valueNoise2D(x: number, y: number): number {
    const xi = Math.floor(x) & 255, yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x), yf = y - Math.floor(y);
    const u = this.fade(xf), v = this.fade(yf);
    const p = this.perm;
    const a = p[p[xi] + yi] / 255;
    const b = p[p[xi + 1] + yi] / 255;
    const c = p[p[xi] + yi + 1] / 255;
    const d = p[p[xi + 1] + yi + 1] / 255;
    return this.lerp(this.lerp(a, b, u), this.lerp(c, d, u), v);
  }

  // ──── FBM Variants ────
  fbm(x: number, y: number, octaves: number, lacunarity: number, persistence: number): number {
    let value = 0, amplitude = 1, frequency = 1, maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      value += amplitude * this.perlin2D(x * frequency, y * frequency);
      maxValue += amplitude; amplitude *= persistence; frequency *= lacunarity;
    }
    return value / maxValue;
  }

  simplexFbm(x: number, y: number, octaves: number, lacunarity: number, persistence: number): number {
    let value = 0, amplitude = 1, frequency = 1, maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      value += amplitude * this.simplex2D(x * frequency, y * frequency);
      maxValue += amplitude; amplitude *= persistence; frequency *= lacunarity;
    }
    return value / maxValue;
  }

  fbm3D(x: number, y: number, z: number, octaves: number, lacunarity: number, persistence: number): number {
    let value = 0, amplitude = 1, frequency = 1, maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      value += amplitude * this.perlin3D(x * frequency, y * frequency, z * frequency);
      maxValue += amplitude; amplitude *= persistence; frequency *= lacunarity;
    }
    return value / maxValue;
  }

  fbm4D(x: number, y: number, z: number, w: number, octaves: number, lacunarity: number, persistence: number): number {
    let value = 0, amplitude = 1, frequency = 1, maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      value += amplitude * this.perlin4D(x * frequency, y * frequency, z * frequency, w * frequency);
      maxValue += amplitude; amplitude *= persistence; frequency *= lacunarity;
    }
    return value / maxValue;
  }

  ridged(x: number, y: number, octaves: number, lacunarity: number, persistence: number): number {
    let value = 0, amplitude = 1, frequency = 1, maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      const n = 1 - Math.abs(this.perlin2D(x * frequency, y * frequency));
      value += amplitude * n * n; maxValue += amplitude;
      amplitude *= persistence; frequency *= lacunarity;
    }
    return value / maxValue;
  }

  ridged3D(x: number, y: number, z: number, octaves: number, lacunarity: number, persistence: number): number {
    let value = 0, amplitude = 1, frequency = 1, maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      const n = 1 - Math.abs(this.perlin3D(x * frequency, y * frequency, z * frequency));
      value += amplitude * n * n; maxValue += amplitude;
      amplitude *= persistence; frequency *= lacunarity;
    }
    return value / maxValue;
  }

  // ──── Turbulence ────
  turbulence(x: number, y: number, octaves: number, lacunarity: number, persistence: number): number {
    let value = 0, amplitude = 1, frequency = 1, maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      value += amplitude * Math.abs(this.perlin2D(x * frequency, y * frequency));
      maxValue += amplitude; amplitude *= persistence; frequency *= lacunarity;
    }
    return value / maxValue;
  }

  // ──── Curl Noise (2D) ────
  curl2D(x: number, y: number, epsilon = 0.001): [number, number] {
    const dndx = (this.perlin2D(x + epsilon, y) - this.perlin2D(x - epsilon, y)) / (2 * epsilon);
    const dndy = (this.perlin2D(x, y + epsilon) - this.perlin2D(x, y - epsilon)) / (2 * epsilon);
    return [dndy, -dndx];
  }

  // ──── Voronoi ────
  voronoi(x: number, y: number, jitter: number): { f1: number; f2: number; id: number } {
    const xi = Math.floor(x), yi = Math.floor(y);
    let f1 = 999, f2 = 999, cellId = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const cx = xi + dx, cy = yi + dy;
        const h = this.hash2(cx, cy);
        const px = cx + 0.5 + (h[0] - 0.5) * jitter;
        const py = cy + 0.5 + (h[1] - 0.5) * jitter;
        const d = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
        if (d < f1) { f2 = f1; f1 = d; cellId = cx * 7919 + cy * 104729; }
        else if (d < f2) { f2 = d; }
      }
    }
    return { f1, f2, id: cellId };
  }

  // ──── Worley 3D ────
  voronoi3D(x: number, y: number, z: number, jitter: number): { f1: number; f2: number } {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    let f1 = 999, f2 = 999;
    for (let dz = -1; dz <= 1; dz++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const cx = xi + dx, cy = yi + dy, cz = zi + dz;
          const h = this.hash3(cx, cy, cz);
          const px = cx + 0.5 + (h[0] - 0.5) * jitter;
          const py = cy + 0.5 + (h[1] - 0.5) * jitter;
          const pz = cz + 0.5 + (h[2] - 0.5) * jitter;
          const d = Math.sqrt((x-px)**2 + (y-py)**2 + (z-pz)**2);
          if (d < f1) { f2 = f1; f1 = d; }
          else if (d < f2) { f2 = d; }
        }
      }
    }
    return { f1, f2 };
  }

  // ──── Gabor Noise ────
  gaborNoise(x: number, y: number, frequency: number, angle: number, kernels: number): number {
    let sum = 0;
    const ca = Math.cos(angle), sa = Math.sin(angle);
    for (let i = 0; i < kernels; i++) {
      const h = this.hash2(i * 17, i * 31);
      const kx = h[0] * 10, ky = h[1] * 10;
      const dx = x - kx, dy = y - ky;
      const r2 = dx * dx + dy * dy;
      const env = Math.exp(-r2 * 0.5);
      const phase = (dx * ca + dy * sa) * frequency;
      sum += env * Math.cos(phase * Math.PI * 2);
    }
    return sum / Math.sqrt(kernels);
  }

  private hash2(x: number, y: number): [number, number] {
    const p = this.perm;
    const a = p[(x & 255)];
    const b = p[((a + y) & 255)];
    const c = p[((b + x + 37) & 255)];
    return [b / 255, c / 255];
  }

  private hash3(x: number, y: number, z: number): [number, number, number] {
    const p = this.perm;
    const a = p[(x & 255)];
    const b = p[((a + y) & 255)];
    const c = p[((b + z) & 255)];
    const d = p[((c + x + 37) & 255)];
    return [b / 255, c / 255, d / 255];
  }
}

// ──── Reaction-Diffusion (Gray-Scott) ────
export function grayScott(
  width: number, height: number,
  feed: number, kill: number,
  diffA: number, diffB: number,
  iterations: number
): Float32Array {
  const size = width * height;
  let a = new Float32Array(size).fill(1);
  let b = new Float32Array(size).fill(0);
  let na = new Float32Array(size);
  let nb = new Float32Array(size);

  // Seed center
  const cx = width / 2, cy = height / 2;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (Math.abs(x - cx) < 10 && Math.abs(y - cy) < 10) {
        b[y * width + x] = 1;
      }
    }
  }

  for (let iter = 0; iter < iterations; iter++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const lx = x > 0 ? i - 1 : i + width - 1;
        const rx = x < width - 1 ? i + 1 : i - width + 1;
        const ty = y > 0 ? i - width : i + (height - 1) * width;
        const by = y < height - 1 ? i + width : i - (height - 1) * width;
        const lapA = a[lx] + a[rx] + a[ty] + a[by] - 4 * a[i];
        const lapB = b[lx] + b[rx] + b[ty] + b[by] - 4 * b[i];
        const abb = a[i] * b[i] * b[i];
        na[i] = a[i] + diffA * lapA - abb + feed * (1 - a[i]);
        nb[i] = b[i] + diffB * lapB + abb - (kill + feed) * b[i];
        na[i] = Math.max(0, Math.min(1, na[i]));
        nb[i] = Math.max(0, Math.min(1, nb[i]));
      }
    }
    [a, na] = [na, a];
    [b, nb] = [nb, b];
  }
  return b;
}
