import { NoiseGenerator } from './noise';

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
  category: 'generator' | 'modifier' | 'output';
  params: ParamDef[];
  inputs: string[];
  outputs: string[];
  color: string;
  compute: (
    w: number, h: number,
    params: Record<string, number>,
    inputs: Record<string, ImageData | null>
  ) => ImageData;
}

const PALETTES: number[][][] = [
  // 0: Fire
  [[0,0,0],[128,17,0],[255,68,0],[255,153,0],[255,221,68],[255,255,221]],
  // 1: Ocean
  [[0,7,20],[0,41,97],[0,97,163],[29,163,214],[119,209,240],[214,240,252]],
  // 2: Neon
  [[5,0,20],[89,0,179],[204,0,153],[255,51,102],[255,153,51],[255,255,51]],
  // 3: Forest
  [[10,15,5],[30,60,15],[60,120,30],[120,170,60],[170,210,100],[220,240,180]],
  // 4: Plasma
  [[68,1,84],[72,36,117],[65,68,135],[53,95,141],[33,145,140],[94,201,98],[253,231,37]],
  // 5: Monochrome
  [[0,0,0],[255,255,255]],
  // 6: Sunset
  [[25,10,40],[80,20,90],[160,40,100],[220,80,60],[250,160,50],[255,230,120]],
  // 7: Ice
  [[10,10,30],[20,40,80],[40,80,140],[80,140,200],[150,200,230],[220,240,255]],
];

function samplePalette(palette: number[][], t: number): [number, number, number] {
  t = Math.max(0, Math.min(1, t));
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

function createImageData(w: number, h: number): ImageData {
  return new ImageData(w, h);
}

function getInputGrayscale(input: ImageData | null, idx: number): number {
  if (!input) return 0;
  return input.data[idx] / 255;
}

export const MODULES: Record<string, ModuleDef> = {
  perlin: {
    id: 'perlin', name: 'Perlin Noise', category: 'generator',
    color: 'hsl(180 100% 50%)',
    inputs: [], outputs: ['out'],
    params: [
      { id: 'frequency', label: 'Freq', min: 0.5, max: 20, default: 4, step: 0.1 },
      { id: 'octaves', label: 'Oct', min: 1, max: 8, default: 4, step: 1 },
      { id: 'lacunarity', label: 'Lac', min: 1, max: 4, default: 2, step: 0.1 },
      { id: 'persistence', label: 'Pers', min: 0, max: 1, default: 0.5, step: 0.01 },
      { id: 'seed', label: 'Seed', min: 0, max: 100, default: 42, step: 1 },
    ],
    compute: (w, h, params) => {
      const img = createImageData(w, h);
      const d = img.data;
      const noise = new NoiseGenerator(params.seed ?? 42);
      const freq = params.frequency ?? 4;
      const oct = Math.round(params.octaves ?? 4);
      const lac = params.lacunarity ?? 2;
      const pers = params.persistence ?? 0.5;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let val = noise.fbm(x / w * freq, y / h * freq, oct, lac, pers);
          val = val * 0.5 + 0.5;
          const b = Math.min(255, Math.max(0, Math.round(val * 255)));
          const i = (y * w + x) * 4;
          d[i] = d[i + 1] = d[i + 2] = b;
          d[i + 3] = 255;
        }
      }
      return img;
    },
  },

  voronoi: {
    id: 'voronoi', name: 'Voronoi', category: 'generator',
    color: 'hsl(180 100% 50%)',
    inputs: [], outputs: ['out'],
    params: [
      { id: 'scale', label: 'Scale', min: 1, max: 20, default: 6, step: 0.1 },
      { id: 'jitter', label: 'Jitter', min: 0, max: 1, default: 1, step: 0.01 },
      { id: 'mode', label: 'Mode', min: 0, max: 2, default: 0, step: 1 },
      { id: 'seed', label: 'Seed', min: 0, max: 100, default: 7, step: 1 },
    ],
    compute: (w, h, params) => {
      const img = createImageData(w, h);
      const d = img.data;
      const noise = new NoiseGenerator(params.seed ?? 7);
      const scale = params.scale ?? 6;
      const jitter = params.jitter ?? 1;
      const mode = Math.round(params.mode ?? 0);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const v = noise.voronoi(x / w * scale, y / h * scale, jitter);
          let val: number;
          if (mode === 0) val = v.f1;
          else if (mode === 1) val = v.f2 - v.f1;
          else val = v.f2;
          val = Math.min(1, Math.max(0, val));
          const b = Math.round(val * 255);
          const i = (y * w + x) * 4;
          d[i] = d[i + 1] = d[i + 2] = b;
          d[i + 3] = 255;
        }
      }
      return img;
    },
  },

  gradient: {
    id: 'gradient', name: 'Gradient', category: 'generator',
    color: 'hsl(180 100% 50%)',
    inputs: [], outputs: ['out'],
    params: [
      { id: 'angle', label: 'Angle', min: 0, max: 360, default: 0, step: 1 },
      { id: 'type', label: 'Type', min: 0, max: 2, default: 0, step: 1 },
    ],
    compute: (w, h, params) => {
      const img = createImageData(w, h);
      const d = img.data;
      const angle = (params.angle ?? 0) * Math.PI / 180;
      const type = Math.round(params.type ?? 0);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const nx = x / w, ny = y / h;
          let t: number;
          if (type === 0) {
            t = (nx * Math.cos(angle) + ny * Math.sin(angle)) * 0.5 + 0.5;
          } else if (type === 1) {
            const dx = nx - 0.5, dy = ny - 0.5;
            t = 1 - Math.min(1, Math.sqrt(dx * dx + dy * dy) * 2);
          } else {
            t = (Math.atan2(ny - 0.5, nx - 0.5) / Math.PI + 1) * 0.5;
          }
          const b = Math.round(Math.min(1, Math.max(0, t)) * 255);
          const i = (y * w + x) * 4;
          d[i] = d[i + 1] = d[i + 2] = b;
          d[i + 3] = 255;
        }
      }
      return img;
    },
  },

  checker: {
    id: 'checker', name: 'Checker', category: 'generator',
    color: 'hsl(180 100% 50%)',
    inputs: [], outputs: ['out'],
    params: [
      { id: 'scale', label: 'Scale', min: 1, max: 32, default: 8, step: 1 },
    ],
    compute: (w, h, params) => {
      const img = createImageData(w, h);
      const d = img.data;
      const scale = Math.round(params.scale ?? 8);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const cx = Math.floor(x / w * scale);
          const cy = Math.floor(y / h * scale);
          const b = (cx + cy) % 2 === 0 ? 255 : 0;
          const i = (y * w + x) * 4;
          d[i] = d[i + 1] = d[i + 2] = b;
          d[i + 3] = 255;
        }
      }
      return img;
    },
  },

  colorMap: {
    id: 'colorMap', name: 'Color Map', category: 'modifier',
    color: 'hsl(300 100% 60%)',
    inputs: ['in'], outputs: ['out'],
    params: [
      { id: 'palette', label: 'Palette', min: 0, max: 7, default: 4, step: 1 },
      { id: 'contrast', label: 'Contrast', min: 0.1, max: 3, default: 1, step: 0.01 },
      { id: 'shift', label: 'Shift', min: 0, max: 1, default: 0, step: 0.01 },
    ],
    compute: (w, h, params, inputs) => {
      const img = createImageData(w, h);
      const d = img.data;
      const input = inputs.in;
      const palette = PALETTES[Math.round(params.palette ?? 4) % PALETTES.length];
      const contrast = params.contrast ?? 1;
      const shift = params.shift ?? 0;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          let val = getInputGrayscale(input, idx);
          val = Math.pow(val, contrast);
          val = (val + shift) % 1;
          const [r, g, b] = samplePalette(palette, val);
          d[idx] = Math.round(r);
          d[idx + 1] = Math.round(g);
          d[idx + 2] = Math.round(b);
          d[idx + 3] = 255;
        }
      }
      return img;
    },
  },

  levels: {
    id: 'levels', name: 'Levels', category: 'modifier',
    color: 'hsl(300 100% 60%)',
    inputs: ['in'], outputs: ['out'],
    params: [
      { id: 'brightness', label: 'Bright', min: -1, max: 1, default: 0, step: 0.01 },
      { id: 'contrast', label: 'Contrast', min: 0, max: 3, default: 1, step: 0.01 },
      { id: 'gamma', label: 'Gamma', min: 0.1, max: 5, default: 1, step: 0.01 },
    ],
    compute: (w, h, params, inputs) => {
      const img = createImageData(w, h);
      const d = img.data;
      const input = inputs.in;
      const brightness = params.brightness ?? 0;
      const contrast = params.contrast ?? 1;
      const gamma = params.gamma ?? 1;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          for (let c = 0; c < 3; c++) {
            let val = input ? input.data[idx + c] / 255 : 0;
            val = (val - 0.5) * contrast + 0.5 + brightness;
            val = Math.pow(Math.max(0, val), 1 / gamma);
            d[idx + c] = Math.min(255, Math.max(0, Math.round(val * 255)));
          }
          d[idx + 3] = 255;
        }
      }
      return img;
    },
  },

  invert: {
    id: 'invert', name: 'Invert', category: 'modifier',
    color: 'hsl(300 100% 60%)',
    inputs: ['in'], outputs: ['out'],
    params: [
      { id: 'mix', label: 'Mix', min: 0, max: 1, default: 1, step: 0.01 },
    ],
    compute: (w, h, params, inputs) => {
      const img = createImageData(w, h);
      const d = img.data;
      const input = inputs.in;
      const mix = params.mix ?? 1;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          for (let c = 0; c < 3; c++) {
            const orig = input ? input.data[idx + c] : 0;
            const inv = 255 - orig;
            d[idx + c] = Math.round(orig * (1 - mix) + inv * mix);
          }
          d[idx + 3] = 255;
        }
      }
      return img;
    },
  },

  blend: {
    id: 'blend', name: 'Blend', category: 'modifier',
    color: 'hsl(300 100% 60%)',
    inputs: ['a', 'b'], outputs: ['out'],
    params: [
      { id: 'mode', label: 'Mode', min: 0, max: 3, default: 0, step: 1 },
      { id: 'opacity', label: 'Mix', min: 0, max: 1, default: 0.5, step: 0.01 },
    ],
    compute: (w, h, params, inputs) => {
      const img = createImageData(w, h);
      const d = img.data;
      const a = inputs.a;
      const b = inputs.b;
      const mode = Math.round(params.mode ?? 0);
      const opacity = params.opacity ?? 0.5;
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
            else result = 1 - (1 - va) * (1 - vb); // Screen
            d[idx + c] = Math.min(255, Math.max(0, Math.round(result * 255)));
          }
          d[idx + 3] = 255;
        }
      }
      return img;
    },
  },

  output: {
    id: 'output', name: 'Output', category: 'output',
    color: 'hsl(45 100% 55%)',
    inputs: ['in'], outputs: [],
    params: [],
    compute: (_w, _h, _params, inputs) => {
      if (inputs.in) return inputs.in;
      const img = createImageData(_w, _h);
      return img;
    },
  },
};

export const MODULE_CATEGORIES = {
  generator: Object.values(MODULES).filter(m => m.category === 'generator'),
  modifier: Object.values(MODULES).filter(m => m.category === 'modifier'),
  output: Object.values(MODULES).filter(m => m.category === 'output'),
};
