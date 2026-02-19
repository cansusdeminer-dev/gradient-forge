import { NoiseGenerator, grayScott } from './noise';

// === TYPES ===
export interface ParamDef {
  id: string;
  label: string;
  min: number;
  max: number;
  default: number;
  step?: number;
}

export interface ModuleDef {
  id: string;
  name: string;
  category: 'generator' | 'modifier' | 'fx' | 'utility' | 'physics';
  params: ParamDef[];
  inputs: string[];
  outputs: string[];
  color: string;
  icon: string;
  compute: (
    w: number, h: number,
    params: Record<string, number>,
    inputs: Record<string, ImageData | null>
  ) => ImageData;
}

// === HELPERS ===
function clamp01(v: number): number { return Math.max(0, Math.min(1, v)); }
function smoothstep(a: number, b: number, x: number): number {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}
function clamp255(v: number): number { return Math.max(0, Math.min(255, Math.round(v))); }

function gen(w: number, h: number, fn: (nx: number, ny: number) => number): ImageData {
  const img = new ImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = clamp255(clamp01(fn(x / w, y / h)) * 255);
      const i = (y * w + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
    }
  }
  return img;
}

function genRGB(w: number, h: number, fn: (nx: number, ny: number) => [number, number, number]): ImageData {
  const img = new ImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b] = fn(x / w, y / h);
      const i = (y * w + x) * 4;
      d[i] = clamp255(r); d[i + 1] = clamp255(g); d[i + 2] = clamp255(b); d[i + 3] = 255;
    }
  }
  return img;
}

function xform(input: ImageData | null, w: number, h: number, fn: (r: number, g: number, b: number, nx: number, ny: number) => [number, number, number]): ImageData {
  const img = new ImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const ir = input ? input.data[i] : 0;
      const ig = input ? input.data[i + 1] : 0;
      const ib = input ? input.data[i + 2] : 0;
      const [r, g, b] = fn(ir, ig, ib, x / w, y / h);
      d[i] = clamp255(r); d[i + 1] = clamp255(g); d[i + 2] = clamp255(b); d[i + 3] = 255;
    }
  }
  return img;
}

function remap(input: ImageData | null, w: number, h: number, fn: (nx: number, ny: number) => [number, number]): ImageData {
  if (!input) return new ImageData(w, h);
  const img = new ImageData(w, h);
  const d = img.data, s = input.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [sx, sy] = fn(x / w, y / h);
      const sxi = Math.min(w - 1, Math.max(0, Math.round(sx * (w - 1))));
      const syi = Math.min(h - 1, Math.max(0, Math.round(sy * (h - 1))));
      const si = (syi * w + sxi) * 4;
      const di = (y * w + x) * 4;
      d[di] = s[si]; d[di + 1] = s[si + 1]; d[di + 2] = s[si + 2]; d[di + 3] = 255;
    }
  }
  return img;
}

function convolve3x3(input: ImageData | null, w: number, h: number, kernel: number[][], bias = 0): ImageData {
  if (!input) return new ImageData(w, h);
  const img = new ImageData(w, h);
  const d = img.data, s = input.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const sy = Math.min(h - 1, Math.max(0, y + ky));
          const sx = Math.min(w - 1, Math.max(0, x + kx));
          const si = (sy * w + sx) * 4;
          const k = kernel[ky + 1][kx + 1];
          r += s[si] * k; g += s[si + 1] * k; b += s[si + 2] * k;
        }
      }
      const di = (y * w + x) * 4;
      d[di] = clamp255(r + bias); d[di + 1] = clamp255(g + bias); d[di + 2] = clamp255(b + bias); d[di + 3] = 255;
    }
  }
  return img;
}

function boxBlur(input: ImageData | null, w: number, h: number, radius: number): ImageData {
  if (!input) return new ImageData(w, h);
  const r = Math.min(15, Math.max(0, Math.round(radius)));
  if (r === 0) { const img = new ImageData(w, h); img.data.set(input.data); return img; }
  const src = input.data;
  const tmp = new Uint8ClampedArray(src.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let rr = 0, gg = 0, bb = 0, count = 0;
      for (let dx = -r; dx <= r; dx++) {
        const nx = Math.min(w - 1, Math.max(0, x + dx));
        const i = (y * w + nx) * 4;
        rr += src[i]; gg += src[i + 1]; bb += src[i + 2]; count++;
      }
      const i = (y * w + x) * 4;
      tmp[i] = rr / count; tmp[i + 1] = gg / count; tmp[i + 2] = bb / count; tmp[i + 3] = 255;
    }
  }
  const img = new ImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let rr = 0, gg = 0, bb = 0, count = 0;
      for (let dy = -r; dy <= r; dy++) {
        const ny = Math.min(h - 1, Math.max(0, y + dy));
        const i = (ny * w + x) * 4;
        rr += tmp[i]; gg += tmp[i + 1]; bb += tmp[i + 2]; count++;
      }
      const i = (y * w + x) * 4;
      d[i] = rr / count; d[i + 1] = gg / count; d[i + 2] = bb / count; d[i + 3] = 255;
    }
  }
  return img;
}

// === COLOR CONVERSION ===
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) return [l, l, l];
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue2rgb(p, q, h + 1 / 3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1 / 3)];
}

// === PALETTES ===
const PALETTES: number[][][] = [
  [[0,0,0],[128,17,0],[255,68,0],[255,153,0],[255,221,68],[255,255,221]],
  [[0,7,20],[0,41,97],[0,97,163],[29,163,214],[119,209,240],[214,240,252]],
  [[5,0,20],[89,0,179],[204,0,153],[255,51,102],[255,153,51],[255,255,51]],
  [[10,15,5],[30,60,15],[60,120,30],[120,170,60],[170,210,100],[220,240,180]],
  [[68,1,84],[72,36,117],[65,68,135],[53,95,141],[33,145,140],[94,201,98],[253,231,37]],
  [[0,0,0],[255,255,255]],
  [[25,10,40],[80,20,90],[160,40,100],[220,80,60],[250,160,50],[255,230,120]],
  [[10,10,30],[20,40,80],[40,80,140],[80,140,200],[150,200,230],[220,240,255]],
  [[20,0,0],[80,0,20],[150,10,40],[200,60,20],[230,120,10],[255,200,50]],
  [[0,0,0],[0,255,128],[0,128,255],[128,0,255],[255,0,128],[255,255,255]],
  [[30,20,10],[60,45,25],[90,75,50],[140,120,80],[190,170,130],[230,220,200]],
  [[0,10,20],[0,40,50],[0,80,70],[20,140,100],[80,200,140],[180,240,200]],
  // New palettes
  [[10,0,30],[40,0,80],[100,0,150],[180,20,200],[220,100,230],[255,200,255]], // 12: Ultraviolet
  [[0,0,0],[30,30,30],[80,80,80],[140,140,140],[200,200,200],[255,255,255]], // 13: Grayscale
  [[20,10,5],[60,30,15],[120,60,20],[180,100,30],[220,160,60],[250,220,120]], // 14: Copper
  [[0,20,30],[0,60,80],[0,120,140],[20,180,180],[80,220,200],[180,250,240]], // 15: Teal
  [[40,0,0],[120,0,0],[200,30,0],[240,100,20],[250,180,60],[255,240,150]], // 16: Inferno
  [[10,5,20],[30,15,60],[60,30,120],[120,60,200],[180,120,240],[230,200,255]], // 17: Amethyst
  [[0,10,0],[0,40,10],[0,80,20],[20,140,40],[60,200,80],[140,250,160]], // 18: Emerald
  [[20,15,10],[50,40,30],[90,70,50],[140,110,80],[200,170,120],[240,230,200]], // 19: Sandstone
];

function samplePalette(palette: number[][], t: number): [number, number, number] {
  t = clamp01(t);
  const n = palette.length - 1;
  const idx = t * n;
  const i = Math.min(Math.floor(idx), n - 1);
  const f = idx - i;
  return [
    palette[i][0] + (palette[i + 1][0] - palette[i][0]) * f,
    palette[i][1] + (palette[i + 1][1] - palette[i][1]) * f,
    palette[i][2] + (palette[i + 1][2] - palette[i][2]) * f,
  ];
}

// === MODULE DEFINITIONS ===
export const MODULES: Record<string, ModuleDef> = {

  // ══════════════════════════════════════════════════
  //  GENERATORS
  // ══════════════════════════════════════════════════

  perlin: {
    id: 'perlin', name: 'Perlin Noise', category: 'generator', icon: '◈', color: 'hsl(180 100% 50%)',
    inputs: [], outputs: ['out'],
    params: [
      { id: 'frequency', label: 'Freq', min: 0.5, max: 40, default: 4, step: 0.1 },
      { id: 'octaves', label: 'Oct', min: 1, max: 12, default: 4, step: 1 },
      { id: 'lacunarity', label: 'Lac', min: 1, max: 4, default: 2, step: 0.1 },
      { id: 'persistence', label: 'Pers', min: 0, max: 1, default: 0.5, step: 0.01 },
      { id: 'seed', label: 'Seed', min: 0, max: 9999, default: 42, step: 1 },
    ],
    compute: (w, h, p) => {
      const n = new NoiseGenerator(p.seed ?? 42);
      return gen(w, h, (nx, ny) => n.fbm(nx * (p.frequency ?? 4), ny * (p.frequency ?? 4), Math.round(p.octaves ?? 4), p.lacunarity ?? 2, p.persistence ?? 0.5) * 0.5 + 0.5);
    },
  },

  simplex: {
    id: 'simplex', name: 'Simplex Noise', category: 'generator', icon: '◇', color: 'hsl(180 100% 50%)',
    inputs: [], outputs: ['out'],
    params: [
      { id: 'frequency', label: 'Freq', min: 0.5, max: 40, default: 4, step: 0.1 },
      { id: 'octaves', label: 'Oct', min: 1, max: 12, default: 4, step: 1 },
      { id: 'lacunarity', label: 'Lac', min: 1, max: 4, default: 2, step: 0.1 },
      { id: 'persistence', label: 'Pers', min: 0, max: 1, default: 0.5, step: 0.01 },
      { id: 'seed', label: 'Seed', min: 0, max: 9999, default: 17, step: 1 },
    ],
    compute: (w, h, p) => {
      const n = new NoiseGenerator(p.seed ?? 17);
      return gen(w, h, (nx, ny) => n.simplexFbm(nx * (p.frequency ?? 4), ny * (p.frequency ?? 4), Math.round(p.octaves ?? 4), p.lacunarity ?? 2, p.persistence ?? 0.5) * 0.5 + 0.5);
    },
  },

  ridged: {
    id: 'ridged', name: 'Ridged Noise', category: 'generator', icon: '⧫', color: 'hsl(180 100% 50%)',
    inputs: [], outputs: ['out'],
    params: [
      { id: 'frequency', label: 'Freq', min: 0.5, max: 40, default: 3, step: 0.1 },
      { id: 'octaves', label: 'Oct', min: 1, max: 12, default: 5, step: 1 },
      { id: 'lacunarity', label: 'Lac', min: 1, max: 4, default: 2.2, step: 0.1 },
      { id: 'persistence', label: 'Pers', min: 0, max: 1, default: 0.6, step: 0.01 },
      { id: 'seed', label: 'Seed', min: 0, max: 9999, default: 7, step: 1 },
    ],
    compute: (w, h, p) => {
      const n = new NoiseGenerator(p.seed ?? 7);
      return gen(w, h, (nx, ny) => n.ridged(nx * (p.frequency ?? 3), ny * (p.frequency ?? 3), Math.round(p.octaves ?? 5), p.lacunarity ?? 2.2, p.persistence ?? 0.6));
    },
  },

  valueNoise: {
    id: 'valueNoise', name: 'Value Noise', category: 'generator', icon: '▪', color: 'hsl(180 100% 50%)',
    inputs: [], outputs: ['out'],
    params: [
      { id: 'frequency', label: 'Freq', min: 1, max: 40, default: 8, step: 0.1 },
      { id: 'octaves', label: 'Oct', min: 1, max: 8, default: 3, step: 1 },
      { id: 'persistence', label: 'Pers', min: 0, max: 1, default: 0.5, step: 0.01 },
      { id: 'seed', label: 'Seed', min: 0, max: 9999, default: 55, step: 1 },
    ],
    compute: (w, h, p) => {
      const n = new NoiseGenerator(p.seed ?? 55);
      const freq = p.frequency ?? 8, oct = Math.round(p.octaves ?? 3), pers = p.persistence ?? 0.5;
      return gen(w, h, (nx, ny) => {
        let val = 0, amp = 1, f = freq, mx = 0;
        for (let i = 0; i < oct; i++) { val += amp * n.valueNoise2D(nx * f, ny * f); mx += amp; amp *= pers; f *= 2; }
        return val / mx;
      });
    },
  },

  turbulence: {
    id: 'turbulence', name: 'Turbulence', category: 'generator', icon: '≋', color: 'hsl(180 100% 50%)',
    inputs: [], outputs: ['out'],
    params: [
      { id: 'frequency', label: 'Freq', min: 0.5, max: 30, default: 4, step: 0.1 },
      { id: 'octaves', label: 'Oct', min: 1, max: 10, default: 6, step: 1 },
      { id: 'lacunarity', label: 'Lac', min: 1, max: 4, default: 2, step: 0.1 },
      { id: 'persistence', label: 'Pers', min: 0, max: 1, default: 0.5, step: 0.01 },
      { id: 'seed', label: 'Seed', min: 0, max: 9999, default: 33, step: 1 },
    ],
    compute: (w, h, p) => {
      const n = new NoiseGenerator(p.seed ?? 33);
      return gen(w, h, (nx, ny) => n.turbulence(nx * (p.frequency ?? 4), ny * (p.frequency ?? 4), Math.round(p.octaves ?? 6), p.lacunarity ?? 2, p.persistence ?? 0.5));
    },
  },

  perlin3D: {
    id: 'perlin3D', name: 'Perlin 3D Slice', category: 'generator', icon: '◆', color: 'hsl(180 100% 50%)',
    inputs: [], outputs: ['out'],
    params: [
      { id: 'frequency', label: 'Freq', min: 0.5, max: 20, default: 4, step: 0.1 },
      { id: 'zSlice', label: 'Z', min: -10, max: 10, default: 0, step: 0.01 },
      { id: 'octaves', label: 'Oct', min: 1, max: 8, default: 4, step: 1 },
      { id: 'lacunarity', label: 'Lac', min: 1, max: 4, default: 2, step: 0.1 },
      { id: 'persistence', label: 'Pers', min: 0, max: 1, default: 0.5, step: 0.01 },
      { id: 'seed', label: 'Seed', min: 0, max: 9999, default: 42, step: 1 },
    ],
    compute: (w, h, p) => {
      const n = new NoiseGenerator(p.seed ?? 42);
      const freq = p.frequency ?? 4, z = p.zSlice ?? 0;
      return gen(w, h, (nx, ny) => n.fbm3D(nx * freq, ny * freq, z, Math.round(p.octaves ?? 4), p.lacunarity ?? 2, p.persistence ?? 0.5) * 0.5 + 0.5);
    },
  },

  perlin4D: {
    id: 'perlin4D', name: 'Perlin 4D Slice', category: 'generator', icon: '◈', color: 'hsl(180 100% 50%)',
    inputs: [], outputs: ['out'],
    params: [
      { id: 'frequency', label: 'Freq', min: 0.5, max: 20, default: 3, step: 0.1 },
      { id: 'zSlice', label: 'Z', min: -5, max: 5, default: 0, step: 0.01 },
      { id: 'wSlice', label: 'W', min: -5, max: 5, default: 0, step: 0.01 },
      { id: 'octaves', label: 'Oct', min: 1, max: 6, default: 3, step: 1 },
      { id: 'persistence', label: 'Pers', min: 0, max: 1, default: 0.5, step: 0.01 },
      { id: 'seed', label: 'Seed', min: 0, max: 9999, default: 7, step: 1 },
    ],
    compute: (w, h, p) => {
      const n = new NoiseGenerator(p.seed ?? 7);
      const freq = p.frequency ?? 3;
      return gen(w, h, (nx, ny) => n.fbm4D(nx * freq, ny * freq, p.zSlice ?? 0, p.wSlice ?? 0, Math.round(p.octaves ?? 3), 2, p.persistence ?? 0.5) * 0.5 + 0.5);
    },
  },

  simplex3D: {
    id: 'simplex3D', name: 'Simplex 3D Slice', category: 'generator', icon: '◇', color: 'hsl(180 100% 50%)',
    inputs: [], outputs: ['out'],
    params: [
      { id: 'frequency', label: 'Freq', min: 0.5, max: 20, default: 4, step: 0.1 },
      { id: 'zSlice', label: 'Z', min: -10, max: 10, default: 0, step: 0.01 },
      { id: 'octaves', label: 'Oct', min: 1, max: 8, default: 4, step: 1 },
      { id: 'persistence', label: 'Pers', min: 0, max: 1, default: 0.5, step: 0.01 },
      { id: 'seed', label: 'Seed', min: 0, max: 9999, default: 99, step: 1 },
    ],
    compute: (w, h, p) => {
      const n = new NoiseGenerator(p.seed ?? 99);
      const freq = p.frequency ?? 4, z = p.zSlice ?? 0, oct = Math.round(p.octaves ?? 4), pers = p.persistence ?? 0.5;
      return gen(w, h, (nx, ny) => {
        let val = 0, amp = 1, f = 1, mx = 0;
        for (let i = 0; i < oct; i++) { val += amp * n.simplex3D(nx * freq * f, ny * freq * f, z * f); mx += amp; amp *= pers; f *= 2; }
        return val / mx * 0.5 + 0.5;
      });
    },
  },

  ridged3D: {
    id: 'ridged3D', name: 'Ridged 3D Slice', category: 'generator', icon: '⬥', color: 'hsl(180 100% 50%)',
    inputs: [], outputs: ['out'],
    params: [
      { id: 'frequency', label: 'Freq', min: 0.5, max: 20, default: 3, step: 0.1 },
      { id: 'zSlice', label: 'Z', min: -10, max: 10, default: 0, step: 0.01 },
      { id: 'octaves', label: 'Oct', min: 1, max: 8, default: 5, step: 1 },
      { id: 'seed', label: 'Seed', min: 0, max: 9999, default: 77, step: 1 },
    ],
    compute: (w, h, p) => {
      const n = new NoiseGenerator(p.seed ?? 77);
      const freq = p.frequency ?? 3, z = p.zSlice ?? 0;
      return gen(w, h, (nx, ny) => n.ridged3D(nx * freq, ny * freq, z, Math.round(p.octaves ?? 5), 2.2, 0.6));
    },
  },

  curlNoise: {
    id: 'curlNoise', name: 'Curl Noise', category: 'generator', icon: '∿', color: 'hsl(180 100% 50%)',
    inputs: [], outputs: ['out'],
    params: [
      { id: 'frequency', label: 'Freq', min: 0.5, max: 20, default: 3, step: 0.1 },
      { id: 'mode', label: 'Mode', min: 0, max: 2, default: 0, step: 1 },
      { id: 'seed', label: 'Seed', min: 0, max: 9999, default: 42, step: 1 },
    ],
    compute: (w, h, p) => {
      const n = new NoiseGenerator(p.seed ?? 42);
      const freq = p.frequency ?? 3, mode = Math.round(p.mode ?? 0);
      return gen(w, h, (nx, ny) => {
        const [cx, cy] = n.curl2D(nx * freq, ny * freq);
        if (mode === 0) return Math.sqrt(cx * cx + cy * cy) * 0.5;
        if (mode === 1) return (Math.atan2(cy, cx) / Math.PI + 1) * 0.5;
        return clamp01(cx * 0.5 + 0.5);
      });
    },
  },

  gaborNoise: {
    id: 'gaborNoise', name: 'Gabor Noise', category: 'generator', icon: '⌇', color: 'hsl(180 100% 50%)',
    inputs: [], outputs: ['out'],
    params: [
      { id: 'frequency', label: 'Freq', min: 1, max: 30, default: 8, step: 0.1 },
      { id: 'angle', label: 'Angle', min: 0, max: 6.28, default: 0.78, step: 0.01 },
      { id: 'kernels', label: 'Kernels', min: 10, max: 200, default: 60, step: 1 },
      { id: 'seed', label: 'Seed', min: 0, max: 9999, default: 42, step: 1 },
    ],
    compute: (w, h, p) => {
      const n = new NoiseGenerator(p.seed ?? 42);
      return gen(w, h, (nx, ny) => n.gaborNoise(nx * 10, ny * 10, p.frequency ?? 8, p.angle ?? 0.78, Math.round(p.kernels ?? 60)) * 0.5 + 0.5);
    },
  },

  voronoi: {
    id: 'voronoi', name: 'Voronoi', category: 'generator', icon: '⬡', color: 'hsl(180 100% 50%)',
    inputs: [], outputs: ['out'],
    params: [
      { id: 'scale', label: 'Scale', min: 1, max: 30, default: 6, step: 0.1 },
      { id: 'jitter', label: 'Jitter', min: 0, max: 1, default: 1, step: 0.01 },
      { id: 'mode', label: 'Mode', min: 0, max: 4, default: 0, step: 1 },
      { id: 'seed', label: 'Seed', min: 0, max: 9999, default: 7, step: 1 },
    ],
    compute: (w, h, p) => {
      const n = new NoiseGenerator(p.seed ?? 7);
      const mode = Math.round(p.mode ?? 0);
      return gen(w, h, (nx, ny) => {
        const v = n.voronoi(nx * (p.scale ?? 6), ny * (p.scale ?? 6), p.jitter ?? 1);
        if (mode === 0) return clamp01(v.f1);
        if (mode === 1) return clamp01(v.f2 - v.f1);
        if (mode === 2) return clamp01(v.f2);
        if (mode === 3) return clamp01(v.f1 * v.f2 * 4); // multiply
        return (v.id & 0xff) / 255; // cell ID coloring
      });
    },
  },

  voronoi3D: {
    id: 'voronoi3D', name: 'Voronoi 3D', category: 'generator', icon: '⬢', color: 'hsl(180 100% 50%)',
    inputs: [], outputs: ['out'],
    params: [
      { id: 'scale', label: 'Scale', min: 1, max: 20, default: 5, step: 0.1 },
      { id: 'jitter', label: 'Jitter', min: 0, max: 1, default: 1, step: 0.01 },
      { id: 'zSlice', label: 'Z', min: -5, max: 5, default: 0, step: 0.01 },
      { id: 'mode', label: 'Mode', min: 0, max: 2, default: 0, step: 1 },
      { id: 'seed', label: 'Seed', min: 0, max: 9999, default: 42, step: 1 },
    ],
    compute: (w, h, p) => {
      const n = new NoiseGenerator(p.seed ?? 42);
      const scale = p.scale ?? 5, z = p.zSlice ?? 0, mode = Math.round(p.mode ?? 0);
      return gen(w, h, (nx, ny) => {
        const v = n.voronoi3D(nx * scale, ny * scale, z, p.jitter ?? 1);
        if (mode === 0) return clamp01(v.f1);
        if (mode === 1) return clamp01(v.f2 - v.f1);
        return clamp01(v.f2);
      });
    },
  },

  gradient: {
    id: 'gradient', name: 'Gradient', category: 'generator', icon: '▰', color: 'hsl(180 100% 50%)',
    inputs: [], outputs: ['out'],
    params: [
      { id: 'angle', label: 'Angle', min: 0, max: 360, default: 0, step: 1 },
      { id: 'type', label: 'Type', min: 0, max: 4, default: 0, step: 1 },
      { id: 'repeat', label: 'Repeat', min: 1, max: 16, default: 1, step: 1 },
      { id: 'smoothing', label: 'Smooth', min: 0, max: 1, default: 0, step: 0.01 },
    ],
    compute: (w, h, p) => {
      const angle = (p.angle ?? 0) * Math.PI / 180;
      const type = Math.round(p.type ?? 0), repeat = Math.round(p.repeat ?? 1);
      const sm = p.smoothing ?? 0;
      return gen(w, h, (nx, ny) => {
        let t: number;
        if (type === 0) t = (nx * Math.cos(angle) + ny * Math.sin(angle)) * 0.5 + 0.5;
        else if (type === 1) { const dx = nx - 0.5, dy = ny - 0.5; t = 1 - Math.min(1, Math.sqrt(dx * dx + dy * dy) * 2); }
        else if (type === 2) t = (Math.atan2(ny - 0.5, nx - 0.5) / Math.PI + 1) * 0.5;
        else if (type === 3) t = 1 - Math.max(Math.abs(nx - 0.5), Math.abs(ny - 0.5)) * 2; // diamond
        else t = Math.abs(Math.sin(nx * Math.PI * repeat)); // reflected
        t = (t * repeat) % 1;
        return sm > 0 ? smoothstep(sm * 0.5, 1 - sm * 0.5, t) : t;
      });
    },
  },

  checker: {
    id: 'checker', name: 'Checker', category: 'generator', icon: '▦', color: 'hsl(180 100% 50%)',
    inputs: [], outputs: ['out'],
    params: [
      { id: 'scale', label: 'Scale', min: 1, max: 64, default: 8, step: 1 },
      { id: 'softness', label: 'Soft', min: 0, max: 0.5, default: 0, step: 0.01 },
      { id: 'rotation', label: 'Rotate', min: 0, max: 360, default: 0, step: 1 },
    ],
    compute: (w, h, p) => {
      const scale = Math.round(p.scale ?? 8), soft = p.softness ?? 0;
      const rot = (p.rotation ?? 0) * Math.PI / 180;
      const cr = Math.cos(rot), sr = Math.sin(rot);
      return gen(w, h, (nx, ny) => {
        const rx = (nx - 0.5) * cr - (ny - 0.5) * sr + 0.5;
        const ry = (nx - 0.5) * sr + (ny - 0.5) * cr + 0.5;
        if (soft > 0) {
          const sx = Math.sin(rx * scale * Math.PI) * 0.5 + 0.5;
          const sy = Math.sin(ry * scale * Math.PI) * 0.5 + 0.5;
          return smoothstep(0.5 - soft, 0.5 + soft, sx * sy + (1 - sx) * (1 - sy));
        }
        const cx = Math.floor(rx * scale), cy = Math.floor(ry * scale);
        return (cx + cy) % 2 === 0 ? 1 : 0;
      });
    },
  },

  whiteNoise: {
    id: 'whiteNoise', name: 'White Noise', category: 'generator', icon: '⚡', color: 'hsl(180 100% 50%)',
    inputs: [], outputs: ['out'],
    params: [
      { id: 'seed', label: 'Seed', min: 0, max: 9999, default: 0, step: 1 },
      { id: 'scale', label: 'Scale', min: 1, max: 256, default: 1, step: 1 },
    ],
    compute: (w, h, p) => {
      const seed = p.seed ?? 0, scale = Math.max(1, Math.round(p.scale ?? 1));
      return gen(w, h, (nx, ny) => {
        const sx = Math.floor(nx * w / scale), sy = Math.floor(ny * h / scale);
        const hash = Math.sin(sx * 12.9898 + sy * 78.233 + seed * 43.12) * 43758.5453;
        return hash - Math.floor(hash);
      });
    },
  },

  brick: {
    id: 'brick', name: 'Brick Pattern', category: 'generator', icon: '▤', color: 'hsl(180 100% 50%)',
    inputs: [], outputs: ['out'],
    params: [
      { id: 'rows', label: 'Rows', min: 2, max: 32, default: 8, step: 1 },
      { id: 'cols', label: 'Cols', min: 1, max: 16, default: 4, step: 1 },
      { id: 'gap', label: 'Gap', min: 0.005, max: 0.15, default: 0.02, step: 0.005 },
      { id: 'bevel', label: 'Bevel', min: 0, max: 0.15, default: 0, step: 0.005 },
      { id: 'stagger', label: 'Stagger', min: 0, max: 1, default: 0.5, step: 0.01 },
    ],
    compute: (w, h, p) => {
      const rows = Math.round(p.rows ?? 8), cols = Math.round(p.cols ?? 4);
      const gap = p.gap ?? 0.02, bevel = p.bevel ?? 0, stagger = p.stagger ?? 0.5;
      return gen(w, h, (nx, ny) => {
        const row = Math.floor(ny * rows);
        const offset = row % 2 === 1 ? stagger / cols : 0;
        const bx = ((nx + offset) * cols) % 1;
        const by = (ny * rows) % 1;
        if (bx < gap * cols || by < gap * rows) return 0.15;
        if (bevel > 0) {
          const edgeX = Math.min(bx, 1 - bx) / (gap * cols + bevel);
          const edgeY = Math.min(by, 1 - by) / (gap * rows + bevel);
          return clamp01(Math.min(edgeX, edgeY));
        }
        return 1;
      });
    },
  },

  sineWaves: {
    id: 'sineWaves', name: 'Sine Waves', category: 'generator', icon: '∿', color: 'hsl(180 100% 50%)',
    inputs: [], outputs: ['out'],
    params: [
      { id: 'freqX', label: 'FreqX', min: 0.5, max: 50, default: 5, step: 0.1 },
      { id: 'freqY', label: 'FreqY', min: 0.5, max: 50, default: 5, step: 0.1 },
      { id: 'phase', label: 'Phase', min: 0, max: 6.28, default: 0, step: 0.01 },
      { id: 'mode', label: 'Mode', min: 0, max: 3, default: 0, step: 1 },
    ],
    compute: (w, h, p) => {
      const fx = p.freqX ?? 5, fy = p.freqY ?? 5, ph = p.phase ?? 0;
      const mode = Math.round(p.mode ?? 0);
      return gen(w, h, (nx, ny) => {
        if (mode === 0) return (Math.sin(nx * fx * Math.PI * 2 + ph) * Math.sin(ny * fy * Math.PI * 2 + ph)) * 0.5 + 0.5;
        if (mode === 1) return (Math.sin(nx * fx * Math.PI * 2 + ph) + Math.sin(ny * fy * Math.PI * 2 + ph)) * 0.25 + 0.5;
        if (mode === 2) return (Math.sin((nx * fx + ny * fy) * Math.PI * 2 + ph)) * 0.5 + 0.5;
        return Math.abs(Math.sin(nx * fx * Math.PI * 2 + ph) * Math.cos(ny * fy * Math.PI * 2 + ph));
      });
    },
  },

  sdfShapes: {
    id: 'sdfShapes', name: 'SDF Shapes', category: 'generator', icon: '●', color: 'hsl(180 100% 50%)',
    inputs: [], outputs: ['out'],
    params: [
      { id: 'shape', label: 'Shape', min: 0, max: 7, default: 0, step: 1 },
      { id: 'size', label: 'Size', min: 0.02, max: 0.8, default: 0.3, step: 0.01 },
      { id: 'smooth', label: 'Smooth', min: 0.001, max: 0.3, default: 0.02, step: 0.001 },
      { id: 'repeat', label: 'Repeat', min: 1, max: 12, default: 1, step: 1 },
      { id: 'roundness', label: 'Round', min: 0, max: 0.2, default: 0, step: 0.005 },
    ],
    compute: (w, h, p) => {
      const shape = Math.round(p.shape ?? 0), size = p.size ?? 0.3, sm = p.smooth ?? 0.02;
      const rep = Math.round(p.repeat ?? 1), round = p.roundness ?? 0;
      return gen(w, h, (nx, ny) => {
        let px = (nx * rep) % 1 - 0.5, py = (ny * rep) % 1 - 0.5;
        let dist: number;
        if (shape === 0) dist = Math.sqrt(px * px + py * py) - size;
        else if (shape === 1) { const dx = Math.abs(px) - size, dy = Math.abs(py) - size; dist = Math.sqrt(Math.max(dx, 0) ** 2 + Math.max(dy, 0) ** 2) + Math.min(Math.max(dx, dy), 0) - round; }
        else if (shape === 2) dist = Math.abs(Math.sqrt(px * px + py * py) - size) - size * 0.15;
        else if (shape === 3) { dist = Math.min(Math.abs(px), Math.abs(py)) - size * 0.12; dist = Math.max(dist, Math.max(Math.abs(px), Math.abs(py)) - size); }
        else if (shape === 4) { const a = Math.atan2(py, px); const r = Math.sqrt(px * px + py * py); const star = size * (0.5 + 0.5 * Math.cos(a * 5)); dist = r - star; }
        else if (shape === 5) { // hexagon
          const ax = Math.abs(px), ay = Math.abs(py);
          dist = Math.max(ax * 0.866 + ay * 0.5, ay) - size;
        }
        else if (shape === 6) { // triangle
          const ax = Math.abs(px);
          dist = Math.max(ax * 1.732 + py, -py - size * 0.5) - size * 0.5;
        }
        else { // heart
          const ax = Math.abs(px);
          dist = Math.sqrt(ax * ax + (py - 0.3 * size) * (py - 0.3 * size)) - size * 0.6;
          dist = Math.min(dist, Math.sqrt(ax * ax + (py + 0.1 * size) * (py + 0.1 * size)) - size * 0.8);
        }
        return 1 - smoothstep(-sm, sm, dist);
      });
    },
  },

  fractal: {
    id: 'fractal', name: 'Mandelbrot', category: 'generator', icon: '❋', color: 'hsl(180 100% 50%)',
    inputs: [], outputs: ['out'],
    params: [
      { id: 'zoom', label: 'Zoom', min: 0.1, max: 200, default: 1, step: 0.1 },
      { id: 'centerX', label: 'Pan X', min: -3, max: 3, default: -0.5, step: 0.001 },
      { id: 'centerY', label: 'Pan Y', min: -3, max: 3, default: 0, step: 0.001 },
      { id: 'iterations', label: 'Iter', min: 10, max: 500, default: 80, step: 1 },
      { id: 'power', label: 'Power', min: 2, max: 8, default: 2, step: 0.1 },
      { id: 'smooth', label: 'Smooth', min: 0, max: 1, default: 1, step: 1 },
    ],
    compute: (w, h, p) => {
      const zoom = p.zoom ?? 1, cx = p.centerX ?? -0.5, cy = p.centerY ?? 0;
      const maxIter = Math.round(p.iterations ?? 80), power = p.power ?? 2;
      const doSmooth = (p.smooth ?? 1) > 0.5;
      return gen(w, h, (nx, ny) => {
        const cr = (nx - 0.5) / zoom + cx;
        const ci = (ny - 0.5) / zoom + cy;
        let x = 0, y = 0;
        for (let i = 0; i < maxIter; i++) {
          if (power === 2) {
            const xx = x * x - y * y + cr;
            const yy = 2 * x * y + ci;
            x = xx; y = yy;
          } else {
            const r = Math.sqrt(x * x + y * y);
            const theta = Math.atan2(y, x);
            const rn = Math.pow(r, power);
            x = rn * Math.cos(power * theta) + cr;
            y = rn * Math.sin(power * theta) + ci;
          }
          if (x * x + y * y > 4) {
            if (doSmooth) {
              const log2 = Math.log2(Math.log2(x * x + y * y));
              return (i + 1 - log2) / maxIter;
            }
            return i / maxIter;
          }
        }
        return 0;
      });
    },
  },

  julia: {
    id: 'julia', name: 'Julia Set', category: 'generator', icon: '❊', color: 'hsl(180 100% 50%)',
    inputs: [], outputs: ['out'],
    params: [
      { id: 'zoom', label: 'Zoom', min: 0.1, max: 100, default: 1, step: 0.1 },
      { id: 'cx', label: 'C Real', min: -2, max: 2, default: -0.7, step: 0.001 },
      { id: 'cy', label: 'C Imag', min: -2, max: 2, default: 0.27015, step: 0.001 },
      { id: 'iterations', label: 'Iter', min: 10, max: 500, default: 100, step: 1 },
      { id: 'power', label: 'Power', min: 2, max: 6, default: 2, step: 0.1 },
    ],
    compute: (w, h, p) => {
      const zoom = p.zoom ?? 1, cr = p.cx ?? -0.7, ci = p.cy ?? 0.27015;
      const maxIter = Math.round(p.iterations ?? 100), power = p.power ?? 2;
      return gen(w, h, (nx, ny) => {
        let x = (nx - 0.5) * 3 / zoom, y = (ny - 0.5) * 3 / zoom;
        for (let i = 0; i < maxIter; i++) {
          if (power === 2) {
            const xx = x * x - y * y + cr;
            const yy = 2 * x * y + ci;
            x = xx; y = yy;
          } else {
            const r = Math.pow(Math.sqrt(x * x + y * y), power);
            const t = Math.atan2(y, x) * power;
            x = r * Math.cos(t) + cr;
            y = r * Math.sin(t) + ci;
          }
          if (x * x + y * y > 4) {
            const log2 = Math.log2(Math.log2(x * x + y * y));
            return (i + 1 - log2) / maxIter;
          }
        }
        return 0;
      });
    },
  },

  burningShip: {
    id: 'burningShip', name: 'Burning Ship', category: 'generator', icon: '🔥', color: 'hsl(180 100% 50%)',
    inputs: [], outputs: ['out'],
    params: [
      { id: 'zoom', label: 'Zoom', min: 0.1, max: 100, default: 1, step: 0.1 },
      { id: 'centerX', label: 'Pan X', min: -3, max: 3, default: -0.4, step: 0.001 },
      { id: 'centerY', label: 'Pan Y', min: -3, max: 3, default: -0.6, step: 0.001 },
      { id: 'iterations', label: 'Iter', min: 10, max: 500, default: 80, step: 1 },
    ],
    compute: (w, h, p) => {
      const zoom = p.zoom ?? 1, cx = p.centerX ?? -0.4, cy = p.centerY ?? -0.6;
      const maxIter = Math.round(p.iterations ?? 80);
      return gen(w, h, (nx, ny) => {
        const cr = (nx - 0.5) / zoom + cx;
        const ci = (ny - 0.5) / zoom + cy;
        let x = 0, y = 0;
        for (let i = 0; i < maxIter; i++) {
          const xx = x * x - y * y + cr;
          const yy = 2 * Math.abs(x * y) + ci;
          x = Math.abs(xx); y = yy;
          if (x * x + y * y > 4) return i / maxIter;
        }
        return 0;
      });
    },
  },

  newton: {
    id: 'newton', name: 'Newton Fractal', category: 'generator', icon: '∞', color: 'hsl(180 100% 50%)',
    inputs: [], outputs: ['out'],
    params: [
      { id: 'zoom', label: 'Zoom', min: 0.1, max: 50, default: 1, step: 0.1 },
      { id: 'power', label: 'Power', min: 3, max: 8, default: 3, step: 1 },
      { id: 'iterations', label: 'Iter', min: 5, max: 100, default: 30, step: 1 },
      { id: 'centerX', label: 'Pan X', min: -2, max: 2, default: 0, step: 0.01 },
      { id: 'centerY', label: 'Pan Y', min: -2, max: 2, default: 0, step: 0.01 },
    ],
    compute: (w, h, p) => {
      const zoom = p.zoom ?? 1, n = Math.round(p.power ?? 3);
      const maxIter = Math.round(p.iterations ?? 30);
      return genRGB(w, h, (nx, ny) => {
        let x = (nx - 0.5) * 3 / zoom + (p.centerX ?? 0);
        let y = (ny - 0.5) * 3 / zoom + (p.centerY ?? 0);
        for (let i = 0; i < maxIter; i++) {
          const r2 = x * x + y * y;
          if (r2 < 0.0001) break;
          const rn = Math.pow(r2, n / 2);
          const theta = Math.atan2(y, x);
          const cn = Math.cos(n * theta), sn = Math.sin(n * theta);
          const rn1 = Math.pow(r2, (n - 1) / 2);
          const dn = n * rn1;
          const fx = rn * cn - 1, fy = rn * sn;
          const dfx = dn * Math.cos((n - 1) * theta);
          const dfy = dn * Math.sin((n - 1) * theta);
          const denom = dfx * dfx + dfy * dfy;
          if (denom < 1e-10) break;
          x -= (fx * dfx + fy * dfy) / denom;
          y -= (fy * dfx - fx * dfy) / denom;
          if (x * x + y * y < 0.001) {
            const a = Math.atan2(y, x) / (2 * Math.PI) + 0.5;
            const t = i / maxIter;
            const [cr, cg, cb] = hslToRgb(a, 0.8, 0.3 + t * 0.5);
            return [cr * 255, cg * 255, cb * 255];
          }
        }
        return [0, 0, 0];
      });
    },
  },

  sierpinski: {
    id: 'sierpinski', name: 'Sierpinski', category: 'generator', icon: '△', color: 'hsl(180 100% 50%)',
    inputs: [], outputs: ['out'],
    params: [
      { id: 'iterations', label: 'Iter', min: 1, max: 10, default: 6, step: 1 },
      { id: 'mode', label: 'Mode', min: 0, max: 2, default: 0, step: 1 },
    ],
    compute: (w, h, p) => {
      const iter = Math.round(p.iterations ?? 6), mode = Math.round(p.mode ?? 0);
      return gen(w, h, (nx, ny) => {
        if (mode === 0) { // Triangle
          let x = nx, y = ny;
          for (let i = 0; i < iter; i++) {
            x *= 2; y *= 2;
            if (Math.floor(x) % 2 === 1 && Math.floor(y) % 2 === 1) return 0;
            x %= 1; y %= 1;
          }
          return 1;
        }
        if (mode === 1) { // Carpet
          let x = nx, y = ny;
          for (let i = 0; i < iter; i++) {
            x *= 3; y *= 3;
            if (Math.floor(x) % 3 === 1 && Math.floor(y) % 3 === 1) return 0;
            x %= 1; y %= 1;
          }
          return 1;
        }
        // Koch-like
        let x = nx * 2 - 1, y = ny * 2 - 1;
        for (let i = 0; i < iter; i++) {
          x = Math.abs(x) * 2 - 1;
          y = Math.abs(y) * 2 - 1;
        }
        return clamp01(1 - Math.sqrt(x * x + y * y));
      });
    },
  },

  dots: {
    id: 'dots', name: 'Dots Grid', category: 'generator', icon: '⠿', color: 'hsl(180 100% 50%)',
    inputs: [], outputs: ['out'],
    params: [
      { id: 'count', label: 'Count', min: 2, max: 50, default: 10, step: 1 },
      { id: 'size', label: 'Size', min: 0.05, max: 0.9, default: 0.4, step: 0.01 },
      { id: 'softness', label: 'Soft', min: 0, max: 0.3, default: 0.05, step: 0.01 },
    ],
    compute: (w, h, p) => {
      const count = Math.round(p.count ?? 10), size = p.size ?? 0.4, soft = p.softness ?? 0.05;
      return gen(w, h, (nx, ny) => {
        const cx = (nx * count) % 1 - 0.5;
        const cy = (ny * count) % 1 - 0.5;
        const dist = Math.sqrt(cx * cx + cy * cy);
        return 1 - smoothstep(size * 0.5 - soft, size * 0.5 + soft, dist);
      });
    },
  },

  hexGrid: {
    id: 'hexGrid', name: 'Hex Grid', category: 'generator', icon: '⬡', color: 'hsl(180 100% 50%)',
    inputs: [], outputs: ['out'],
    params: [
      { id: 'scale', label: 'Scale', min: 2, max: 30, default: 8, step: 1 },
      { id: 'lineWidth', label: 'Line', min: 0.01, max: 0.2, default: 0.05, step: 0.005 },
    ],
    compute: (w, h, p) => {
      const scale = p.scale ?? 8, lw = p.lineWidth ?? 0.05;
      return gen(w, h, (nx, ny) => {
        const x = nx * scale, y = ny * scale;
        const row = Math.floor(y / 0.866);
        const offset = row % 2 === 1 ? 0.5 : 0;
        const cx = Math.round(x - offset) + offset;
        const cy = Math.round(y / 0.866) * 0.866;
        const dx = x - cx, dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return 1 - smoothstep(0.5 - lw, 0.5, dist);
      });
    },
  },

  truchet: {
    id: 'truchet', name: 'Truchet Tiles', category: 'generator', icon: '⟐', color: 'hsl(180 100% 50%)',
    inputs: [], outputs: ['out'],
    params: [
      { id: 'scale', label: 'Scale', min: 2, max: 30, default: 8, step: 1 },
      { id: 'lineWidth', label: 'Width', min: 0.02, max: 0.4, default: 0.1, step: 0.01 },
      { id: 'seed', label: 'Seed', min: 0, max: 9999, default: 42, step: 1 },
    ],
    compute: (w, h, p) => {
      const scale = Math.round(p.scale ?? 8), lw = p.lineWidth ?? 0.1, seed = p.seed ?? 42;
      return gen(w, h, (nx, ny) => {
        const cx = Math.floor(nx * scale), cy = Math.floor(ny * scale);
        const fx = (nx * scale) - cx, fy = (ny * scale) - cy;
        const hash = Math.sin(cx * 12.9898 + cy * 78.233 + seed) * 43758.5453;
        const flip = (hash - Math.floor(hash)) > 0.5;
        let tx = fx, ty = fy;
        if (flip) { tx = 1 - fx; }
        const d1 = Math.abs(Math.sqrt(tx * tx + ty * ty) - 0.5);
        const d2 = Math.abs(Math.sqrt((tx - 1) * (tx - 1) + (ty - 1) * (ty - 1)) - 0.5);
        const d = Math.min(d1, d2);
        return 1 - smoothstep(lw * 0.5 - 0.02, lw * 0.5 + 0.02, d);
      });
    },
  },

  spiral: {
    id: 'spiral', name: 'Spiral', category: 'generator', icon: '🌀', color: 'hsl(180 100% 50%)',
    inputs: [], outputs: ['out'],
    params: [
      { id: 'arms', label: 'Arms', min: 1, max: 12, default: 3, step: 1 },
      { id: 'tightness', label: 'Tight', min: 1, max: 20, default: 5, step: 0.1 },
      { id: 'thickness', label: 'Thick', min: 0.01, max: 0.5, default: 0.15, step: 0.01 },
    ],
    compute: (w, h, p) => {
      const arms = Math.round(p.arms ?? 3), tight = p.tightness ?? 5, thick = p.thickness ?? 0.15;
      return gen(w, h, (nx, ny) => {
        const dx = nx - 0.5, dy = ny - 0.5;
        const angle = Math.atan2(dy, dx);
        const dist = Math.sqrt(dx * dx + dy * dy);
        const spiral = (angle * arms / (Math.PI * 2) + dist * tight) % 1;
        return 1 - smoothstep(thick - 0.02, thick + 0.02, Math.abs(spiral - 0.5));
      });
    },
  },

  weave: {
    id: 'weave', name: 'Weave', category: 'generator', icon: '⧈', color: 'hsl(180 100% 50%)',
    inputs: [], outputs: ['out'],
    params: [
      { id: 'scale', label: 'Scale', min: 2, max: 30, default: 8, step: 1 },
      { id: 'width', label: 'Width', min: 0.1, max: 0.9, default: 0.5, step: 0.01 },
      { id: 'gap', label: 'Gap', min: 0, max: 0.2, default: 0.05, step: 0.01 },
    ],
    compute: (w, h, p) => {
      const scale = Math.round(p.scale ?? 8), width = p.width ?? 0.5, gap = p.gap ?? 0.05;
      return gen(w, h, (nx, ny) => {
        const x = (nx * scale) % 2, y = (ny * scale) % 2;
        const fx = x % 1, fy = y % 1;
        const hx = Math.abs(fx - 0.5) < width * 0.5;
        const hy = Math.abs(fy - 0.5) < width * 0.5;
        if (hx && hy) {
          const over = (Math.floor(x) + Math.floor(y)) % 2 === 0;
          return over ? 0.9 : 0.6;
        }
        if (hx || hy) {
          const edge = Math.min(Math.abs(Math.abs(fx - 0.5) - width * 0.5), Math.abs(Math.abs(fy - 0.5) - width * 0.5));
          return edge < gap ? 0.15 : (hx ? 0.8 : 0.7);
        }
        return 0.15;
      });
    },
  },

  crosshatch: {
    id: 'crosshatch', name: 'Crosshatch', category: 'generator', icon: '╳', color: 'hsl(180 100% 50%)',
    inputs: [], outputs: ['out'],
    params: [
      { id: 'scale', label: 'Scale', min: 2, max: 40, default: 12, step: 1 },
      { id: 'angle', label: 'Angle', min: 0, max: 90, default: 45, step: 1 },
      { id: 'thickness', label: 'Thick', min: 0.01, max: 0.3, default: 0.08, step: 0.01 },
    ],
    compute: (w, h, p) => {
      const scale = p.scale ?? 12, angle = (p.angle ?? 45) * Math.PI / 180;
      const thick = p.thickness ?? 0.08;
      const ca = Math.cos(angle), sa = Math.sin(angle);
      return gen(w, h, (nx, ny) => {
        const d1 = Math.abs(((nx * ca + ny * sa) * scale) % 1 - 0.5);
        const d2 = Math.abs(((nx * ca - ny * sa) * scale) % 1 - 0.5);
        return Math.min(d1, d2) < thick ? 1 : 0;
      });
    },
  },

  concentricRings: {
    id: 'concentricRings', name: 'Concentric Rings', category: 'generator', icon: '◎', color: 'hsl(180 100% 50%)',
    inputs: [], outputs: ['out'],
    params: [
      { id: 'count', label: 'Count', min: 2, max: 40, default: 10, step: 1 },
      { id: 'thickness', label: 'Thick', min: 0.01, max: 0.5, default: 0.15, step: 0.01 },
      { id: 'softness', label: 'Soft', min: 0, max: 0.2, default: 0.02, step: 0.01 },
    ],
    compute: (w, h, p) => {
      const count = p.count ?? 10, thick = p.thickness ?? 0.15, soft = p.softness ?? 0.02;
      return gen(w, h, (nx, ny) => {
        const dx = nx - 0.5, dy = ny - 0.5;
        const dist = Math.sqrt(dx * dx + dy * dy) * count * 2;
        const ring = Math.abs((dist % 1) - 0.5);
        return 1 - smoothstep(thick * 0.5 - soft, thick * 0.5 + soft, ring);
      });
    },
  },

  plasma: {
    id: 'plasma', name: 'Plasma', category: 'generator', icon: '◉', color: 'hsl(180 100% 50%)',
    inputs: [], outputs: ['out'],
    params: [
      { id: 'freq1', label: 'Freq1', min: 1, max: 20, default: 4, step: 0.1 },
      { id: 'freq2', label: 'Freq2', min: 1, max: 20, default: 6, step: 0.1 },
      { id: 'freq3', label: 'Freq3', min: 1, max: 20, default: 8, step: 0.1 },
      { id: 'phase', label: 'Phase', min: 0, max: 6.28, default: 0, step: 0.01 },
    ],
    compute: (w, h, p) => {
      const f1 = p.freq1 ?? 4, f2 = p.freq2 ?? 6, f3 = p.freq3 ?? 8, ph = p.phase ?? 0;
      return gen(w, h, (nx, ny) => {
        const v1 = Math.sin(nx * f1 * Math.PI * 2 + ph);
        const v2 = Math.sin(ny * f2 * Math.PI * 2 + ph * 1.3);
        const v3 = Math.sin((nx + ny) * f3 * Math.PI + ph * 0.7);
        const dx = nx - 0.5, dy = ny - 0.5;
        const v4 = Math.sin(Math.sqrt(dx * dx + dy * dy) * f1 * Math.PI * 4);
        return (v1 + v2 + v3 + v4) * 0.125 + 0.5;
      });
    },
  },

  wood: {
    id: 'wood', name: 'Wood Grain', category: 'generator', icon: '🪵', color: 'hsl(180 100% 50%)',
    inputs: [], outputs: ['out'],
    params: [
      { id: 'rings', label: 'Rings', min: 2, max: 30, default: 10, step: 1 },
      { id: 'distortion', label: 'Distort', min: 0, max: 1, default: 0.3, step: 0.01 },
      { id: 'grainFreq', label: 'Grain', min: 1, max: 40, default: 15, step: 0.5 },
      { id: 'seed', label: 'Seed', min: 0, max: 9999, default: 42, step: 1 },
    ],
    compute: (w, h, p) => {
      const n = new NoiseGenerator(p.seed ?? 42);
      const rings = p.rings ?? 10, dist = p.distortion ?? 0.3, grain = p.grainFreq ?? 15;
      return gen(w, h, (nx, ny) => {
        const dx = nx - 0.5, dy = ny - 0.5;
        const r = Math.sqrt(dx * dx + dy * dy) + n.perlin2D(nx * 4, ny * 4) * dist * 0.1;
        const ring = (r * rings * 10) % 1;
        const grainV = n.perlin2D(nx * grain, ny * 2) * 0.15;
        return clamp01(ring * 0.5 + 0.3 + grainV);
      });
    },
  },

  marble: {
    id: 'marble', name: 'Marble', category: 'generator', icon: '◯', color: 'hsl(180 100% 50%)',
    inputs: [], outputs: ['out'],
    params: [
      { id: 'frequency', label: 'Freq', min: 1, max: 20, default: 5, step: 0.1 },
      { id: 'turbulence', label: 'Turb', min: 0, max: 5, default: 2, step: 0.1 },
      { id: 'veinSharp', label: 'Sharp', min: 0.5, max: 5, default: 1, step: 0.1 },
      { id: 'seed', label: 'Seed', min: 0, max: 9999, default: 7, step: 1 },
    ],
    compute: (w, h, p) => {
      const n = new NoiseGenerator(p.seed ?? 7);
      const freq = p.frequency ?? 5, turb = p.turbulence ?? 2, sharp = p.veinSharp ?? 1;
      return gen(w, h, (nx, ny) => {
        const noiseVal = n.fbm(nx * 4, ny * 4, 5, 2, 0.5) * turb;
        const v = Math.sin((nx * freq + noiseVal) * Math.PI * 2);
        return Math.pow(Math.abs(v), sharp) * 0.5 + 0.5;
      });
    },
  },

  constantColor: {
    id: 'constantColor', name: 'Constant', category: 'generator', icon: '■', color: 'hsl(180 100% 50%)',
    inputs: [], outputs: ['out'],
    params: [
      { id: 'value', label: 'Value', min: 0, max: 1, default: 0.5, step: 0.01 },
    ],
    compute: (w, h, p) => gen(w, h, () => p.value ?? 0.5),
  },

  uvCoords: {
    id: 'uvCoords', name: 'UV Coords', category: 'generator', icon: '⊞', color: 'hsl(180 100% 50%)',
    inputs: [], outputs: ['out'],
    params: [
      { id: 'mode', label: 'Mode', min: 0, max: 2, default: 0, step: 1 },
    ],
    compute: (w, h, p) => {
      const mode = Math.round(p.mode ?? 0);
      return genRGB(w, h, (nx, ny) => {
        if (mode === 0) return [nx * 255, ny * 255, 0];
        if (mode === 1) return [nx * 255, ny * 255, 128];
        return [(Math.atan2(ny - 0.5, nx - 0.5) / Math.PI + 1) * 127, Math.sqrt((nx - 0.5) ** 2 + (ny - 0.5) ** 2) * 510, 128];
      });
    },
  },

  // ══════════════════════════════════════════════════
  //  MODIFIERS
  // ══════════════════════════════════════════════════

  colorMap: {
    id: 'colorMap', name: 'Color Map', category: 'modifier', icon: '🎨', color: 'hsl(300 100% 60%)',
    inputs: ['in'], outputs: ['out'],
    params: [
      { id: 'palette', label: 'Palette', min: 0, max: 19, default: 4, step: 1 },
      { id: 'contrast', label: 'Contrast', min: 0.1, max: 5, default: 1, step: 0.01 },
      { id: 'shift', label: 'Shift', min: 0, max: 1, default: 0, step: 0.01 },
      { id: 'reverse', label: 'Reverse', min: 0, max: 1, default: 0, step: 1 },
    ],
    compute: (w, h, p, inputs) => {
      const palette = PALETTES[Math.round(p.palette ?? 4) % PALETTES.length];
      const contrast = p.contrast ?? 1, shift = p.shift ?? 0, rev = (p.reverse ?? 0) > 0.5;
      return xform(inputs.in, w, h, (r) => {
        let val = Math.pow(r / 255, contrast);
        val = (val + shift) % 1;
        if (rev) val = 1 - val;
        const [cr, cg, cb] = samplePalette(palette, val);
        return [cr, cg, cb];
      });
    },
  },

  levels: {
    id: 'levels', name: 'Levels', category: 'modifier', icon: '◧', color: 'hsl(300 100% 60%)',
    inputs: ['in'], outputs: ['out'],
    params: [
      { id: 'brightness', label: 'Bright', min: -1, max: 1, default: 0, step: 0.01 },
      { id: 'contrast', label: 'Contrast', min: 0, max: 5, default: 1, step: 0.01 },
      { id: 'gamma', label: 'Gamma', min: 0.1, max: 5, default: 1, step: 0.01 },
      { id: 'blackPoint', label: 'Black', min: 0, max: 0.5, default: 0, step: 0.01 },
      { id: 'whitePoint', label: 'White', min: 0.5, max: 1, default: 1, step: 0.01 },
    ],
    compute: (w, h, p, inputs) => {
      const br = p.brightness ?? 0, co = p.contrast ?? 1, ga = p.gamma ?? 1;
      const bp = p.blackPoint ?? 0, wp = p.whitePoint ?? 1;
      return xform(inputs.in, w, h, (r, g, b) => {
        const adj = (v: number) => {
          let val = v / 255;
          val = (val - bp) / (wp - bp);
          val = clamp01((val - 0.5) * co + 0.5 + br);
          return Math.pow(val, 1 / ga) * 255;
        };
        return [adj(r), adj(g), adj(b)];
      });
    },
  },

  invert: {
    id: 'invert', name: 'Invert', category: 'modifier', icon: '◑', color: 'hsl(300 100% 60%)',
    inputs: ['in'], outputs: ['out'],
    params: [{ id: 'mix', label: 'Mix', min: 0, max: 1, default: 1, step: 0.01 }],
    compute: (w, h, p, inputs) => {
      const mix = p.mix ?? 1;
      return xform(inputs.in, w, h, (r, g, b) => [r * (1 - mix) + (255 - r) * mix, g * (1 - mix) + (255 - g) * mix, b * (1 - mix) + (255 - b) * mix]);
    },
  },

  blend: {
    id: 'blend', name: 'Blend', category: 'modifier', icon: '⊕', color: 'hsl(300 100% 60%)',
    inputs: ['a', 'b'], outputs: ['out'],
    params: [
      { id: 'mode', label: 'Mode', min: 0, max: 8, default: 0, step: 1 },
      { id: 'opacity', label: 'Mix', min: 0, max: 1, default: 0.5, step: 0.01 },
    ],
    compute: (w, h, p, inputs) => {
      const mode = Math.round(p.mode ?? 0), opacity = p.opacity ?? 0.5;
      const a = inputs.a, b = inputs.b;
      const img = new ImageData(w, h);
      const d = img.data;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          for (let c = 0; c < 3; c++) {
            const va = a ? a.data[idx + c] / 255 : 0;
            const vb = b ? b.data[idx + c] / 255 : 0;
            let result: number;
            if (mode === 0) result = va * (1 - opacity) + vb * opacity; // Mix
            else if (mode === 1) result = va * vb; // Multiply
            else if (mode === 2) result = Math.min(1, va + vb); // Add
            else if (mode === 3) result = 1 - (1 - va) * (1 - vb); // Screen
            else if (mode === 4) result = Math.abs(va - vb); // Difference
            else if (mode === 5) result = va < 0.5 ? 2 * va * vb : 1 - 2 * (1 - va) * (1 - vb); // Overlay
            else if (mode === 6) result = Math.max(va, vb); // Lighten
            else if (mode === 7) result = Math.min(va, vb); // Darken
            else result = vb === 0 ? 0 : Math.min(1, va / vb); // Divide
            d[idx + c] = clamp255(result * 255);
          }
          d[idx + 3] = 255;
        }
      }
      return img;
    },
  },

  displace: {
    id: 'displace', name: 'Displace', category: 'modifier', icon: '↗', color: 'hsl(300 100% 60%)',
    inputs: ['in', 'map'], outputs: ['out'],
    params: [
      { id: 'strength', label: 'Strength', min: 0, max: 0.5, default: 0.1, step: 0.005 },
      { id: 'mode', label: 'Mode', min: 0, max: 1, default: 0, step: 1 },
    ],
    compute: (w, h, p, inputs) => {
      const str = p.strength ?? 0.1, mode = Math.round(p.mode ?? 0);
      const map = inputs.map;
      return remap(inputs.in, w, h, (nx, ny) => {
        if (!map) return [nx, ny];
        const i = (Math.round(ny * (h - 1)) * w + Math.round(nx * (w - 1))) * 4;
        if (mode === 0) { // RG as XY
          return [clamp01(nx + (map.data[i] / 255 - 0.5) * str * 2), clamp01(ny + (map.data[i + 1] / 255 - 0.5) * str * 2)];
        }
        const lum = (map.data[i] * 0.299 + map.data[i + 1] * 0.587 + map.data[i + 2] * 0.114) / 255;
        return [clamp01(nx + (lum - 0.5) * str), clamp01(ny + (lum - 0.5) * str)];
      });
    },
  },

  twirl: {
    id: 'twirl', name: 'Twirl', category: 'modifier', icon: '↻', color: 'hsl(300 100% 60%)',
    inputs: ['in'], outputs: ['out'],
    params: [
      { id: 'strength', label: 'Strength', min: -20, max: 20, default: 3, step: 0.1 },
      { id: 'radius', label: 'Radius', min: 0.1, max: 1.5, default: 0.5, step: 0.01 },
      { id: 'centerX', label: 'CX', min: 0, max: 1, default: 0.5, step: 0.01 },
      { id: 'centerY', label: 'CY', min: 0, max: 1, default: 0.5, step: 0.01 },
    ],
    compute: (w, h, p, inputs) => remap(inputs.in, w, h, (nx, ny) => {
      const cx = p.centerX ?? 0.5, cy = p.centerY ?? 0.5;
      const dx = nx - cx, dy = ny - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = (p.strength ?? 3) * Math.max(0, 1 - dist / (p.radius ?? 0.5));
      const cos = Math.cos(angle), sin = Math.sin(angle);
      return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos];
    }),
  },

  spherize: {
    id: 'spherize', name: 'Spherize', category: 'modifier', icon: '⊛', color: 'hsl(300 100% 60%)',
    inputs: ['in'], outputs: ['out'],
    params: [
      { id: 'strength', label: 'Strength', min: -2, max: 2, default: 1, step: 0.01 },
      { id: 'radius', label: 'Radius', min: 0.1, max: 1, default: 0.5, step: 0.01 },
    ],
    compute: (w, h, p, inputs) => remap(inputs.in, w, h, (nx, ny) => {
      const dx = nx - 0.5, dy = ny - 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const rad = p.radius ?? 0.5;
      if (dist >= rad) return [nx, ny];
      const nd = dist / rad;
      const power = Math.pow(nd, p.strength ?? 1);
      const scale = power / (nd + 0.0001);
      return [0.5 + dx * scale, 0.5 + dy * scale];
    }),
  },

  ripple: {
    id: 'ripple', name: 'Ripple', category: 'modifier', icon: '≈', color: 'hsl(300 100% 60%)',
    inputs: ['in'], outputs: ['out'],
    params: [
      { id: 'frequency', label: 'Freq', min: 1, max: 30, default: 8, step: 0.1 },
      { id: 'amplitude', label: 'Amp', min: 0, max: 0.1, default: 0.02, step: 0.001 },
      { id: 'phase', label: 'Phase', min: 0, max: 6.28, default: 0, step: 0.01 },
      { id: 'decay', label: 'Decay', min: 0, max: 5, default: 1, step: 0.1 },
    ],
    compute: (w, h, p, inputs) => remap(inputs.in, w, h, (nx, ny) => {
      const dx = nx - 0.5, dy = ny - 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const amp = (p.amplitude ?? 0.02) * Math.exp(-dist * (p.decay ?? 1) * 5);
      const offset = Math.sin(dist * (p.frequency ?? 8) * Math.PI * 2 + (p.phase ?? 0)) * amp;
      const angle = Math.atan2(dy, dx);
      return [clamp01(nx + Math.cos(angle) * offset), clamp01(ny + Math.sin(angle) * offset)];
    }),
  },

  kaleidoscope: {
    id: 'kaleidoscope', name: 'Kaleidoscope', category: 'modifier', icon: '✱', color: 'hsl(300 100% 60%)',
    inputs: ['in'], outputs: ['out'],
    params: [
      { id: 'segments', label: 'Seg', min: 2, max: 24, default: 6, step: 1 },
      { id: 'rotation', label: 'Rotate', min: 0, max: 6.28, default: 0, step: 0.01 },
      { id: 'zoom', label: 'Zoom', min: 0.2, max: 4, default: 1, step: 0.01 },
    ],
    compute: (w, h, p, inputs) => remap(inputs.in, w, h, (nx, ny) => {
      const segments = Math.round(p.segments ?? 6), rot = p.rotation ?? 0, zoom = p.zoom ?? 1;
      const dx = (nx - 0.5) * zoom, dy = (ny - 0.5) * zoom;
      let angle = Math.atan2(dy, dx) + rot;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const segAngle = Math.PI * 2 / segments;
      angle = ((angle % segAngle) + segAngle) % segAngle;
      if (angle > segAngle / 2) angle = segAngle - angle;
      return [clamp01(0.5 + Math.cos(angle) * dist * 2), clamp01(0.5 + Math.sin(angle) * dist * 2)];
    }),
  },

  pixelate: {
    id: 'pixelate', name: 'Pixelate', category: 'modifier', icon: '▣', color: 'hsl(300 100% 60%)',
    inputs: ['in'], outputs: ['out'],
    params: [
      { id: 'size', label: 'Size', min: 2, max: 128, default: 8, step: 1 },
      { id: 'mode', label: 'Mode', min: 0, max: 1, default: 0, step: 1 },
    ],
    compute: (w, h, p, inputs) => {
      const size = Math.max(2, Math.round(p.size ?? 8));
      const mode = Math.round(p.mode ?? 0);
      if (mode === 0) return remap(inputs.in, w, h, (nx, ny) => [Math.floor(nx * size) / size + 0.5 / size, Math.floor(ny * size) / size + 0.5 / size]);
      // Hex pixelate
      return remap(inputs.in, w, h, (nx, ny) => {
        const x = nx * size, y = ny * size * 0.866;
        const row = Math.round(y);
        const off = row % 2 === 1 ? 0.5 : 0;
        const col = Math.round(x - off) + off;
        return [col / size, row / (size * 0.866)];
      });
    },
  },

  posterize: {
    id: 'posterize', name: 'Posterize', category: 'modifier', icon: '▧', color: 'hsl(300 100% 60%)',
    inputs: ['in'], outputs: ['out'],
    params: [{ id: 'levels', label: 'Levels', min: 2, max: 32, default: 4, step: 1 }],
    compute: (w, h, p, inputs) => {
      const levels = Math.max(2, Math.round(p.levels ?? 4));
      return xform(inputs.in, w, h, (r, g, b) => {
        const q = (v: number) => Math.round(v / 255 * (levels - 1)) / (levels - 1) * 255;
        return [q(r), q(g), q(b)];
      });
    },
  },

  threshold: {
    id: 'threshold', name: 'Threshold', category: 'modifier', icon: '◐', color: 'hsl(300 100% 60%)',
    inputs: ['in'], outputs: ['out'],
    params: [
      { id: 'threshold', label: 'Thresh', min: 0, max: 1, default: 0.5, step: 0.01 },
      { id: 'softness', label: 'Soft', min: 0, max: 0.3, default: 0, step: 0.01 },
    ],
    compute: (w, h, p, inputs) => {
      const thresh = (p.threshold ?? 0.5) * 255, soft = (p.softness ?? 0) * 255;
      return xform(inputs.in, w, h, (r, g, b) => {
        const lum = r * 0.299 + g * 0.587 + b * 0.114;
        const v = soft > 0 ? smoothstep(thresh - soft, thresh + soft, lum) * 255 : (lum > thresh ? 255 : 0);
        return [v, v, v];
      });
    },
  },

  domainWarp: {
    id: 'domainWarp', name: 'Domain Warp', category: 'modifier', icon: '≈', color: 'hsl(300 100% 60%)',
    inputs: ['in'], outputs: ['out'],
    params: [
      { id: 'strength', label: 'Strength', min: 0, max: 1, default: 0.1, step: 0.005 },
      { id: 'frequency', label: 'Freq', min: 1, max: 20, default: 3, step: 0.1 },
      { id: 'octaves', label: 'Oct', min: 1, max: 6, default: 2, step: 1 },
      { id: 'seed', label: 'Seed', min: 0, max: 9999, default: 0, step: 1 },
    ],
    compute: (w, h, p, inputs) => {
      const noise = new NoiseGenerator(p.seed ?? 0);
      const str = p.strength ?? 0.1, freq = p.frequency ?? 3, oct = Math.round(p.octaves ?? 2);
      return remap(inputs.in, w, h, (nx, ny) => {
        const dx = noise.fbm(nx * freq, ny * freq, oct, 2, 0.5) * str;
        const dy = noise.fbm(nx * freq + 100, ny * freq + 100, oct, 2, 0.5) * str;
        return [clamp01(nx + dx), clamp01(ny + dy)];
      });
    },
  },

  mirror: {
    id: 'mirror', name: 'Mirror / Tile', category: 'modifier', icon: '⧉', color: 'hsl(300 100% 60%)',
    inputs: ['in'], outputs: ['out'],
    params: [
      { id: 'tilesX', label: 'TilesX', min: 1, max: 12, default: 2, step: 1 },
      { id: 'tilesY', label: 'TilesY', min: 1, max: 12, default: 2, step: 1 },
      { id: 'mirror', label: 'Mirror', min: 0, max: 1, default: 1, step: 1 },
    ],
    compute: (w, h, p, inputs) => {
      const tx = Math.round(p.tilesX ?? 2), ty = Math.round(p.tilesY ?? 2);
      const doMirror = (p.mirror ?? 1) > 0.5;
      return remap(inputs.in, w, h, (nx, ny) => {
        let x = (nx * tx) % 1, y = (ny * ty) % 1;
        if (doMirror) {
          if (Math.floor(nx * tx) % 2 === 1) x = 1 - x;
          if (Math.floor(ny * ty) % 2 === 1) y = 1 - y;
        }
        return [x, y];
      });
    },
  },

  polarCoords: {
    id: 'polarCoords', name: 'Polar Coords', category: 'modifier', icon: '⊚', color: 'hsl(300 100% 60%)',
    inputs: ['in'], outputs: ['out'],
    params: [
      { id: 'mode', label: 'Mode', min: 0, max: 1, default: 0, step: 1 },
    ],
    compute: (w, h, p, inputs) => remap(inputs.in, w, h, (nx, ny) => {
      if (Math.round(p.mode ?? 0) === 0) {
        const dx = nx - 0.5, dy = ny - 0.5;
        return [clamp01((Math.atan2(dy, dx) / Math.PI + 1) * 0.5), clamp01(Math.sqrt(dx * dx + dy * dy) * 2)];
      }
      const angle = nx * Math.PI * 2;
      const r = ny * 0.5;
      return [0.5 + Math.cos(angle) * r, 0.5 + Math.sin(angle) * r];
    }),
  },

  channelMixer: {
    id: 'channelMixer', name: 'Channel Mixer', category: 'modifier', icon: '⊟', color: 'hsl(300 100% 60%)',
    inputs: ['in'], outputs: ['out'],
    params: [
      { id: 'rr', label: 'R→R', min: -2, max: 2, default: 1, step: 0.01 },
      { id: 'rg', label: 'R→G', min: -2, max: 2, default: 0, step: 0.01 },
      { id: 'rb', label: 'R→B', min: -2, max: 2, default: 0, step: 0.01 },
      { id: 'gr', label: 'G→R', min: -2, max: 2, default: 0, step: 0.01 },
      { id: 'gg', label: 'G→G', min: -2, max: 2, default: 1, step: 0.01 },
      { id: 'gb', label: 'G→B', min: -2, max: 2, default: 0, step: 0.01 },
    ],
    compute: (w, h, p, inputs) => xform(inputs.in, w, h, (r, g, b) => [
      r * (p.rr ?? 1) + g * (p.gr ?? 0) + b * 0,
      r * (p.rg ?? 0) + g * (p.gg ?? 1) + b * 0,
      r * (p.rb ?? 0) + g * (p.gb ?? 0) + b * 1,
    ]),
  },

  curvesS: {
    id: 'curvesS', name: 'S-Curve', category: 'modifier', icon: '∫', color: 'hsl(300 100% 60%)',
    inputs: ['in'], outputs: ['out'],
    params: [
      { id: 'strength', label: 'Strength', min: 0, max: 5, default: 1.5, step: 0.1 },
      { id: 'midpoint', label: 'Mid', min: 0.1, max: 0.9, default: 0.5, step: 0.01 },
    ],
    compute: (w, h, p, inputs) => {
      const str = p.strength ?? 1.5, mid = p.midpoint ?? 0.5;
      return xform(inputs.in, w, h, (r, g, b) => {
        const adj = (v: number) => {
          const x = v / 255;
          const s = 1 / (1 + Math.exp(-str * 6 * (x - mid)));
          return s * 255;
        };
        return [adj(r), adj(g), adj(b)];
      });
    },
  },

  mathOp: {
    id: 'mathOp', name: 'Math Op', category: 'modifier', icon: 'Σ', color: 'hsl(300 100% 60%)',
    inputs: ['in'], outputs: ['out'],
    params: [
      { id: 'op', label: 'Op', min: 0, max: 5, default: 0, step: 1 },
      { id: 'value', label: 'Value', min: 0, max: 5, default: 1, step: 0.01 },
    ],
    compute: (w, h, p, inputs) => {
      const op = Math.round(p.op ?? 0), val = p.value ?? 1;
      return xform(inputs.in, w, h, (r, g, b) => {
        const apply = (v: number) => {
          const x = v / 255;
          if (op === 0) return Math.pow(x, val) * 255; // Power
          if (op === 1) return Math.abs(x * 2 - 1) * 255; // Abs
          if (op === 2) return (1 - x) * 255; // Complement
          if (op === 3) return Math.sin(x * val * Math.PI) * 127 + 128; // Sin
          if (op === 4) return (x * val) % 1 * 255; // Modulo
          return Math.floor(x * val) / val * 255; // Quantize
        };
        return [apply(r), apply(g), apply(b)];
      });
    },
  },

  // ══════════════════════════════════════════════════
  //  EFFECTS (FX)
  // ══════════════════════════════════════════════════

  blur: {
    id: 'blur', name: 'Blur', category: 'fx', icon: '◌', color: 'hsl(45 100% 55%)',
    inputs: ['in'], outputs: ['out'],
    params: [
      { id: 'radius', label: 'Radius', min: 0, max: 15, default: 3, step: 1 },
      { id: 'passes', label: 'Passes', min: 1, max: 5, default: 1, step: 1 },
    ],
    compute: (w, h, p, inputs) => {
      let result = inputs.in || new ImageData(w, h);
      const passes = Math.round(p.passes ?? 1);
      for (let i = 0; i < passes; i++) result = boxBlur(result, w, h, p.radius ?? 3);
      return result;
    },
  },

  sharpen: {
    id: 'sharpen', name: 'Sharpen', category: 'fx', icon: '◆', color: 'hsl(45 100% 55%)',
    inputs: ['in'], outputs: ['out'],
    params: [{ id: 'strength', label: 'Strength', min: 0, max: 5, default: 1, step: 0.1 }],
    compute: (w, h, p, inputs) => {
      const s = p.strength ?? 1;
      return convolve3x3(inputs.in, w, h, [[0, -s, 0], [-s, 1 + 4 * s, -s], [0, -s, 0]]);
    },
  },

  edgeDetect: {
    id: 'edgeDetect', name: 'Edge Detect', category: 'fx', icon: '▱', color: 'hsl(45 100% 55%)',
    inputs: ['in'], outputs: ['out'],
    params: [
      { id: 'strength', label: 'Strength', min: 0.1, max: 5, default: 1, step: 0.1 },
      { id: 'mode', label: 'Mode', min: 0, max: 2, default: 0, step: 1 },
    ],
    compute: (w, h, p, inputs) => {
      const input = inputs.in;
      if (!input) return new ImageData(w, h);
      const str = p.strength ?? 1, mode = Math.round(p.mode ?? 0);
      const img = new ImageData(w, h);
      const d = img.data, s = input.data;
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const getL = (px: number, py: number) => { const i = (py * w + px) * 4; return (s[i] * 0.299 + s[i + 1] * 0.587 + s[i + 2] * 0.114) / 255; };
          const gx = -getL(x-1,y-1)+getL(x+1,y-1)-2*getL(x-1,y)+2*getL(x+1,y)-getL(x-1,y+1)+getL(x+1,y+1);
          const gy = -getL(x-1,y-1)-2*getL(x,y-1)-getL(x+1,y-1)+getL(x-1,y+1)+2*getL(x,y+1)+getL(x+1,y+1);
          let v: number;
          if (mode === 0) v = Math.sqrt(gx * gx + gy * gy) * str;
          else if (mode === 1) v = Math.abs(gx) * str; // Horizontal only
          else v = Math.abs(gy) * str; // Vertical only
          const val = clamp255(v * 255);
          const i = (y * w + x) * 4;
          d[i] = d[i + 1] = d[i + 2] = val; d[i + 3] = 255;
        }
      }
      return img;
    },
  },

  emboss: {
    id: 'emboss', name: 'Emboss', category: 'fx', icon: '◈', color: 'hsl(45 100% 55%)',
    inputs: ['in'], outputs: ['out'],
    params: [
      { id: 'strength', label: 'Strength', min: 0.1, max: 5, default: 1, step: 0.1 },
      { id: 'angle', label: 'Angle', min: 0, max: 360, default: 135, step: 1 },
    ],
    compute: (w, h, p, inputs) => {
      const s = p.strength ?? 1;
      const a = (p.angle ?? 135) * Math.PI / 180;
      const kx = Math.cos(a) * s, ky = Math.sin(a) * s;
      return convolve3x3(inputs.in, w, h, [[-kx - ky, -ky, kx - ky], [-kx, 1, kx], [-kx + ky, ky, kx + ky]], 128);
    },
  },

  filmGrain: {
    id: 'filmGrain', name: 'Film Grain', category: 'fx', icon: '▓', color: 'hsl(45 100% 55%)',
    inputs: ['in'], outputs: ['out'],
    params: [
      { id: 'intensity', label: 'Intensity', min: 0, max: 1, default: 0.2, step: 0.01 },
      { id: 'size', label: 'Size', min: 1, max: 8, default: 1, step: 1 },
      { id: 'seed', label: 'Seed', min: 0, max: 9999, default: 0, step: 1 },
    ],
    compute: (w, h, p, inputs) => {
      const intensity = p.intensity ?? 0.2, seed = p.seed ?? 0, sz = Math.max(1, Math.round(p.size ?? 1));
      return xform(inputs.in, w, h, (r, g, b, nx, ny) => {
        const sx = Math.floor(nx * w / sz), sy = Math.floor(ny * h / sz);
        const hash = Math.sin(sx * 12.9898 + sy * 78.233 + seed) * 43758.5453;
        const grain = (hash - Math.floor(hash) - 0.5) * intensity * 255;
        return [r + grain, g + grain, b + grain];
      });
    },
  },

  vignette: {
    id: 'vignette', name: 'Vignette', category: 'fx', icon: '◍', color: 'hsl(45 100% 55%)',
    inputs: ['in'], outputs: ['out'],
    params: [
      { id: 'strength', label: 'Strength', min: 0, max: 3, default: 0.5, step: 0.01 },
      { id: 'radius', label: 'Radius', min: 0.1, max: 1.5, default: 0.8, step: 0.01 },
      { id: 'softness', label: 'Soft', min: 0.1, max: 2, default: 0.5, step: 0.01 },
    ],
    compute: (w, h, p, inputs) => {
      const str = p.strength ?? 0.5, rad = p.radius ?? 0.8, soft = p.softness ?? 0.5;
      return xform(inputs.in, w, h, (r, g, b, nx, ny) => {
        const dx = nx - 0.5, dy = ny - 0.5;
        const dist = Math.sqrt(dx * dx + dy * dy) * 2;
        const vig = clamp01(1 - smoothstep(rad - soft * 0.5, rad + soft * 0.5, dist) * str);
        return [r * vig, g * vig, b * vig];
      });
    },
  },

  scanlines: {
    id: 'scanlines', name: 'Scanlines', category: 'fx', icon: '▤', color: 'hsl(45 100% 55%)',
    inputs: ['in'], outputs: ['out'],
    params: [
      { id: 'spacing', label: 'Spacing', min: 2, max: 24, default: 4, step: 1 },
      { id: 'intensity', label: 'Intensity', min: 0, max: 1, default: 0.3, step: 0.01 },
      { id: 'angle', label: 'Angle', min: 0, max: 180, default: 0, step: 1 },
    ],
    compute: (w, h, p, inputs) => {
      const spacing = Math.max(2, Math.round(p.spacing ?? 4)), intensity = p.intensity ?? 0.3;
      const angle = (p.angle ?? 0) * Math.PI / 180;
      const ca = Math.cos(angle), sa = Math.sin(angle);
      return xform(inputs.in, w, h, (r, g, b, nx, ny) => {
        const coord = nx * w * sa + ny * h * ca;
        const line = Math.floor(coord) % spacing < spacing / 2;
        const f = line ? 1 : 1 - intensity;
        return [r * f, g * f, b * f];
      });
    },
  },

  chromaticSplit: {
    id: 'chromaticSplit', name: 'Chromatic Split', category: 'fx', icon: '◐', color: 'hsl(45 100% 55%)',
    inputs: ['in'], outputs: ['out'],
    params: [
      { id: 'offset', label: 'Offset', min: 0, max: 30, default: 3, step: 0.5 },
      { id: 'angle', label: 'Angle', min: 0, max: 360, default: 0, step: 1 },
    ],
    compute: (w, h, p, inputs) => {
      const input = inputs.in;
      if (!input) return new ImageData(w, h);
      const offset = p.offset ?? 3;
      const angle = (p.angle ?? 0) * Math.PI / 180;
      const ox = Math.round(Math.cos(angle) * offset * w / 256);
      const oy = Math.round(Math.sin(angle) * offset * h / 256);
      const img = new ImageData(w, h);
      const d = img.data, s = input.data;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const di = (y * w + x) * 4;
          const ri = (Math.min(h - 1, Math.max(0, y + oy)) * w + Math.min(w - 1, Math.max(0, x + ox))) * 4;
          const bi = (Math.min(h - 1, Math.max(0, y - oy)) * w + Math.min(w - 1, Math.max(0, x - ox))) * 4;
          d[di] = s[ri]; d[di + 1] = s[di + 1]; d[di + 2] = s[bi + 2]; d[di + 3] = 255;
        }
      }
      return img;
    },
  },

  bloom: {
    id: 'bloom', name: 'Bloom / Glow', category: 'fx', icon: '✦', color: 'hsl(45 100% 55%)',
    inputs: ['in'], outputs: ['out'],
    params: [
      { id: 'threshold', label: 'Thresh', min: 0, max: 1, default: 0.6, step: 0.01 },
      { id: 'intensity', label: 'Intensity', min: 0, max: 2, default: 0.5, step: 0.01 },
      { id: 'radius', label: 'Radius', min: 1, max: 15, default: 5, step: 1 },
    ],
    compute: (w, h, p, inputs) => {
      const input = inputs.in;
      if (!input) return new ImageData(w, h);
      const thresh = (p.threshold ?? 0.6) * 255, intensity = p.intensity ?? 0.5;
      // Extract bright areas
      const bright = new ImageData(w, h);
      for (let i = 0; i < input.data.length; i += 4) {
        const lum = input.data[i] * 0.299 + input.data[i + 1] * 0.587 + input.data[i + 2] * 0.114;
        const f = lum > thresh ? (lum - thresh) / (255 - thresh) : 0;
        bright.data[i] = input.data[i] * f;
        bright.data[i + 1] = input.data[i + 1] * f;
        bright.data[i + 2] = input.data[i + 2] * f;
        bright.data[i + 3] = 255;
      }
      // Blur bright areas
      let blurred = bright;
      for (let i = 0; i < 2; i++) blurred = boxBlur(blurred, w, h, p.radius ?? 5);
      // Composite
      const img = new ImageData(w, h);
      for (let i = 0; i < img.data.length; i += 4) {
        img.data[i] = clamp255(input.data[i] + blurred.data[i] * intensity);
        img.data[i + 1] = clamp255(input.data[i + 1] + blurred.data[i + 1] * intensity);
        img.data[i + 2] = clamp255(input.data[i + 2] + blurred.data[i + 2] * intensity);
        img.data[i + 3] = 255;
      }
      return img;
    },
  },

  dither: {
    id: 'dither', name: 'Dither', category: 'fx', icon: '⣿', color: 'hsl(45 100% 55%)',
    inputs: ['in'], outputs: ['out'],
    params: [
      { id: 'mode', label: 'Mode', min: 0, max: 2, default: 0, step: 1 },
      { id: 'scale', label: 'Scale', min: 1, max: 8, default: 1, step: 1 },
    ],
    compute: (w, h, p, inputs) => {
      const input = inputs.in;
      if (!input) return new ImageData(w, h);
      const mode = Math.round(p.mode ?? 0), scale = Math.max(1, Math.round(p.scale ?? 1));
      const bayer4 = [[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
      const img = new ImageData(w, h);
      const d = img.data, s = input.data;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const lum = (s[i] * 0.299 + s[i + 1] * 0.587 + s[i + 2] * 0.114) / 255;
          let v: number;
          if (mode === 0) { // Bayer ordered
            const bx = Math.floor(x / scale) % 4, by = Math.floor(y / scale) % 4;
            v = lum > (bayer4[by][bx] + 0.5) / 16 ? 255 : 0;
          } else if (mode === 1) { // Blue noise approx
            const hash = Math.sin((x / scale) * 12.9898 + (y / scale) * 78.233) * 43758.5453;
            v = lum > (hash - Math.floor(hash)) ? 255 : 0;
          } else { // Halftone
            const cx = (Math.floor(x / scale / 4) * 4 + 2) * scale;
            const cy = (Math.floor(y / scale / 4) * 4 + 2) * scale;
            const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / (scale * 3);
            v = lum > dist ? 255 : 0;
          }
          d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
        }
      }
      return img;
    },
  },

  motionBlur: {
    id: 'motionBlur', name: 'Motion Blur', category: 'fx', icon: '⟹', color: 'hsl(45 100% 55%)',
    inputs: ['in'], outputs: ['out'],
    params: [
      { id: 'distance', label: 'Distance', min: 1, max: 30, default: 8, step: 1 },
      { id: 'angle', label: 'Angle', min: 0, max: 360, default: 0, step: 1 },
    ],
    compute: (w, h, p, inputs) => {
      const input = inputs.in;
      if (!input) return new ImageData(w, h);
      const dist = Math.round(p.distance ?? 8);
      const angle = (p.angle ?? 0) * Math.PI / 180;
      const dx = Math.cos(angle), dy = Math.sin(angle);
      const img = new ImageData(w, h);
      const d = img.data, s = input.data;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let r = 0, g = 0, b = 0;
          for (let k = 0; k < dist; k++) {
            const sx = Math.min(w - 1, Math.max(0, Math.round(x + dx * k)));
            const sy = Math.min(h - 1, Math.max(0, Math.round(y + dy * k)));
            const si = (sy * w + sx) * 4;
            r += s[si]; g += s[si + 1]; b += s[si + 2];
          }
          const i = (y * w + x) * 4;
          d[i] = r / dist; d[i + 1] = g / dist; d[i + 2] = b / dist; d[i + 3] = 255;
        }
      }
      return img;
    },
  },

  unsharpMask: {
    id: 'unsharpMask', name: 'Unsharp Mask', category: 'fx', icon: '⬥', color: 'hsl(45 100% 55%)',
    inputs: ['in'], outputs: ['out'],
    params: [
      { id: 'radius', label: 'Radius', min: 1, max: 10, default: 3, step: 1 },
      { id: 'amount', label: 'Amount', min: 0, max: 3, default: 1, step: 0.1 },
    ],
    compute: (w, h, p, inputs) => {
      const input = inputs.in;
      if (!input) return new ImageData(w, h);
      const blurred = boxBlur(input, w, h, p.radius ?? 3);
      const amount = p.amount ?? 1;
      const img = new ImageData(w, h);
      for (let i = 0; i < img.data.length; i += 4) {
        for (let c = 0; c < 3; c++) {
          img.data[i + c] = clamp255(input.data[i + c] + (input.data[i + c] - blurred.data[i + c]) * amount);
        }
        img.data[i + 3] = 255;
      }
      return img;
    },
  },

  duotone: {
    id: 'duotone', name: 'Duotone', category: 'fx', icon: '◧', color: 'hsl(45 100% 55%)',
    inputs: ['in'], outputs: ['out'],
    params: [
      { id: 'hue1', label: 'Hue1', min: 0, max: 360, default: 200, step: 1 },
      { id: 'hue2', label: 'Hue2', min: 0, max: 360, default: 30, step: 1 },
      { id: 'saturation', label: 'Sat', min: 0, max: 1, default: 0.8, step: 0.01 },
    ],
    compute: (w, h, p, inputs) => {
      const h1 = (p.hue1 ?? 200) / 360, h2 = (p.hue2 ?? 30) / 360, sat = p.saturation ?? 0.8;
      return xform(inputs.in, w, h, (r, g, b) => {
        const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
        const hue = h1 + (h2 - h1) * lum;
        const [rr, gg, bb] = hslToRgb(hue, sat, lum);
        return [rr * 255, gg * 255, bb * 255];
      });
    },
  },

  // ══════════════════════════════════════════════════
  //  PHYSICS / SIMULATION
  // ══════════════════════════════════════════════════

  reactionDiffusion: {
    id: 'reactionDiffusion', name: 'Reaction Diffusion', category: 'physics', icon: '🧬', color: 'hsl(160 100% 45%)',
    inputs: [], outputs: ['out'],
    params: [
      { id: 'feed', label: 'Feed', min: 0.01, max: 0.1, default: 0.055, step: 0.001 },
      { id: 'kill', label: 'Kill', min: 0.04, max: 0.08, default: 0.062, step: 0.001 },
      { id: 'diffA', label: 'DiffA', min: 0.5, max: 1.5, default: 1, step: 0.01 },
      { id: 'diffB', label: 'DiffB', min: 0.1, max: 1, default: 0.5, step: 0.01 },
      { id: 'iterations', label: 'Iter', min: 100, max: 5000, default: 1000, step: 100 },
    ],
    compute: (w, h, p) => {
      const result = grayScott(w, h, p.feed ?? 0.055, p.kill ?? 0.062, p.diffA ?? 1, p.diffB ?? 0.5, Math.round(p.iterations ?? 1000));
      const img = new ImageData(w, h);
      const d = img.data;
      for (let i = 0; i < w * h; i++) {
        const v = clamp255(result[i] * 255);
        d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v;
        d[i * 4 + 3] = 255;
      }
      return img;
    },
  },

  erosion: {
    id: 'erosion', name: 'Erosion Sim', category: 'physics', icon: '⛰️', color: 'hsl(160 100% 45%)',
    inputs: ['in'], outputs: ['out'],
    params: [
      { id: 'drops', label: 'Drops', min: 100, max: 10000, default: 2000, step: 100 },
      { id: 'erosionRate', label: 'Erode', min: 0, max: 0.5, default: 0.1, step: 0.01 },
      { id: 'deposition', label: 'Deposit', min: 0, max: 0.5, default: 0.05, step: 0.01 },
      { id: 'seed', label: 'Seed', min: 0, max: 9999, default: 42, step: 1 },
    ],
    compute: (w, h, p, inputs) => {
      const input = inputs.in;
      if (!input) return new ImageData(w, h);
      // Extract heightmap
      const hmap = new Float32Array(w * h);
      for (let i = 0; i < w * h; i++) hmap[i] = input.data[i * 4] / 255;
      // Simulate droplets
      const drops = Math.round(p.drops ?? 2000);
      const erodeRate = p.erosionRate ?? 0.1, depositRate = p.deposition ?? 0.05;
      let s = p.seed ?? 42;
      const rng = () => { s = (Math.imul(s, 48271) + 1) & 0x7fffffff; return s / 0x7fffffff; };
      for (let d = 0; d < drops; d++) {
        let x = rng() * (w - 2) + 1, y = rng() * (h - 2) + 1;
        let sediment = 0, speed = 1;
        for (let step = 0; step < 30; step++) {
          const ix = Math.floor(x), iy = Math.floor(y);
          if (ix < 1 || ix >= w - 1 || iy < 1 || iy >= h - 1) break;
          const idx = iy * w + ix;
          const gx = (hmap[idx + 1] - hmap[idx - 1]) * 0.5;
          const gy = (hmap[idx + w] - hmap[idx - w]) * 0.5;
          const len = Math.sqrt(gx * gx + gy * gy) + 0.001;
          x -= gx / len; y -= gy / len;
          const diff = hmap[idx] - (hmap[Math.floor(y) * w + Math.floor(x)] || 0);
          if (diff > 0) {
            const eroded = Math.min(diff, erodeRate * speed);
            hmap[idx] -= eroded; sediment += eroded;
          } else {
            const deposited = Math.min(sediment, depositRate);
            hmap[idx] += deposited; sediment -= deposited;
          }
          speed *= 0.95;
        }
      }
      // Output
      const img = new ImageData(w, h);
      const d = img.data;
      for (let i = 0; i < w * h; i++) {
        const v = clamp255(clamp01(hmap[i]) * 255);
        d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255;
      }
      return img;
    },
  },

  caustics: {
    id: 'caustics', name: 'Caustics', category: 'physics', icon: '💧', color: 'hsl(160 100% 45%)',
    inputs: [], outputs: ['out'],
    params: [
      { id: 'scale', label: 'Scale', min: 1, max: 20, default: 5, step: 0.1 },
      { id: 'speed', label: 'Phase', min: 0, max: 6.28, default: 0, step: 0.01 },
      { id: 'intensity', label: 'Bright', min: 0.5, max: 5, default: 2, step: 0.1 },
      { id: 'seed', label: 'Seed', min: 0, max: 9999, default: 42, step: 1 },
    ],
    compute: (w, h, p) => {
      const n = new NoiseGenerator(p.seed ?? 42);
      const scale = p.scale ?? 5, phase = p.speed ?? 0, bright = p.intensity ?? 2;
      return gen(w, h, (nx, ny) => {
        const x1 = nx * scale, y1 = ny * scale;
        const warp1x = n.perlin2D(x1 + phase, y1) * 0.5;
        const warp1y = n.perlin2D(x1, y1 + phase) * 0.5;
        const warp2x = n.perlin2D(x1 + warp1x * 2, y1 + warp1y * 2) * 0.3;
        const warp2y = n.perlin2D(x1 + warp1x * 2 + 50, y1 + warp1y * 2 + 50) * 0.3;
        const v = n.voronoi(x1 + warp2x, y1 + warp2y, 0.8);
        return clamp01(Math.pow(v.f2 - v.f1, 0.5) * bright);
      });
    },
  },

  flowField: {
    id: 'flowField', name: 'Flow Field', category: 'physics', icon: '🌊', color: 'hsl(160 100% 45%)',
    inputs: [], outputs: ['out'],
    params: [
      { id: 'particles', label: 'Particles', min: 100, max: 5000, default: 1000, step: 100 },
      { id: 'steps', label: 'Steps', min: 10, max: 200, default: 50, step: 1 },
      { id: 'noiseFreq', label: 'Freq', min: 1, max: 10, default: 3, step: 0.1 },
      { id: 'seed', label: 'Seed', min: 0, max: 9999, default: 42, step: 1 },
    ],
    compute: (w, h, p) => {
      const img = new ImageData(w, h);
      const d = img.data;
      for (let i = 3; i < d.length; i += 4) d[i] = 255;
      const n = new NoiseGenerator(p.seed ?? 42);
      const particles = Math.round(p.particles ?? 1000);
      const steps = Math.round(p.steps ?? 50);
      const freq = p.noiseFreq ?? 3;
      let s = p.seed ?? 42;
      const rng = () => { s = (Math.imul(s, 48271) + 1) & 0x7fffffff; return s / 0x7fffffff; };
      for (let i = 0; i < particles; i++) {
        let x = rng(), y = rng();
        for (let step = 0; step < steps; step++) {
          const angle = n.perlin2D(x * freq, y * freq) * Math.PI * 4;
          x += Math.cos(angle) * 0.003;
          y += Math.sin(angle) * 0.003;
          if (x < 0 || x >= 1 || y < 0 || y >= 1) break;
          const px = Math.floor(x * w), py = Math.floor(y * h);
          const idx = (py * w + px) * 4;
          const brightness = 1 - step / steps;
          d[idx] = Math.min(255, d[idx] + brightness * 20);
          d[idx + 1] = Math.min(255, d[idx + 1] + brightness * 20);
          d[idx + 2] = Math.min(255, d[idx + 2] + brightness * 20);
        }
      }
      return img;
    },
  },

  // ══════════════════════════════════════════════════
  //  UTILITIES
  // ══════════════════════════════════════════════════

  hslAdjust: {
    id: 'hslAdjust', name: 'HSL Adjust', category: 'utility', icon: '◎', color: 'hsl(120 100% 45%)',
    inputs: ['in'], outputs: ['out'],
    params: [
      { id: 'hue', label: 'Hue', min: -180, max: 180, default: 0, step: 1 },
      { id: 'saturation', label: 'Sat', min: 0, max: 3, default: 1, step: 0.01 },
      { id: 'lightness', label: 'Light', min: -0.5, max: 0.5, default: 0, step: 0.01 },
    ],
    compute: (w, h, p, inputs) => xform(inputs.in, w, h, (r, g, b) => {
      const [hh, ss, ll] = rgbToHsl(r / 255, g / 255, b / 255);
      const nh = ((hh + (p.hue ?? 0) / 360) % 1 + 1) % 1;
      const ns = clamp01(ss * (p.saturation ?? 1));
      const nl = clamp01(ll + (p.lightness ?? 0));
      const [rr, gg, bb] = hslToRgb(nh, ns, nl);
      return [rr * 255, gg * 255, bb * 255];
    }),
  },

  normalMap: {
    id: 'normalMap', name: 'Normal Map', category: 'utility', icon: '⊿', color: 'hsl(120 100% 45%)',
    inputs: ['in'], outputs: ['out'],
    params: [
      { id: 'strength', label: 'Strength', min: 0.1, max: 20, default: 2, step: 0.1 },
      { id: 'invert', label: 'Invert', min: 0, max: 1, default: 0, step: 1 },
    ],
    compute: (w, h, p, inputs) => {
      const input = inputs.in;
      if (!input) return new ImageData(w, h);
      const str = p.strength ?? 2, inv = (p.invert ?? 0) > 0.5 ? -1 : 1;
      const img = new ImageData(w, h);
      const d = img.data, s = input.data;
      const getH = (px: number, py: number) => s[(Math.min(h - 1, Math.max(0, py)) * w + Math.min(w - 1, Math.max(0, px))) * 4] / 255;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const dx = (getH(x + 1, y) - getH(x - 1, y)) * str * inv;
          const dy = (getH(x, y + 1) - getH(x, y - 1)) * str * inv;
          const i = (y * w + x) * 4;
          d[i] = clamp255((-dx * 0.5 + 0.5) * 255);
          d[i + 1] = clamp255((-dy * 0.5 + 0.5) * 255);
          d[i + 2] = 255; d[i + 3] = 255;
        }
      }
      return img;
    },
  },

  heightToAO: {
    id: 'heightToAO', name: 'Ambient Occlusion', category: 'utility', icon: '◐', color: 'hsl(120 100% 45%)',
    inputs: ['in'], outputs: ['out'],
    params: [
      { id: 'radius', label: 'Radius', min: 1, max: 15, default: 4, step: 1 },
      { id: 'strength', label: 'Strength', min: 0.5, max: 5, default: 2, step: 0.1 },
    ],
    compute: (w, h, p, inputs) => {
      const input = inputs.in;
      if (!input) return new ImageData(w, h);
      const rad = Math.round(p.radius ?? 4), str = p.strength ?? 2;
      const img = new ImageData(w, h);
      const d = img.data, s = input.data;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const ch = s[(y * w + x) * 4] / 255;
          let ao = 0, count = 0;
          for (let dy = -rad; dy <= rad; dy++) {
            for (let dx = -rad; dx <= rad; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = Math.min(w - 1, Math.max(0, x + dx));
              const ny = Math.min(h - 1, Math.max(0, y + dy));
              const nh = s[(ny * w + nx) * 4] / 255;
              const dist = Math.sqrt(dx * dx + dy * dy);
              ao += Math.max(0, nh - ch) / dist;
              count++;
            }
          }
          const v = clamp255((1 - ao / count * str) * 255);
          const i = (y * w + x) * 4;
          d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
        }
      }
      return img;
    },
  },

  curvatureMap: {
    id: 'curvatureMap', name: 'Curvature Map', category: 'utility', icon: '∂', color: 'hsl(120 100% 45%)',
    inputs: ['in'], outputs: ['out'],
    params: [
      { id: 'strength', label: 'Strength', min: 0.1, max: 10, default: 2, step: 0.1 },
    ],
    compute: (w, h, p, inputs) => {
      const input = inputs.in;
      if (!input) return new ImageData(w, h);
      const str = p.strength ?? 2;
      const img = new ImageData(w, h);
      const d = img.data, s = input.data;
      const getH = (px: number, py: number) => s[(Math.min(h - 1, Math.max(0, py)) * w + Math.min(w - 1, Math.max(0, px))) * 4] / 255;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const laplacian = getH(x+1,y) + getH(x-1,y) + getH(x,y+1) + getH(x,y-1) - 4 * getH(x,y);
          const v = clamp255((laplacian * str + 0.5) * 255);
          const i = (y * w + x) * 4;
          d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
        }
      }
      return img;
    },
  },

  channelSplit: {
    id: 'channelSplit', name: 'Channel Extract', category: 'utility', icon: '⊡', color: 'hsl(120 100% 45%)',
    inputs: ['in'], outputs: ['out'],
    params: [
      { id: 'channel', label: 'Channel', min: 0, max: 3, default: 0, step: 1 },
    ],
    compute: (w, h, p, inputs) => {
      const ch = Math.round(p.channel ?? 0);
      return xform(inputs.in, w, h, (r, g, b) => {
        if (ch === 0) return [r, r, r];
        if (ch === 1) return [g, g, g];
        if (ch === 2) return [b, b, b];
        const lum = r * 0.299 + g * 0.587 + b * 0.114;
        return [lum, lum, lum]; // Luminance
      });
    },
  },

  channelCombine: {
    id: 'channelCombine', name: 'Channel Combine', category: 'utility', icon: '⊞', color: 'hsl(120 100% 45%)',
    inputs: ['r', 'g', 'b'], outputs: ['out'],
    params: [],
    compute: (w, h, _p, inputs) => {
      const img = new ImageData(w, h);
      const d = img.data;
      const sr = inputs.r, sg = inputs.g, sb = inputs.b;
      for (let i = 0; i < w * h; i++) {
        const idx = i * 4;
        d[idx] = sr ? sr.data[idx] : 0;
        d[idx + 1] = sg ? sg.data[idx] : 0;
        d[idx + 2] = sb ? sb.data[idx] : 0;
        d[idx + 3] = 255;
      }
      return img;
    },
  },

  output: {
    id: 'output', name: 'Output', category: 'utility', icon: '◉', color: 'hsl(45 100% 55%)',
    inputs: ['in'], outputs: [],
    params: [],
    compute: (_w, _h, _p, inputs) => inputs.in || new ImageData(_w, _h),
  },
};

export const MODULE_CATEGORIES = {
  generator: Object.values(MODULES).filter(m => m.category === 'generator'),
  modifier: Object.values(MODULES).filter(m => m.category === 'modifier'),
  fx: Object.values(MODULES).filter(m => m.category === 'fx'),
  physics: Object.values(MODULES).filter(m => m.category === 'physics'),
  utility: Object.values(MODULES).filter(m => m.category === 'utility'),
};
