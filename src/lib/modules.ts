import { NoiseGenerator } from './noise';

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
  category: 'generator' | 'modifier' | 'fx' | 'utility';
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
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 255;
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
  [[0,0,0],[128,17,0],[255,68,0],[255,153,0],[255,221,68],[255,255,221]],         // 0: Fire
  [[0,7,20],[0,41,97],[0,97,163],[29,163,214],[119,209,240],[214,240,252]],       // 1: Ocean
  [[5,0,20],[89,0,179],[204,0,153],[255,51,102],[255,153,51],[255,255,51]],       // 2: Neon
  [[10,15,5],[30,60,15],[60,120,30],[120,170,60],[170,210,100],[220,240,180]],    // 3: Forest
  [[68,1,84],[72,36,117],[65,68,135],[53,95,141],[33,145,140],[94,201,98],[253,231,37]], // 4: Plasma
  [[0,0,0],[255,255,255]],                                                        // 5: Mono
  [[25,10,40],[80,20,90],[160,40,100],[220,80,60],[250,160,50],[255,230,120]],    // 6: Sunset
  [[10,10,30],[20,40,80],[40,80,140],[80,140,200],[150,200,230],[220,240,255]],   // 7: Ice
  [[20,0,0],[80,0,20],[150,10,40],[200,60,20],[230,120,10],[255,200,50]],         // 8: Magma
  [[0,0,0],[0,255,128],[0,128,255],[128,0,255],[255,0,128],[255,255,255]],        // 9: Cyberpunk
  [[30,20,10],[60,45,25],[90,75,50],[140,120,80],[190,170,130],[230,220,200]],    // 10: Sepia
  [[0,10,20],[0,40,50],[0,80,70],[20,140,100],[80,200,140],[180,240,200]],        // 11: Jade
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

  // ─────────────────── GENERATORS ───────────────────

  perlin: {
    id: 'perlin', name: 'Perlin Noise', category: 'generator', icon: '◈', color: 'hsl(180 100% 50%)',
    inputs: [], outputs: ['out'],
    params: [
      { id: 'frequency', label: 'Freq', min: 0.5, max: 20, default: 4, step: 0.1 },
      { id: 'octaves', label: 'Oct', min: 1, max: 8, default: 4, step: 1 },
      { id: 'lacunarity', label: 'Lac', min: 1, max: 4, default: 2, step: 0.1 },
      { id: 'persistence', label: 'Pers', min: 0, max: 1, default: 0.5, step: 0.01 },
      { id: 'seed', label: 'Seed', min: 0, max: 999, default: 42, step: 1 },
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
      { id: 'frequency', label: 'Freq', min: 0.5, max: 20, default: 4, step: 0.1 },
      { id: 'octaves', label: 'Oct', min: 1, max: 8, default: 4, step: 1 },
      { id: 'lacunarity', label: 'Lac', min: 1, max: 4, default: 2, step: 0.1 },
      { id: 'persistence', label: 'Pers', min: 0, max: 1, default: 0.5, step: 0.01 },
      { id: 'seed', label: 'Seed', min: 0, max: 999, default: 17, step: 1 },
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
      { id: 'frequency', label: 'Freq', min: 0.5, max: 20, default: 3, step: 0.1 },
      { id: 'octaves', label: 'Oct', min: 1, max: 8, default: 5, step: 1 },
      { id: 'lacunarity', label: 'Lac', min: 1, max: 4, default: 2.2, step: 0.1 },
      { id: 'persistence', label: 'Pers', min: 0, max: 1, default: 0.6, step: 0.01 },
      { id: 'seed', label: 'Seed', min: 0, max: 999, default: 7, step: 1 },
    ],
    compute: (w, h, p) => {
      const n = new NoiseGenerator(p.seed ?? 7);
      return gen(w, h, (nx, ny) => n.ridged(nx * (p.frequency ?? 3), ny * (p.frequency ?? 3), Math.round(p.octaves ?? 5), p.lacunarity ?? 2.2, p.persistence ?? 0.6));
    },
  },

  voronoi: {
    id: 'voronoi', name: 'Voronoi', category: 'generator', icon: '⬡', color: 'hsl(180 100% 50%)',
    inputs: [], outputs: ['out'],
    params: [
      { id: 'scale', label: 'Scale', min: 1, max: 20, default: 6, step: 0.1 },
      { id: 'jitter', label: 'Jitter', min: 0, max: 1, default: 1, step: 0.01 },
      { id: 'mode', label: 'Mode', min: 0, max: 2, default: 0, step: 1 },
      { id: 'seed', label: 'Seed', min: 0, max: 999, default: 7, step: 1 },
    ],
    compute: (w, h, p) => {
      const n = new NoiseGenerator(p.seed ?? 7);
      const mode = Math.round(p.mode ?? 0);
      return gen(w, h, (nx, ny) => {
        const v = n.voronoi(nx * (p.scale ?? 6), ny * (p.scale ?? 6), p.jitter ?? 1);
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
      { id: 'type', label: 'Type', min: 0, max: 2, default: 0, step: 1 },
      { id: 'repeat', label: 'Repeat', min: 1, max: 8, default: 1, step: 1 },
    ],
    compute: (w, h, p) => {
      const angle = (p.angle ?? 0) * Math.PI / 180;
      const type = Math.round(p.type ?? 0);
      const repeat = Math.round(p.repeat ?? 1);
      return gen(w, h, (nx, ny) => {
        let t: number;
        if (type === 0) t = (nx * Math.cos(angle) + ny * Math.sin(angle)) * 0.5 + 0.5;
        else if (type === 1) { const dx = nx - 0.5, dy = ny - 0.5; t = 1 - Math.min(1, Math.sqrt(dx * dx + dy * dy) * 2); }
        else t = (Math.atan2(ny - 0.5, nx - 0.5) / Math.PI + 1) * 0.5;
        return (t * repeat) % 1;
      });
    },
  },

  checker: {
    id: 'checker', name: 'Checker', category: 'generator', icon: '▦', color: 'hsl(180 100% 50%)',
    inputs: [], outputs: ['out'],
    params: [
      { id: 'scale', label: 'Scale', min: 1, max: 32, default: 8, step: 1 },
      { id: 'softness', label: 'Soft', min: 0, max: 0.5, default: 0, step: 0.01 },
    ],
    compute: (w, h, p) => {
      const scale = Math.round(p.scale ?? 8);
      const soft = p.softness ?? 0;
      return gen(w, h, (nx, ny) => {
        if (soft > 0) {
          const sx = Math.sin(nx * scale * Math.PI) * 0.5 + 0.5;
          const sy = Math.sin(ny * scale * Math.PI) * 0.5 + 0.5;
          return smoothstep(0.5 - soft, 0.5 + soft, sx * sy + (1 - sx) * (1 - sy));
        }
        const cx = Math.floor(nx * scale), cy = Math.floor(ny * scale);
        return (cx + cy) % 2 === 0 ? 1 : 0;
      });
    },
  },

  whiteNoise: {
    id: 'whiteNoise', name: 'White Noise', category: 'generator', icon: '⚡', color: 'hsl(180 100% 50%)',
    inputs: [], outputs: ['out'],
    params: [
      { id: 'seed', label: 'Seed', min: 0, max: 999, default: 0, step: 1 },
      { id: 'scale', label: 'Scale', min: 1, max: 256, default: 1, step: 1 },
    ],
    compute: (w, h, p) => {
      const seed = p.seed ?? 0;
      const scale = Math.max(1, Math.round(p.scale ?? 1));
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
      { id: 'rows', label: 'Rows', min: 2, max: 24, default: 8, step: 1 },
      { id: 'cols', label: 'Cols', min: 1, max: 12, default: 4, step: 1 },
      { id: 'gap', label: 'Gap', min: 0.005, max: 0.1, default: 0.02, step: 0.005 },
      { id: 'bevel', label: 'Bevel', min: 0, max: 0.1, default: 0, step: 0.005 },
    ],
    compute: (w, h, p) => {
      const rows = Math.round(p.rows ?? 8), cols = Math.round(p.cols ?? 4);
      const gap = p.gap ?? 0.02, bevel = p.bevel ?? 0;
      return gen(w, h, (nx, ny) => {
        const row = Math.floor(ny * rows);
        const offset = row % 2 === 1 ? 0.5 / cols : 0;
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
      { id: 'freqX', label: 'FreqX', min: 0.5, max: 30, default: 5, step: 0.1 },
      { id: 'freqY', label: 'FreqY', min: 0.5, max: 30, default: 5, step: 0.1 },
      { id: 'phase', label: 'Phase', min: 0, max: 6.28, default: 0, step: 0.01 },
      { id: 'mode', label: 'Mode', min: 0, max: 2, default: 0, step: 1 },
    ],
    compute: (w, h, p) => {
      const fx = p.freqX ?? 5, fy = p.freqY ?? 5, ph = p.phase ?? 0;
      const mode = Math.round(p.mode ?? 0);
      return gen(w, h, (nx, ny) => {
        if (mode === 0) return (Math.sin(nx * fx * Math.PI * 2 + ph) * Math.sin(ny * fy * Math.PI * 2 + ph)) * 0.5 + 0.5;
        if (mode === 1) return (Math.sin(nx * fx * Math.PI * 2 + ph) + Math.sin(ny * fy * Math.PI * 2 + ph)) * 0.25 + 0.5;
        return (Math.sin((nx * fx + ny * fy) * Math.PI * 2 + ph)) * 0.5 + 0.5;
      });
    },
  },

  sdfShapes: {
    id: 'sdfShapes', name: 'SDF Shapes', category: 'generator', icon: '●', color: 'hsl(180 100% 50%)',
    inputs: [], outputs: ['out'],
    params: [
      { id: 'shape', label: 'Shape', min: 0, max: 4, default: 0, step: 1 },
      { id: 'size', label: 'Size', min: 0.05, max: 0.8, default: 0.3, step: 0.01 },
      { id: 'smooth', label: 'Smooth', min: 0.001, max: 0.2, default: 0.02, step: 0.001 },
      { id: 'repeat', label: 'Repeat', min: 1, max: 8, default: 1, step: 1 },
    ],
    compute: (w, h, p) => {
      const shape = Math.round(p.shape ?? 0), size = p.size ?? 0.3, sm = p.smooth ?? 0.02;
      const rep = Math.round(p.repeat ?? 1);
      return gen(w, h, (nx, ny) => {
        let px = (nx * rep) % 1 - 0.5, py = (ny * rep) % 1 - 0.5;
        let dist: number;
        if (shape === 0) dist = Math.sqrt(px * px + py * py) - size;
        else if (shape === 1) { const dx = Math.abs(px) - size, dy = Math.abs(py) - size; dist = Math.sqrt(Math.max(dx, 0) ** 2 + Math.max(dy, 0) ** 2) + Math.min(Math.max(dx, dy), 0); }
        else if (shape === 2) dist = Math.abs(Math.sqrt(px * px + py * py) - size) - size * 0.15;
        else if (shape === 3) { dist = Math.min(Math.abs(px), Math.abs(py)) - size * 0.12; dist = Math.max(dist, Math.max(Math.abs(px), Math.abs(py)) - size); }
        else { const a = Math.atan2(py, px); const r = Math.sqrt(px * px + py * py); const star = size * (0.5 + 0.5 * Math.cos(a * 5)); dist = r - star; }
        return 1 - smoothstep(-sm, sm, dist);
      });
    },
  },

  fractal: {
    id: 'fractal', name: 'Fractal', category: 'generator', icon: '❋', color: 'hsl(180 100% 50%)',
    inputs: [], outputs: ['out'],
    params: [
      { id: 'zoom', label: 'Zoom', min: 0.1, max: 50, default: 1, step: 0.1 },
      { id: 'centerX', label: 'Pan X', min: -2, max: 2, default: -0.5, step: 0.01 },
      { id: 'centerY', label: 'Pan Y', min: -2, max: 2, default: 0, step: 0.01 },
      { id: 'iterations', label: 'Iter', min: 10, max: 200, default: 50, step: 1 },
    ],
    compute: (w, h, p) => {
      const zoom = p.zoom ?? 1, cx = p.centerX ?? -0.5, cy = p.centerY ?? 0;
      const maxIter = Math.round(p.iterations ?? 50);
      return gen(w, h, (nx, ny) => {
        const cr = (nx - 0.5) / zoom + cx;
        const ci = (ny - 0.5) / zoom + cy;
        let x = 0, y = 0;
        for (let i = 0; i < maxIter; i++) {
          const xx = x * x - y * y + cr;
          const yy = 2 * x * y + ci;
          x = xx; y = yy;
          if (x * x + y * y > 4) return i / maxIter;
        }
        return 0;
      });
    },
  },

  dots: {
    id: 'dots', name: 'Dots Grid', category: 'generator', icon: '⠿', color: 'hsl(180 100% 50%)',
    inputs: [], outputs: ['out'],
    params: [
      { id: 'count', label: 'Count', min: 2, max: 30, default: 10, step: 1 },
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

  // ─────────────────── MODIFIERS ───────────────────

  colorMap: {
    id: 'colorMap', name: 'Color Map', category: 'modifier', icon: '🎨', color: 'hsl(300 100% 60%)',
    inputs: ['in'], outputs: ['out'],
    params: [
      { id: 'palette', label: 'Palette', min: 0, max: 11, default: 4, step: 1 },
      { id: 'contrast', label: 'Contrast', min: 0.1, max: 3, default: 1, step: 0.01 },
      { id: 'shift', label: 'Shift', min: 0, max: 1, default: 0, step: 0.01 },
    ],
    compute: (w, h, p, inputs) => {
      const palette = PALETTES[Math.round(p.palette ?? 4) % PALETTES.length];
      const contrast = p.contrast ?? 1, shift = p.shift ?? 0;
      return xform(inputs.in, w, h, (r) => {
        let val = Math.pow(r / 255, contrast);
        val = (val + shift) % 1;
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
      { id: 'contrast', label: 'Contrast', min: 0, max: 3, default: 1, step: 0.01 },
      { id: 'gamma', label: 'Gamma', min: 0.1, max: 5, default: 1, step: 0.01 },
    ],
    compute: (w, h, p, inputs) => {
      const br = p.brightness ?? 0, co = p.contrast ?? 1, ga = p.gamma ?? 1;
      return xform(inputs.in, w, h, (r, g, b) => {
        const adj = (v: number) => Math.pow(clamp01((v / 255 - 0.5) * co + 0.5 + br), 1 / ga) * 255;
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
      { id: 'mode', label: 'Mode', min: 0, max: 4, default: 0, step: 1 },
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
            if (mode === 0) result = va * (1 - opacity) + vb * opacity;
            else if (mode === 1) result = va * vb;
            else if (mode === 2) result = Math.min(1, va + vb);
            else if (mode === 3) result = 1 - (1 - va) * (1 - vb);
            else result = Math.abs(va - vb);
            d[idx + c] = clamp255(result * 255);
          }
          d[idx + 3] = 255;
        }
      }
      return img;
    },
  },

  twirl: {
    id: 'twirl', name: 'Twirl', category: 'modifier', icon: '↻', color: 'hsl(300 100% 60%)',
    inputs: ['in'], outputs: ['out'],
    params: [
      { id: 'strength', label: 'Strength', min: -10, max: 10, default: 3, step: 0.1 },
      { id: 'radius', label: 'Radius', min: 0.1, max: 1, default: 0.5, step: 0.01 },
    ],
    compute: (w, h, p, inputs) => remap(inputs.in, w, h, (nx, ny) => {
      const dx = nx - 0.5, dy = ny - 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = (p.strength ?? 3) * Math.max(0, 1 - dist / (p.radius ?? 0.5));
      const cos = Math.cos(angle), sin = Math.sin(angle);
      return [0.5 + dx * cos - dy * sin, 0.5 + dx * sin + dy * cos];
    }),
  },

  kaleidoscope: {
    id: 'kaleidoscope', name: 'Kaleidoscope', category: 'modifier', icon: '✱', color: 'hsl(300 100% 60%)',
    inputs: ['in'], outputs: ['out'],
    params: [
      { id: 'segments', label: 'Segments', min: 2, max: 16, default: 6, step: 1 },
      { id: 'rotation', label: 'Rotate', min: 0, max: 6.28, default: 0, step: 0.01 },
    ],
    compute: (w, h, p, inputs) => remap(inputs.in, w, h, (nx, ny) => {
      const segments = Math.round(p.segments ?? 6);
      const rot = p.rotation ?? 0;
      const dx = nx - 0.5, dy = ny - 0.5;
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
    params: [{ id: 'size', label: 'Size', min: 2, max: 64, default: 8, step: 1 }],
    compute: (w, h, p, inputs) => remap(inputs.in, w, h, (nx, ny) => {
      const size = Math.max(2, Math.round(p.size ?? 8));
      return [Math.floor(nx * size) / size + 0.5 / size, Math.floor(ny * size) / size + 0.5 / size];
    }),
  },

  posterize: {
    id: 'posterize', name: 'Posterize', category: 'modifier', icon: '▧', color: 'hsl(300 100% 60%)',
    inputs: ['in'], outputs: ['out'],
    params: [{ id: 'levels', label: 'Levels', min: 2, max: 16, default: 4, step: 1 }],
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
      { id: 'strength', label: 'Strength', min: 0, max: 0.5, default: 0.1, step: 0.005 },
      { id: 'frequency', label: 'Freq', min: 1, max: 10, default: 3, step: 0.1 },
      { id: 'seed', label: 'Seed', min: 0, max: 999, default: 0, step: 1 },
    ],
    compute: (w, h, p, inputs) => {
      const noise = new NoiseGenerator(p.seed ?? 0);
      const str = p.strength ?? 0.1, freq = p.frequency ?? 3;
      return remap(inputs.in, w, h, (nx, ny) => {
        const dx = noise.perlin2D(nx * freq, ny * freq) * str;
        const dy = noise.perlin2D(nx * freq + 100, ny * freq + 100) * str;
        return [clamp01(nx + dx), clamp01(ny + dy)];
      });
    },
  },

  mirror: {
    id: 'mirror', name: 'Mirror / Tile', category: 'modifier', icon: '⧉', color: 'hsl(300 100% 60%)',
    inputs: ['in'], outputs: ['out'],
    params: [
      { id: 'tilesX', label: 'TilesX', min: 1, max: 8, default: 2, step: 1 },
      { id: 'tilesY', label: 'TilesY', min: 1, max: 8, default: 2, step: 1 },
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

  // ─────────────────── FX ───────────────────

  blur: {
    id: 'blur', name: 'Blur', category: 'fx', icon: '◌', color: 'hsl(45 100% 55%)',
    inputs: ['in'], outputs: ['out'],
    params: [
      { id: 'radius', label: 'Radius', min: 0, max: 15, default: 3, step: 1 },
      { id: 'passes', label: 'Passes', min: 1, max: 3, default: 1, step: 1 },
    ],
    compute: (w, h, p, inputs) => {
      let result = inputs.in || new ImageData(w, h);
      const passes = Math.round(p.passes ?? 1);
      for (let i = 0; i < passes; i++) {
        result = boxBlur(result, w, h, p.radius ?? 3);
      }
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
    params: [{ id: 'strength', label: 'Strength', min: 0.1, max: 5, default: 1, step: 0.1 }],
    compute: (w, h, p, inputs) => {
      const input = inputs.in;
      if (!input) return new ImageData(w, h);
      const str = p.strength ?? 1;
      const img = new ImageData(w, h);
      const d = img.data, s = input.data;
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const getL = (px: number, py: number) => { const i = (py * w + px) * 4; return (s[i] * 0.299 + s[i + 1] * 0.587 + s[i + 2] * 0.114) / 255; };
          const gx = -getL(x - 1, y - 1) + getL(x + 1, y - 1) - 2 * getL(x - 1, y) + 2 * getL(x + 1, y) - getL(x - 1, y + 1) + getL(x + 1, y + 1);
          const gy = -getL(x - 1, y - 1) - 2 * getL(x, y - 1) - getL(x + 1, y - 1) + getL(x - 1, y + 1) + 2 * getL(x, y + 1) + getL(x + 1, y + 1);
          const v = clamp255(Math.sqrt(gx * gx + gy * gy) * str * 255);
          const i = (y * w + x) * 4;
          d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
        }
      }
      return img;
    },
  },

  emboss: {
    id: 'emboss', name: 'Emboss', category: 'fx', icon: '◈', color: 'hsl(45 100% 55%)',
    inputs: ['in'], outputs: ['out'],
    params: [{ id: 'strength', label: 'Strength', min: 0.1, max: 3, default: 1, step: 0.1 }],
    compute: (w, h, p, inputs) => {
      const s = p.strength ?? 1;
      return convolve3x3(inputs.in, w, h, [[-2 * s, -s, 0], [-s, 1, s], [0, s, 2 * s]], 128);
    },
  },

  filmGrain: {
    id: 'filmGrain', name: 'Film Grain', category: 'fx', icon: '▓', color: 'hsl(45 100% 55%)',
    inputs: ['in'], outputs: ['out'],
    params: [
      { id: 'intensity', label: 'Intensity', min: 0, max: 1, default: 0.2, step: 0.01 },
      { id: 'seed', label: 'Seed', min: 0, max: 999, default: 0, step: 1 },
    ],
    compute: (w, h, p, inputs) => {
      const intensity = p.intensity ?? 0.2, seed = p.seed ?? 0;
      return xform(inputs.in, w, h, (r, g, b, nx, ny) => {
        const hash = Math.sin(nx * 12.9898 + ny * 78.233 + seed) * 43758.5453;
        const grain = (hash - Math.floor(hash) - 0.5) * intensity * 255;
        return [r + grain, g + grain, b + grain];
      });
    },
  },

  vignette: {
    id: 'vignette', name: 'Vignette', category: 'fx', icon: '◍', color: 'hsl(45 100% 55%)',
    inputs: ['in'], outputs: ['out'],
    params: [
      { id: 'strength', label: 'Strength', min: 0, max: 2, default: 0.5, step: 0.01 },
      { id: 'radius', label: 'Radius', min: 0.1, max: 1.5, default: 0.8, step: 0.01 },
    ],
    compute: (w, h, p, inputs) => {
      const str = p.strength ?? 0.5, rad = p.radius ?? 0.8;
      return xform(inputs.in, w, h, (r, g, b, nx, ny) => {
        const dx = nx - 0.5, dy = ny - 0.5;
        const dist = Math.sqrt(dx * dx + dy * dy) * 2;
        const vig = clamp01(1 - Math.pow(Math.max(0, dist - rad + 0.5), 2) * str * 2);
        return [r * vig, g * vig, b * vig];
      });
    },
  },

  scanlines: {
    id: 'scanlines', name: 'Scanlines', category: 'fx', icon: '▤', color: 'hsl(45 100% 55%)',
    inputs: ['in'], outputs: ['out'],
    params: [
      { id: 'spacing', label: 'Spacing', min: 2, max: 16, default: 4, step: 1 },
      { id: 'intensity', label: 'Intensity', min: 0, max: 1, default: 0.3, step: 0.01 },
    ],
    compute: (w, h, p, inputs) => {
      const spacing = Math.max(2, Math.round(p.spacing ?? 4)), intensity = p.intensity ?? 0.3;
      return xform(inputs.in, w, h, (r, g, b, _nx, ny) => {
        const line = Math.floor(ny * h) % spacing < spacing / 2;
        const f = line ? 1 : 1 - intensity;
        return [r * f, g * f, b * f];
      });
    },
  },

  chromaticSplit: {
    id: 'chromaticSplit', name: 'Chromatic Split', category: 'fx', icon: '◐', color: 'hsl(45 100% 55%)',
    inputs: ['in'], outputs: ['out'],
    params: [
      { id: 'offset', label: 'Offset', min: 0, max: 20, default: 3, step: 0.5 },
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

  // ─────────────────── UTILITIES ───────────────────

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
    params: [{ id: 'strength', label: 'Strength', min: 0.1, max: 10, default: 2, step: 0.1 }],
    compute: (w, h, p, inputs) => {
      const input = inputs.in;
      if (!input) return new ImageData(w, h);
      const str = p.strength ?? 2;
      const img = new ImageData(w, h);
      const d = img.data, s = input.data;
      const getH = (px: number, py: number) => s[(Math.min(h - 1, Math.max(0, py)) * w + Math.min(w - 1, Math.max(0, px))) * 4] / 255;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const dx = (getH(x + 1, y) - getH(x - 1, y)) * str;
          const dy = (getH(x, y + 1) - getH(x, y - 1)) * str;
          const i = (y * w + x) * 4;
          d[i] = clamp255((-dx * 0.5 + 0.5) * 255);
          d[i + 1] = clamp255((-dy * 0.5 + 0.5) * 255);
          d[i + 2] = 255;
          d[i + 3] = 255;
        }
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
  utility: Object.values(MODULES).filter(m => m.category === 'utility'),
};
