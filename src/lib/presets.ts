import type { Node, Edge } from '@xyflow/react';
import { MODULES } from './modules';

export interface Preset {
  id: string;
  name: string;
  description: string;
  nodes: Node[];
  edges: Edge[];
}

function makeNode(id: string, moduleType: string, x: number, y: number, params?: Record<string, number>): Node {
  const def = MODULES[moduleType];
  const defaultParams: Record<string, number> = {};
  def.params.forEach(p => { defaultParams[p.id] = p.default; });
  return {
    id,
    type: 'module',
    position: { x, y },
    data: { moduleType, params: { ...defaultParams, ...params }, label: def.name },
  };
}

function makeEdge(id: string, source: string, target: string, sourceHandle = 'out', targetHandle = 'in'): Edge {
  return { id, source, target, sourceHandle, targetHandle, animated: true };
}

export const PRESETS: Preset[] = [
  {
    id: 'default',
    name: 'Plasma Cloud',
    description: 'Classic Perlin noise through a plasma color palette',
    nodes: [
      makeNode('p-1', 'perlin', 50, 180, { frequency: 4, octaves: 4, persistence: 0.5, seed: 42 }),
      makeNode('p-2', 'colorMap', 340, 180, { palette: 4, contrast: 1 }),
      makeNode('p-3', 'output', 600, 200),
    ],
    edges: [makeEdge('pe-1', 'p-1', 'p-2'), makeEdge('pe-2', 'p-2', 'p-3')],
  },
  {
    id: 'crystal',
    name: 'Crystal Lattice',
    description: 'Voronoi cells with ice coloring and level adjustments',
    nodes: [
      makeNode('p-1', 'voronoi', 50, 150, { scale: 8, jitter: 0.9, mode: 1, seed: 13 }),
      makeNode('p-2', 'colorMap', 300, 100, { palette: 7, contrast: 1.5 }),
      makeNode('p-3', 'levels', 300, 300, { brightness: 0.1, contrast: 1.3, gamma: 0.8 }),
      makeNode('p-4', 'blend', 550, 200, { mode: 3, opacity: 0.5 }),
      makeNode('p-5', 'output', 800, 200),
    ],
    edges: [
      makeEdge('pe-1', 'p-1', 'p-2'),
      makeEdge('pe-2', 'p-1', 'p-3'),
      makeEdge('pe-3', 'p-2', 'p-4', 'out', 'a'),
      makeEdge('pe-4', 'p-3', 'p-4', 'out', 'b'),
      makeEdge('pe-5', 'p-4', 'p-5'),
    ],
  },
  {
    id: 'camo',
    name: 'Digital Camo',
    description: 'Two noise sources blended through forest palette',
    nodes: [
      makeNode('p-1', 'perlin', 50, 100, { frequency: 3, octaves: 3, persistence: 0.4, seed: 5 }),
      makeNode('p-2', 'voronoi', 50, 350, { scale: 5, jitter: 0.8, mode: 0, seed: 22 }),
      makeNode('p-3', 'blend', 320, 200, { mode: 0, opacity: 0.6 }),
      makeNode('p-4', 'posterize', 540, 100, { levels: 5 }),
      makeNode('p-5', 'colorMap', 540, 300, { palette: 3, contrast: 1.2 }),
      makeNode('p-6', 'output', 780, 200),
    ],
    edges: [
      makeEdge('pe-1', 'p-1', 'p-3', 'out', 'a'),
      makeEdge('pe-2', 'p-2', 'p-3', 'out', 'b'),
      makeEdge('pe-3', 'p-3', 'p-4'),
      makeEdge('pe-4', 'p-4', 'p-5'),
      makeEdge('pe-5', 'p-5', 'p-6'),
    ],
  },
  {
    id: 'marble',
    name: 'Marble Veins',
    description: 'Simplex noise warped through domain distortion',
    nodes: [
      makeNode('p-1', 'simplex', 50, 180, { frequency: 2, octaves: 6, persistence: 0.6, seed: 33 }),
      makeNode('p-2', 'domainWarp', 300, 180, { strength: 0.15, frequency: 4, seed: 10 }),
      makeNode('p-3', 'levels', 520, 100, { brightness: 0.05, contrast: 1.8, gamma: 0.7 }),
      makeNode('p-4', 'colorMap', 520, 300, { palette: 1, contrast: 0.8 }),
      makeNode('p-5', 'output', 780, 200),
    ],
    edges: [
      makeEdge('pe-1', 'p-1', 'p-2'),
      makeEdge('pe-2', 'p-2', 'p-3'),
      makeEdge('pe-3', 'p-3', 'p-4'),
      makeEdge('pe-4', 'p-4', 'p-5'),
    ],
  },
  {
    id: 'lava',
    name: 'Lava Flow',
    description: 'Ridged noise with fire palette and vignette',
    nodes: [
      makeNode('p-1', 'ridged', 50, 180, { frequency: 3, octaves: 5, lacunarity: 2.5, persistence: 0.6, seed: 77 }),
      makeNode('p-2', 'colorMap', 300, 120, { palette: 0, contrast: 1.3, shift: 0.1 }),
      makeNode('p-3', 'filmGrain', 520, 120, { intensity: 0.08, seed: 5 }),
      makeNode('p-4', 'vignette', 520, 320, { strength: 0.8, radius: 0.6 }),
      makeNode('p-5', 'output', 780, 200),
    ],
    edges: [
      makeEdge('pe-1', 'p-1', 'p-2'),
      makeEdge('pe-2', 'p-2', 'p-3'),
      makeEdge('pe-3', 'p-3', 'p-4'),
      makeEdge('pe-4', 'p-4', 'p-5'),
    ],
  },
  {
    id: 'retro',
    name: 'Retro Circuit',
    description: 'Checker through kaleidoscope with neon colors and scanlines',
    nodes: [
      makeNode('p-1', 'checker', 50, 180, { scale: 12 }),
      makeNode('p-2', 'kaleidoscope', 280, 180, { segments: 8, rotation: 0.3 }),
      makeNode('p-3', 'colorMap', 500, 120, { palette: 2, contrast: 1 }),
      makeNode('p-4', 'scanlines', 500, 320, { spacing: 3, intensity: 0.2 }),
      makeNode('p-5', 'output', 740, 200),
    ],
    edges: [
      makeEdge('pe-1', 'p-1', 'p-2'),
      makeEdge('pe-2', 'p-2', 'p-3'),
      makeEdge('pe-3', 'p-3', 'p-4'),
      makeEdge('pe-4', 'p-4', 'p-5'),
    ],
  },
  {
    id: 'fractalDream',
    name: 'Fractal Dreams',
    description: 'Mandelbrot fractal with cyberpunk colors',
    nodes: [
      makeNode('p-1', 'fractal', 50, 180, { zoom: 1.5, centerX: -0.75, centerY: 0.1, iterations: 80 }),
      makeNode('p-2', 'colorMap', 340, 120, { palette: 9, contrast: 0.7 }),
      makeNode('p-3', 'chromaticSplit', 340, 320, { offset: 2, angle: 45 }),
      makeNode('p-4', 'output', 600, 200),
    ],
    edges: [
      makeEdge('pe-1', 'p-1', 'p-2'),
      makeEdge('pe-2', 'p-2', 'p-3'),
      makeEdge('pe-3', 'p-3', 'p-4'),
    ],
  },
  {
    id: 'organic',
    name: 'Organic Cells',
    description: 'Layered voronoi with domain warp for organic textures',
    nodes: [
      makeNode('p-1', 'voronoi', 50, 100, { scale: 4, jitter: 1, mode: 0, seed: 42 }),
      makeNode('p-2', 'voronoi', 50, 350, { scale: 12, jitter: 0.8, mode: 1, seed: 99 }),
      makeNode('p-3', 'blend', 300, 200, { mode: 1, opacity: 0.5 }),
      makeNode('p-4', 'domainWarp', 520, 200, { strength: 0.08, frequency: 5, seed: 3 }),
      makeNode('p-5', 'colorMap', 740, 200, { palette: 11, contrast: 1.2 }),
      makeNode('p-6', 'output', 960, 200),
    ],
    edges: [
      makeEdge('pe-1', 'p-1', 'p-3', 'out', 'a'),
      makeEdge('pe-2', 'p-2', 'p-3', 'out', 'b'),
      makeEdge('pe-3', 'p-3', 'p-4'),
      makeEdge('pe-4', 'p-4', 'p-5'),
      makeEdge('pe-5', 'p-5', 'p-6'),
    ],
  },
];
