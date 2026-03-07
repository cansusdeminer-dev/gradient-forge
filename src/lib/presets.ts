import type { Node, Edge } from '@xyflow/react';
import { MODULES } from './modules';

export interface Preset {
  id: string;
  name: string;
  description: string;
  category: '2d' | '3d';
  nodes: Node[];
  edges: Edge[];
}

function makeNode(id: string, moduleType: string, x: number, y: number, params?: Record<string, number>): Node {
  const def = MODULES[moduleType];
  if (!def) {
    return { id, type: 'module', position: { x, y }, data: { moduleType, params: params || {}, label: moduleType } };
  }
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
  // ══════════════════════════════════════════════════
  //  2D PRESETS
  // ══════════════════════════════════════════════════
  {
    id: 'default',
    name: 'Plasma Cloud',
    category: '2d',
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
    category: '2d',
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
    category: '2d',
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
    category: '2d',
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
    category: '2d',
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
    category: '2d',
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
    category: '2d',
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
    category: '2d',
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
  {
    id: 'woodFloor',
    name: 'Wood Floor',
    category: '2d',
    description: 'Procedural wood grain with warm coloring',
    nodes: [
      makeNode('p-1', 'wood', 50, 180, { rings: 12, distortion: 0.4, grainFreq: 20, seed: 7 }),
      makeNode('p-2', 'colorMap', 300, 180, { palette: 14, contrast: 1.2 }),
      makeNode('p-3', 'vignette', 520, 180, { strength: 0.3, radius: 0.9 }),
      makeNode('p-4', 'output', 740, 180),
    ],
    edges: [
      makeEdge('pe-1', 'p-1', 'p-2'),
      makeEdge('pe-2', 'p-2', 'p-3'),
      makeEdge('pe-3', 'p-3', 'p-4'),
    ],
  },
  {
    id: 'deepOcean',
    name: 'Deep Ocean',
    category: '2d',
    description: 'Caustics with teal palette and bloom',
    nodes: [
      makeNode('p-1', 'caustics', 50, 180, { scale: 6, speed: 1.2, intensity: 2.5, seed: 88 }),
      makeNode('p-2', 'colorMap', 300, 120, { palette: 15, contrast: 1.3 }),
      makeNode('p-3', 'bloom', 520, 180, { threshold: 0.5, intensity: 0.7, radius: 8 }),
      makeNode('p-4', 'output', 740, 180),
    ],
    edges: [
      makeEdge('pe-1', 'p-1', 'p-2'),
      makeEdge('pe-2', 'p-2', 'p-3'),
      makeEdge('pe-3', 'p-3', 'p-4'),
    ],
  },
  {
    id: 'retroWave',
    name: 'Synthwave',
    category: '2d',
    description: 'Gradient horizon with scanlines and neon palette',
    nodes: [
      makeNode('p-1', 'gradient', 50, 100, { angle: 90, type: 0, repeat: 1 }),
      makeNode('p-2', 'sineWaves', 50, 350, { freqX: 1, freqY: 15, phase: 0.5, mode: 2 }),
      makeNode('p-3', 'blend', 300, 200, { mode: 2, opacity: 0.3 }),
      makeNode('p-4', 'colorMap', 520, 200, { palette: 12, contrast: 1.5 }),
      makeNode('p-5', 'scanlines', 740, 200, { spacing: 3, intensity: 0.15 }),
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
  {
    id: 'reactionDiff',
    name: 'Bio Growth',
    category: '2d',
    description: 'Reaction-diffusion simulation with emerald palette',
    nodes: [
      makeNode('p-1', 'reactionDiffusion', 50, 180, { feed: 0.055, kill: 0.062, iterations: 2000 }),
      makeNode('p-2', 'colorMap', 340, 180, { palette: 18, contrast: 1.8 }),
      makeNode('p-3', 'bloom', 560, 180, { threshold: 0.4, intensity: 0.4, radius: 4 }),
      makeNode('p-4', 'output', 780, 180),
    ],
    edges: [
      makeEdge('pe-1', 'p-1', 'p-2'),
      makeEdge('pe-2', 'p-2', 'p-3'),
      makeEdge('pe-3', 'p-3', 'p-4'),
    ],
  },
  {
    id: 'spiral',
    name: 'Hypnotic Spiral',
    category: '2d',
    description: 'Spiral pattern with chromatic split and duotone',
    nodes: [
      makeNode('p-1', 'spiral', 50, 180, { arms: 5, tightness: 8, thickness: 0.12 }),
      makeNode('p-2', 'twirl', 280, 180, { strength: 2, radius: 0.8 }),
      makeNode('p-3', 'duotone', 500, 120, { hue1: 280, hue2: 50, saturation: 0.9 }),
      makeNode('p-4', 'chromaticSplit', 500, 320, { offset: 4, angle: 0 }),
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
    id: 'terrain',
    name: 'Terrain Map',
    category: '2d',
    description: 'Multi-octave noise with erosion and topographic coloring',
    nodes: [
      makeNode('p-1', 'perlin', 50, 180, { frequency: 3, octaves: 8, lacunarity: 2, persistence: 0.55, seed: 101 }),
      makeNode('p-2', 'erosion', 300, 180, { drops: 5000, erosionRate: 0.15, deposition: 0.08, seed: 42 }),
      makeNode('p-3', 'colorMap', 540, 180, { palette: 3, contrast: 1, shift: 0.1 }),
      makeNode('p-4', 'output', 760, 180),
    ],
    edges: [
      makeEdge('pe-1', 'p-1', 'p-2'),
      makeEdge('pe-2', 'p-2', 'p-3'),
      makeEdge('pe-3', 'p-3', 'p-4'),
    ],
  },
  {
    id: 'stainedGlass',
    name: 'Stained Glass',
    category: '2d',
    description: 'Voronoi with posterized neon colors and glow',
    nodes: [
      makeNode('p-1', 'voronoi', 50, 180, { scale: 6, jitter: 1, mode: 4, seed: 55 }),
      makeNode('p-2', 'colorMap', 280, 180, { palette: 9, contrast: 0.8 }),
      makeNode('p-3', 'voronoi', 50, 380, { scale: 6, jitter: 1, mode: 1, seed: 55 }),
      makeNode('p-4', 'threshold', 280, 380, { threshold: 0.15, softness: 0.05 }),
      makeNode('p-5', 'blend', 500, 250, { mode: 1, opacity: 1 }),
      makeNode('p-6', 'bloom', 720, 250, { threshold: 0.3, intensity: 0.5, radius: 4 }),
      makeNode('p-7', 'output', 940, 250),
    ],
    edges: [
      makeEdge('pe-1', 'p-1', 'p-2'),
      makeEdge('pe-2', 'p-2', 'p-5', 'out', 'a'),
      makeEdge('pe-3', 'p-3', 'p-4'),
      makeEdge('pe-4', 'p-4', 'p-5', 'out', 'b'),
      makeEdge('pe-5', 'p-5', 'p-6'),
      makeEdge('pe-6', 'p-6', 'p-7'),
    ],
  },
  {
    id: 'fabric',
    name: 'Fabric Weave',
    category: '2d',
    description: 'Weave pattern with sandstone coloring',
    nodes: [
      makeNode('p-1', 'weave', 50, 180, { scale: 10, width: 0.55, gap: 0.04 }),
      makeNode('p-2', 'colorMap', 280, 180, { palette: 19, contrast: 1 }),
      makeNode('p-3', 'filmGrain', 500, 180, { intensity: 0.06, seed: 11 }),
      makeNode('p-4', 'output', 720, 180),
    ],
    edges: [
      makeEdge('pe-1', 'p-1', 'p-2'),
      makeEdge('pe-2', 'p-2', 'p-3'),
      makeEdge('pe-3', 'p-3', 'p-4'),
    ],
  },

  // ══════════════════════════════════════════════════
  //  3D PRESETS
  // ══════════════════════════════════════════════════
  {
    id: '3d-alien-egg',
    name: '🥚 Alien Egg',
    category: '3d',
    description: 'Smooth union of sphere + capsule with noise displacement',
    nodes: [
      makeNode('p-1', 'sdfSphere', 50, 100, { radius: 0.6, cx: 0, cy: 0.2, cz: 0 }),
      makeNode('p-2', 'sdfCapsule', 50, 350, { height: 0.5, radius: 0.4 }),
      makeNode('p-3', 'sdfSmoothUnion', 300, 200, { smoothness: 0.4 }),
      makeNode('p-4', 'sdfDisplace', 520, 200, { strength: 0.08, frequency: 6 }),
      makeNode('p-5', 'extractMesh', 740, 100, { resolution: 40 }),
      makeNode('p-6', 'pbrMaterial', 740, 350, { r: 140, g: 200, b: 160, roughness: 0.3, metalness: 0.1 }),
      makeNode('p-7', 'output3D', 960, 200),
    ],
    edges: [
      makeEdge('pe-1', 'p-1', 'p-3', 'out', 'a'),
      makeEdge('pe-2', 'p-2', 'p-3', 'out', 'b'),
      makeEdge('pe-3', 'p-3', 'p-4'),
      makeEdge('pe-4', 'p-4', 'p-5', 'out', 'sdf'),
      makeEdge('pe-5', 'p-5', 'p-7', 'out', 'mesh'),
      makeEdge('pe-6', 'p-6', 'p-7', 'out', 'material'),
    ],
  },
  {
    id: '3d-twisted-torus',
    name: '🌀 Twisted Torus',
    category: '3d',
    description: 'Torus with twist deformation and metallic material',
    nodes: [
      makeNode('p-1', 'sdfTorus', 50, 200, { major: 0.7, minor: 0.2 }),
      makeNode('p-2', 'sdfTwist', 280, 200, { twist: 3 }),
      makeNode('p-3', 'extractMesh', 500, 100, { resolution: 40 }),
      makeNode('p-4', 'metalMaterial', 500, 350, { r: 255, g: 180, b: 50, roughness: 0.15 }),
      makeNode('p-5', 'output3D', 720, 200),
    ],
    edges: [
      makeEdge('pe-1', 'p-1', 'p-2'),
      makeEdge('pe-2', 'p-2', 'p-3', 'out', 'sdf'),
      makeEdge('pe-3', 'p-3', 'p-5', 'out', 'mesh'),
      makeEdge('pe-4', 'p-4', 'p-5', 'out', 'material'),
    ],
  },
  {
    id: '3d-menger',
    name: '🧊 Menger Sponge',
    category: '3d',
    description: 'Recursive fractal geometry — the Menger sponge',
    nodes: [
      makeNode('p-1', 'sdfMenger', 50, 200, { iterations: 3 }),
      makeNode('p-2', 'sdfScale', 280, 200, { scale: 0.8 }),
      makeNode('p-3', 'extractMesh', 500, 100, { resolution: 48 }),
      makeNode('p-4', 'pbrMaterial', 500, 350, { r: 200, g: 200, b: 210, roughness: 0.4, metalness: 0.2 }),
      makeNode('p-5', 'output3D', 720, 200),
    ],
    edges: [
      makeEdge('pe-1', 'p-1', 'p-2'),
      makeEdge('pe-2', 'p-2', 'p-3', 'out', 'sdf'),
      makeEdge('pe-3', 'p-3', 'p-5', 'out', 'mesh'),
      makeEdge('pe-4', 'p-4', 'p-5', 'out', 'material'),
    ],
  },
  {
    id: '3d-gyroid',
    name: '🔬 Gyroid Surface',
    category: '3d',
    description: 'Triply periodic minimal surface — organic lattice',
    nodes: [
      makeNode('p-1', 'sdfGyroid', 50, 200, { scale: 6, thickness: 0.2 }),
      makeNode('p-2', 'sdfIntersect', 280, 200),
      makeNode('p-3', 'sdfSphere', 50, 400, { radius: 1.2 }),
      makeNode('p-4', 'extractMesh', 500, 100, { resolution: 48 }),
      makeNode('p-5', 'glassMaterial', 500, 350, { r: 100, g: 220, b: 255, roughness: 0.08 }),
      makeNode('p-6', 'output3D', 720, 200),
    ],
    edges: [
      makeEdge('pe-1', 'p-1', 'p-2', 'out', 'a'),
      makeEdge('pe-2', 'p-3', 'p-2', 'out', 'b'),
      makeEdge('pe-3', 'p-2', 'p-4', 'out', 'sdf'),
      makeEdge('pe-4', 'p-4', 'p-6', 'out', 'mesh'),
      makeEdge('pe-5', 'p-5', 'p-6', 'out', 'material'),
    ],
  },
  {
    id: '3d-csg-sculpture',
    name: '🗿 CSG Sculpture',
    category: '3d',
    description: 'Sphere minus boxes — constructive solid geometry',
    nodes: [
      makeNode('p-1', 'sdfSphere', 50, 80, { radius: 0.9 }),
      makeNode('p-2', 'sdfBox', 50, 250, { width: 0.4, height: 1.5, depth: 0.4, round: 0.02 }),
      makeNode('p-3', 'sdfCylinder', 50, 420, { radius: 0.35, height: 1.5 }),
      makeNode('p-4', 'sdfSmoothSubtract', 300, 160, { smoothness: 0.1 }),
      makeNode('p-5', 'sdfSmoothSubtract', 300, 340, { smoothness: 0.1 }),
      makeNode('p-6', 'sdfRotate', 520, 250, { rx: 0, ry: 45, rz: 0 }),
      makeNode('p-7', 'extractMesh', 740, 150, { resolution: 44 }),
      makeNode('p-8', 'metalMaterial', 740, 400, { r: 240, g: 230, b: 210, roughness: 0.1 }),
      makeNode('p-9', 'output3D', 960, 250),
    ],
    edges: [
      makeEdge('pe-1', 'p-1', 'p-4', 'out', 'a'),
      makeEdge('pe-2', 'p-2', 'p-4', 'out', 'b'),
      makeEdge('pe-3', 'p-4', 'p-5', 'out', 'a'),
      makeEdge('pe-4', 'p-3', 'p-5', 'out', 'b'),
      makeEdge('pe-5', 'p-5', 'p-6'),
      makeEdge('pe-6', 'p-6', 'p-7', 'out', 'sdf'),
      makeEdge('pe-7', 'p-7', 'p-9', 'out', 'mesh'),
      makeEdge('pe-8', 'p-8', 'p-9', 'out', 'material'),
    ],
  },
  {
    id: '3d-shell',
    name: '🐚 Shell Form',
    category: '3d',
    description: 'Onion-shelled sphere with bend deformation',
    nodes: [
      makeNode('p-1', 'sdfSphere', 50, 200, { radius: 0.8 }),
      makeNode('p-2', 'sdfOnion', 280, 200, { thickness: 0.08 }),
      makeNode('p-3', 'sdfBend', 500, 200, { bend: 1.5 }),
      makeNode('p-4', 'extractMesh', 720, 100, { resolution: 40 }),
      makeNode('p-5', 'emissiveMaterial', 720, 350, { r: 255, g: 80, b: 200, intensity: 0.8 }),
      makeNode('p-6', 'output3D', 940, 200),
    ],
    edges: [
      makeEdge('pe-1', 'p-1', 'p-2'),
      makeEdge('pe-2', 'p-2', 'p-3'),
      makeEdge('pe-3', 'p-3', 'p-4', 'out', 'sdf'),
      makeEdge('pe-4', 'p-4', 'p-6', 'out', 'mesh'),
      makeEdge('pe-5', 'p-5', 'p-6', 'out', 'material'),
    ],
  },
  {
    id: '3d-terrain',
    name: '⛰️ 3D Terrain',
    category: '3d',
    description: 'Heightmap from noise converted to 3D mesh',
    nodes: [
      makeNode('p-1', 'perlin', 50, 100, { frequency: 3, octaves: 6, persistence: 0.5, seed: 42 }),
      makeNode('p-2', 'erosion', 300, 100, { drops: 3000, erosionRate: 0.12, deposition: 0.06, seed: 42 }),
      makeNode('p-3', 'heightToMesh', 520, 50, { heightScale: 0.6, resolution: 80 }),
      makeNode('p-4', 'colorMap', 300, 350, { palette: 3, contrast: 1 }),
      makeNode('p-5', 'pbrMaterial', 520, 350, { r: 120, g: 160, b: 80, roughness: 0.8, metalness: 0 }),
      makeNode('p-6', 'output3D', 740, 200),
    ],
    edges: [
      makeEdge('pe-1', 'p-1', 'p-2'),
      makeEdge('pe-2', 'p-2', 'p-3'),
      makeEdge('pe-3', 'p-3', 'p-6', 'out', 'mesh'),
      makeEdge('pe-4', 'p-5', 'p-6', 'out', 'material'),
    ],
  },
  {
    id: '3d-knot',
    name: '🪢 Torus Knot',
    category: '3d',
    description: 'Mathematical torus knot with gem material',
    nodes: [
      makeNode('p-1', 'sdfTorusKnot', 50, 200, { major: 0.6, minor: 0.25, p: 2, q: 3 }),
      makeNode('p-2', 'extractMesh', 300, 100, { resolution: 48 }),
      makeNode('p-3', 'gemMaterial', 300, 350, { hue: 280, saturation: 0.9 }),
      makeNode('p-4', 'output3D', 520, 200),
    ],
    edges: [
      makeEdge('pe-1', 'p-1', 'p-2', 'out', 'sdf'),
      makeEdge('pe-2', 'p-2', 'p-4', 'out', 'mesh'),
      makeEdge('pe-3', 'p-3', 'p-4', 'out', 'material'),
    ],
  },
  {
    id: '3d-crystal-cluster',
    name: '💎 Crystal Cluster',
    category: '3d',
    description: 'Repeated octahedrons forming a crystal cluster',
    nodes: [
      makeNode('p-1', 'sdfOctahedron', 50, 200, { size: 0.35 }),
      makeNode('p-2', 'sdfRepeatLimited', 280, 200, { period: 0.9, countX: 2, countY: 1, countZ: 2 }),
      makeNode('p-3', 'sdfRotate', 500, 200, { rx: 15, ry: 30, rz: 0 }),
      makeNode('p-4', 'extractMesh', 720, 100, { resolution: 48 }),
      makeNode('p-5', 'gemMaterial', 720, 350, { hue: 180, saturation: 0.85 }),
      makeNode('p-6', 'output3D', 940, 200),
    ],
    edges: [
      makeEdge('pe-1', 'p-1', 'p-2'),
      makeEdge('pe-2', 'p-2', 'p-3'),
      makeEdge('pe-3', 'p-3', 'p-4', 'out', 'sdf'),
      makeEdge('pe-4', 'p-4', 'p-6', 'out', 'mesh'),
      makeEdge('pe-5', 'p-5', 'p-6', 'out', 'material'),
    ],
  },
  {
    id: '3d-morphing',
    name: '🔄 Shape Morph',
    category: '3d',
    description: 'Smooth morph between sphere and box',
    nodes: [
      makeNode('p-1', 'sdfSphere', 50, 100, { radius: 0.7 }),
      makeNode('p-2', 'sdfBox', 50, 350, { width: 0.5, height: 0.5, depth: 0.5, round: 0.05 }),
      makeNode('p-3', 'sdfMorph', 300, 200, { mix: 0.5 }),
      makeNode('p-4', 'sdfTwist', 520, 200, { twist: 1.5 }),
      makeNode('p-5', 'extractMesh', 740, 100, { resolution: 40 }),
      makeNode('p-6', 'pbrMaterial', 740, 350, { r: 255, g: 100, b: 50, roughness: 0.35, metalness: 0.5 }),
      makeNode('p-7', 'output3D', 960, 200),
    ],
    edges: [
      makeEdge('pe-1', 'p-1', 'p-3', 'out', 'a'),
      makeEdge('pe-2', 'p-2', 'p-3', 'out', 'b'),
      makeEdge('pe-3', 'p-3', 'p-4'),
      makeEdge('pe-4', 'p-4', 'p-5', 'out', 'sdf'),
      makeEdge('pe-5', 'p-5', 'p-7', 'out', 'mesh'),
      makeEdge('pe-6', 'p-6', 'p-7', 'out', 'material'),
    ],
  },
  {
    id: '3d-schwarz',
    name: '🧬 Schwarz Surface',
    category: '3d',
    description: 'Schwarz P minimal surface clipped to a sphere',
    nodes: [
      makeNode('p-1', 'sdfSchwarzP', 50, 200, { scale: 5, thickness: 0.4 }),
      makeNode('p-2', 'sdfSphere', 50, 400, { radius: 1.3 }),
      makeNode('p-3', 'sdfIntersect', 300, 280),
      makeNode('p-4', 'extractMesh', 520, 100, { resolution: 48 }),
      makeNode('p-5', 'metalMaterial', 520, 400, { r: 200, g: 180, b: 255, roughness: 0.2 }),
      makeNode('p-6', 'output3D', 740, 250),
    ],
    edges: [
      makeEdge('pe-1', 'p-1', 'p-3', 'out', 'a'),
      makeEdge('pe-2', 'p-2', 'p-3', 'out', 'b'),
      makeEdge('pe-3', 'p-3', 'p-4', 'out', 'sdf'),
      makeEdge('pe-4', 'p-4', 'p-6', 'out', 'mesh'),
      makeEdge('pe-5', 'p-5', 'p-6', 'out', 'material'),
    ],
  },
  {
    id: '3d-alien-pillar',
    name: '🏛️ Alien Pillar',
    category: '3d',
    description: 'Elongated cylinder with twist and shell operation',
    nodes: [
      makeNode('p-1', 'sdfCylinder', 50, 200, { radius: 0.3, height: 0.8 }),
      makeNode('p-2', 'sdfElongate', 280, 200, { ex: 0, ey: 0.5, ez: 0 }),
      makeNode('p-3', 'sdfTwist', 500, 200, { twist: 2 }),
      makeNode('p-4', 'sdfOnion', 720, 200, { thickness: 0.04 }),
      makeNode('p-5', 'extractMesh', 940, 100, { resolution: 44 }),
      makeNode('p-6', 'emissiveMaterial', 940, 350, { r: 50, g: 200, b: 255, intensity: 1.2 }),
      makeNode('p-7', 'output3D', 1160, 200),
    ],
    edges: [
      makeEdge('pe-1', 'p-1', 'p-2'),
      makeEdge('pe-2', 'p-2', 'p-3'),
      makeEdge('pe-3', 'p-3', 'p-4'),
      makeEdge('pe-4', 'p-4', 'p-5', 'out', 'sdf'),
      makeEdge('pe-5', 'p-5', 'p-7', 'out', 'mesh'),
      makeEdge('pe-6', 'p-6', 'p-7', 'out', 'material'),
    ],
  },
  {
    id: '3d-gem',
    name: '💍 Cut Gem',
    category: '3d',
    description: 'Octahedron intersected with box for gem cut effect',
    nodes: [
      makeNode('p-1', 'sdfOctahedron', 50, 100, { size: 0.9 }),
      makeNode('p-2', 'sdfBox', 50, 350, { width: 0.7, height: 0.4, depth: 0.7, round: 0.02 }),
      makeNode('p-3', 'sdfSmoothIntersect', 300, 200, { smoothness: 0.05 }),
      makeNode('p-4', 'sdfRotate', 520, 200, { rx: 0, ry: 22, rz: 0 }),
      makeNode('p-5', 'extractMesh', 740, 100, { resolution: 40 }),
      makeNode('p-6', 'gemMaterial', 740, 350, { hue: 120, saturation: 0.95 }),
      makeNode('p-7', 'output3D', 960, 200),
    ],
    edges: [
      makeEdge('pe-1', 'p-1', 'p-3', 'out', 'a'),
      makeEdge('pe-2', 'p-2', 'p-3', 'out', 'b'),
      makeEdge('pe-3', 'p-3', 'p-4'),
      makeEdge('pe-4', 'p-4', 'p-5', 'out', 'sdf'),
      makeEdge('pe-5', 'p-5', 'p-7', 'out', 'mesh'),
      makeEdge('pe-6', 'p-6', 'p-7', 'out', 'material'),
    ],
  },

  // ══════════════════════════════════════════════════
  //  NATURE / FX 2D PRESETS
  // ══════════════════════════════════════════════════

  {
    id: 'ocean-surface',
    name: '🌊 Ocean Surface',
    category: '2d',
    description: 'Realistic wave patterns inspired by Shadertoy seascape shaders',
    nodes: [
      makeNode('p-1', 'oceanWaves', 50, 100, { scale: 6, octaves: 6, choppy: 4, height: 0.7, time: 1, dragMult: 0.38 }),
      makeNode('p-2', 'colorMap', 300, 100, { palette: 7, contrast: 1.5 }),
      makeNode('p-3', 'caustics', 50, 350, { scale: 8, speed: 1, intensity: 1.5, seed: 42 }),
      makeNode('p-4', 'blend', 520, 200, { mode: 2, opacity: 0.2 }),
      makeNode('p-5', 'bloom', 740, 200, { threshold: 0.6, intensity: 0.3, radius: 6 }),
      makeNode('p-6', 'output', 960, 200),
    ],
    edges: [
      makeEdge('pe-1', 'p-1', 'p-2'),
      makeEdge('pe-2', 'p-2', 'p-4', 'out', 'a'),
      makeEdge('pe-3', 'p-3', 'p-4', 'out', 'b'),
      makeEdge('pe-4', 'p-4', 'p-5'),
      makeEdge('pe-5', 'p-5', 'p-6'),
    ],
  },

  {
    id: 'volumetric-clouds',
    name: '☁️ Volumetric Clouds',
    category: '2d',
    description: 'Soft cloud layer with density falloff and sky gradient',
    nodes: [
      makeNode('p-1', 'gradient', 50, 50, { angle: 90, type: 0, repeat: 1 }),
      makeNode('p-2', 'cloudDensity', 50, 300, { frequency: 3, coverage: 0.55, density: 2.5, octaves: 6, sharpness: 0.3, seed: 42 }),
      makeNode('p-3', 'colorMap', 300, 50, { palette: 7, contrast: 0.8 }),
      makeNode('p-4', 'blend', 520, 150, { mode: 2, opacity: 0.8 }),
      makeNode('p-5', 'bloom', 740, 150, { threshold: 0.5, intensity: 0.4, radius: 8 }),
      makeNode('p-6', 'output', 960, 150),
    ],
    edges: [
      makeEdge('pe-1', 'p-1', 'p-3'),
      makeEdge('pe-2', 'p-3', 'p-4', 'out', 'a'),
      makeEdge('pe-3', 'p-2', 'p-4', 'out', 'b'),
      makeEdge('pe-4', 'p-4', 'p-5'),
      makeEdge('pe-5', 'p-5', 'p-6'),
    ],
  },

  {
    id: 'raging-fire',
    name: '🔥 Raging Fire',
    category: '2d',
    description: 'Volumetric fire pattern with gyroid-inspired FBM noise',
    nodes: [
      makeNode('p-1', 'firePattern', 50, 180, { frequency: 5, intensity: 2.5, rise: 2, turbulence: 1, time: 0, seed: 7 }),
      makeNode('p-2', 'bloom', 300, 180, { threshold: 0.3, intensity: 0.8, radius: 6 }),
      makeNode('p-3', 'vignette', 520, 180, { strength: 0.9, radius: 0.5 }),
      makeNode('p-4', 'output', 740, 180),
    ],
    edges: [
      makeEdge('pe-1', 'p-1', 'p-2'),
      makeEdge('pe-2', 'p-2', 'p-3'),
      makeEdge('pe-3', 'p-3', 'p-4'),
    ],
  },

  {
    id: 'smoke-light',
    name: '💨 Smoke & Light',
    category: '2d',
    description: 'Wispy smoke tendrils with volumetric light scattering',
    nodes: [
      makeNode('p-1', 'smokeTendrils', 50, 100, { frequency: 4, density: 2, curl: 1.5, octaves: 6, seed: 33 }),
      makeNode('p-2', 'colorMap', 300, 100, { palette: 16, contrast: 1.5 }),
      makeNode('p-3', 'lensFlare', 50, 350, { sunX: 0.2, sunY: 0.15, intensity: 1.5, rings: 0.3, ghosts: 4 }),
      makeNode('p-4', 'blend', 520, 200, { mode: 2, opacity: 0.6 }),
      makeNode('p-5', 'output', 740, 200),
    ],
    edges: [
      makeEdge('pe-1', 'p-1', 'p-2'),
      makeEdge('pe-2', 'p-2', 'p-4', 'out', 'a'),
      makeEdge('pe-3', 'p-3', 'p-4', 'out', 'b'),
      makeEdge('pe-4', 'p-4', 'p-5'),
    ],
  },

  {
    id: 'aurora-borealis',
    name: '🌌 Aurora Borealis',
    category: '2d',
    description: 'Northern lights with ethereal color bands',
    nodes: [
      makeNode('p-1', 'aurora', 50, 180, { frequency: 5, bands: 4, waviness: 2, brightness: 2, seed: 42 }),
      makeNode('p-2', 'bloom', 300, 180, { threshold: 0.2, intensity: 0.6, radius: 10 }),
      makeNode('p-3', 'filmGrain', 520, 180, { intensity: 0.04, seed: 3 }),
      makeNode('p-4', 'output', 740, 180),
    ],
    edges: [
      makeEdge('pe-1', 'p-1', 'p-2'),
      makeEdge('pe-2', 'p-2', 'p-3'),
      makeEdge('pe-3', 'p-3', 'p-4'),
    ],
  },

  {
    id: 'lightning-storm',
    name: '⚡ Lightning Storm',
    category: '2d',
    description: 'Procedural lightning bolts against a dark sky',
    nodes: [
      makeNode('p-1', 'lightning', 50, 100, { branches: 4, detail: 8, glow: 2.5, seed: 42 }),
      makeNode('p-2', 'cloudDensity', 50, 350, { frequency: 2, coverage: 0.6, density: 1.5, octaves: 5, sharpness: 0.2, seed: 99 }),
      makeNode('p-3', 'colorMap', 300, 350, { palette: 13, contrast: 0.5 }),
      makeNode('p-4', 'blend', 520, 200, { mode: 2, opacity: 0.4 }),
      makeNode('p-5', 'bloom', 740, 200, { threshold: 0.3, intensity: 0.5, radius: 8 }),
      makeNode('p-6', 'output', 960, 200),
    ],
    edges: [
      makeEdge('pe-1', 'p-1', 'p-4', 'out', 'a'),
      makeEdge('pe-2', 'p-2', 'p-3'),
      makeEdge('pe-3', 'p-3', 'p-4', 'out', 'b'),
      makeEdge('pe-4', 'p-4', 'p-5'),
      makeEdge('pe-5', 'p-5', 'p-6'),
    ],
  },

  {
    id: 'deep-nebula',
    name: '✨ Deep Nebula',
    category: '2d',
    description: 'Cosmic gas clouds with starfield overlay',
    nodes: [
      makeNode('p-1', 'nebula', 50, 180, { frequency: 3, colorShift: 0.7, density: 2.5, stars: 0.6, seed: 42 }),
      makeNode('p-2', 'bloom', 300, 180, { threshold: 0.3, intensity: 0.5, radius: 6 }),
      makeNode('p-3', 'vignette', 520, 180, { strength: 0.5, radius: 0.8 }),
      makeNode('p-4', 'output', 740, 180),
    ],
    edges: [
      makeEdge('pe-1', 'p-1', 'p-2'),
      makeEdge('pe-2', 'p-2', 'p-3'),
      makeEdge('pe-3', 'p-3', 'p-4'),
    ],
  },

  {
    id: 'galaxy-spiral',
    name: '🌀 Galaxy Spiral',
    category: '2d',
    description: 'Spiral galaxy with arms, core glow and stars',
    nodes: [
      makeNode('p-1', 'galaxySpiral', 50, 180, { arms: 2, tightness: 4, falloff: 2, brightness: 2.5, seed: 42 }),
      makeNode('p-2', 'bloom', 300, 180, { threshold: 0.2, intensity: 0.6, radius: 8 }),
      makeNode('p-3', 'output', 520, 180),
    ],
    edges: [
      makeEdge('pe-1', 'p-1', 'p-2'),
      makeEdge('pe-2', 'p-2', 'p-3'),
    ],
  },

  {
    id: 'lava-lake',
    name: '🌋 Lava Lake',
    category: '2d',
    description: 'Molten lava with glowing cracks between cooling plates',
    nodes: [
      makeNode('p-1', 'lavaLake', 50, 180, { frequency: 3, crackWidth: 0.12, glow: 1.8, seed: 42 }),
      makeNode('p-2', 'bloom', 300, 180, { threshold: 0.3, intensity: 0.7, radius: 6 }),
      makeNode('p-3', 'filmGrain', 520, 180, { intensity: 0.05, seed: 7 }),
      makeNode('p-4', 'output', 740, 180),
    ],
    edges: [
      makeEdge('pe-1', 'p-1', 'p-2'),
      makeEdge('pe-2', 'p-2', 'p-3'),
      makeEdge('pe-3', 'p-3', 'p-4'),
    ],
  },

  {
    id: 'ice-frost',
    name: '❄️ Ice Frost',
    category: '2d',
    description: 'Crystalline ice patterns with cold palette',
    nodes: [
      makeNode('p-1', 'icePattern', 50, 180, { scale: 8, branches: 6, detail: 5, seed: 42 }),
      makeNode('p-2', 'colorMap', 300, 180, { palette: 15, contrast: 1.5 }),
      makeNode('p-3', 'bloom', 520, 180, { threshold: 0.4, intensity: 0.4, radius: 4 }),
      makeNode('p-4', 'output', 740, 180),
    ],
    edges: [
      makeEdge('pe-1', 'p-1', 'p-2'),
      makeEdge('pe-2', 'p-2', 'p-3'),
      makeEdge('pe-3', 'p-3', 'p-4'),
    ],
  },

  {
    id: 'ripple-pond',
    name: '💧 Ripple Pond',
    category: '2d',
    description: 'Multi-source water ripples with interference',
    nodes: [
      makeNode('p-1', 'rippleWaves', 50, 180, { frequency: 20, decay: 3, cx: 0.3, cy: 0.4, sources: 3, seed: 42 }),
      makeNode('p-2', 'colorMap', 300, 180, { palette: 7, contrast: 1.2 }),
      makeNode('p-3', 'bloom', 520, 180, { threshold: 0.5, intensity: 0.3, radius: 4 }),
      makeNode('p-4', 'output', 740, 180),
    ],
    edges: [
      makeEdge('pe-1', 'p-1', 'p-2'),
      makeEdge('pe-2', 'p-2', 'p-3'),
      makeEdge('pe-3', 'p-3', 'p-4'),
    ],
  },

  {
    id: 'underwater-world',
    name: '🐠 Underwater World',
    category: '2d',
    description: 'Deep ocean with caustics, particles and teal palette',
    nodes: [
      makeNode('p-1', 'caustics', 50, 80, { scale: 5, speed: 0.8, intensity: 2, seed: 42 }),
      makeNode('p-2', 'smokeTendrils', 50, 320, { frequency: 2, density: 1.5, curl: 2, octaves: 5, seed: 77 }),
      makeNode('p-3', 'blend', 300, 180, { mode: 2, opacity: 0.4 }),
      makeNode('p-4', 'colorMap', 520, 180, { palette: 15, contrast: 1.3 }),
      makeNode('p-5', 'vignette', 740, 180, { strength: 0.6, radius: 0.7 }),
      makeNode('p-6', 'output', 960, 180),
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
    id: 'sun-flare',
    name: '☀️ Sun & Flare',
    category: '2d',
    description: 'Dramatic sun with lens flare ghosts and rings',
    nodes: [
      makeNode('p-1', 'lensFlare', 50, 180, { sunX: 0, sunY: 0, intensity: 3, rings: 0.7, ghosts: 8 }),
      makeNode('p-2', 'bloom', 300, 180, { threshold: 0.2, intensity: 0.8, radius: 12 }),
      makeNode('p-3', 'output', 520, 180),
    ],
    edges: [
      makeEdge('pe-1', 'p-1', 'p-2'),
      makeEdge('pe-2', 'p-2', 'p-3'),
    ],
  },

  {
    id: 'alien-skin',
    name: '👽 Alien Skin',
    category: '2d',
    description: 'Organic alien texture with reaction-diffusion and voronoi',
    nodes: [
      makeNode('p-1', 'reactionDiffusion', 50, 100, { feed: 0.04, kill: 0.065, iterations: 2500 }),
      makeNode('p-2', 'voronoi', 50, 350, { scale: 12, jitter: 0.9, mode: 1, seed: 33 }),
      makeNode('p-3', 'blend', 300, 200, { mode: 1, opacity: 0.4 }),
      makeNode('p-4', 'colorMap', 520, 200, { palette: 11, contrast: 1.5 }),
      makeNode('p-5', 'normalMap', 740, 200, { strength: 3 }),
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

  {
    id: 'cyberpunk-city',
    name: '🏙️ Cyberpunk Grid',
    category: '2d',
    description: 'Neon grid cityscape with lens flare and scanlines',
    nodes: [
      makeNode('p-1', 'hexGrid', 50, 80, { scale: 12, lineWidth: 0.06 }),
      makeNode('p-2', 'gradient', 50, 320, { angle: 90, type: 0, repeat: 1 }),
      makeNode('p-3', 'blend', 300, 180, { mode: 1, opacity: 0.7 }),
      makeNode('p-4', 'colorMap', 520, 120, { palette: 12, contrast: 1.5 }),
      makeNode('p-5', 'scanlines', 520, 320, { spacing: 2, intensity: 0.15 }),
      makeNode('p-6', 'bloom', 740, 200, { threshold: 0.4, intensity: 0.5, radius: 4 }),
      makeNode('p-7', 'output', 960, 200),
    ],
    edges: [
      makeEdge('pe-1', 'p-1', 'p-3', 'out', 'a'),
      makeEdge('pe-2', 'p-2', 'p-3', 'out', 'b'),
      makeEdge('pe-3', 'p-3', 'p-4'),
      makeEdge('pe-4', 'p-4', 'p-5'),
      makeEdge('pe-5', 'p-5', 'p-6'),
      makeEdge('pe-6', 'p-6', 'p-7'),
    ],
  },

  // ══════════════════════════════════════════════════
  //  ADVANCED 3D PRESETS
  // ══════════════════════════════════════════════════

  {
    id: '3d-coral-reef',
    name: '🪸 Coral Reef',
    category: '3d',
    description: 'Organic branching coral with noise displacement',
    nodes: [
      makeNode('p-1', 'sdfSphere', 50, 100, { radius: 0.5, cx: 0, cy: -0.2, cz: 0 }),
      makeNode('p-2', 'sdfCylinder', 50, 300, { radius: 0.15, height: 0.6 }),
      makeNode('p-3', 'sdfSmoothUnion', 280, 180, { smoothness: 0.4 }),
      makeNode('p-4', 'sdfDisplace', 500, 180, { strength: 0.15, frequency: 8 }),
      makeNode('p-5', 'sdfRepeatLimited', 720, 180, { period: 1.2, countX: 1, countY: 0, countZ: 1 }),
      makeNode('p-6', 'extractMesh', 940, 80, { resolution: 40 }),
      makeNode('p-7', 'pbrMaterial', 940, 320, { r: 255, g: 120, b: 80, roughness: 0.6, metalness: 0 }),
      makeNode('p-8', 'output3D', 1160, 180),
    ],
    edges: [
      makeEdge('pe-1', 'p-1', 'p-3', 'out', 'a'),
      makeEdge('pe-2', 'p-2', 'p-3', 'out', 'b'),
      makeEdge('pe-3', 'p-3', 'p-4'),
      makeEdge('pe-4', 'p-4', 'p-5'),
      makeEdge('pe-5', 'p-5', 'p-6', 'out', 'sdf'),
      makeEdge('pe-6', 'p-6', 'p-8', 'out', 'mesh'),
      makeEdge('pe-7', 'p-7', 'p-8', 'out', 'material'),
    ],
  },

  {
    id: '3d-volcanic-rock',
    name: '🌋 Volcanic Rock',
    category: '3d',
    description: 'Rough volcanic rock with displacement and dark material',
    nodes: [
      makeNode('p-1', 'sdfSphere', 50, 200, { radius: 0.9 }),
      makeNode('p-2', 'sdfDisplace', 280, 200, { strength: 0.25, frequency: 6 }),
      makeNode('p-3', 'extractMesh', 500, 100, { resolution: 44 }),
      makeNode('p-4', 'pbrMaterial', 500, 350, { r: 50, g: 40, b: 35, roughness: 0.95, metalness: 0 }),
      makeNode('p-5', 'output3D', 720, 200),
    ],
    edges: [
      makeEdge('pe-1', 'p-1', 'p-2'),
      makeEdge('pe-2', 'p-2', 'p-3', 'out', 'sdf'),
      makeEdge('pe-3', 'p-3', 'p-5', 'out', 'mesh'),
      makeEdge('pe-4', 'p-4', 'p-5', 'out', 'material'),
    ],
  },

  {
    id: '3d-ice-crystal',
    name: '🧊 Ice Crystal',
    category: '3d',
    description: 'Elongated octahedron with glass material — frozen shard',
    nodes: [
      makeNode('p-1', 'sdfOctahedron', 50, 200, { size: 0.6 }),
      makeNode('p-2', 'sdfElongate', 280, 200, { ex: 0, ey: 0.8, ez: 0 }),
      makeNode('p-3', 'sdfRotate', 500, 200, { rx: 15, ry: 0, rz: 30 }),
      makeNode('p-4', 'extractMesh', 720, 100, { resolution: 36 }),
      makeNode('p-5', 'glassMaterial', 720, 350, { r: 180, g: 230, b: 255, roughness: 0.02 }),
      makeNode('p-6', 'output3D', 940, 200),
    ],
    edges: [
      makeEdge('pe-1', 'p-1', 'p-2'),
      makeEdge('pe-2', 'p-2', 'p-3'),
      makeEdge('pe-3', 'p-3', 'p-4', 'out', 'sdf'),
      makeEdge('pe-4', 'p-4', 'p-6', 'out', 'mesh'),
      makeEdge('pe-5', 'p-5', 'p-6', 'out', 'material'),
    ],
  },

  {
    id: '3d-abstract-arch',
    name: '🏗️ Abstract Architecture',
    category: '3d',
    description: 'Intersecting cylinders and boxes — architectural abstraction',
    nodes: [
      makeNode('p-1', 'sdfCylinder', 50, 80, { radius: 0.3, height: 1.5 }),
      makeNode('p-2', 'sdfBox', 50, 280, { width: 1.2, height: 0.15, depth: 1.2, round: 0.03 }),
      makeNode('p-3', 'sdfSmoothUnion', 300, 160, { smoothness: 0.08 }),
      makeNode('p-4', 'sdfCylinder', 50, 480, { radius: 0.25, height: 1.2 }),
      makeNode('p-5', 'sdfRotate', 300, 480, { rx: 90, ry: 0, rz: 0 }),
      makeNode('p-6', 'sdfSmoothSubtract', 520, 300, { smoothness: 0.05 }),
      makeNode('p-7', 'extractMesh', 740, 200, { resolution: 44 }),
      makeNode('p-8', 'metalMaterial', 740, 450, { r: 230, g: 220, b: 200, roughness: 0.15 }),
      makeNode('p-9', 'output3D', 960, 300),
    ],
    edges: [
      makeEdge('pe-1', 'p-1', 'p-3', 'out', 'a'),
      makeEdge('pe-2', 'p-2', 'p-3', 'out', 'b'),
      makeEdge('pe-3', 'p-3', 'p-6', 'out', 'a'),
      makeEdge('pe-4', 'p-4', 'p-5'),
      makeEdge('pe-5', 'p-5', 'p-6', 'out', 'b'),
      makeEdge('pe-6', 'p-6', 'p-7', 'out', 'sdf'),
      makeEdge('pe-7', 'p-7', 'p-9', 'out', 'mesh'),
      makeEdge('pe-8', 'p-8', 'p-9', 'out', 'material'),
    ],
  },

  {
    id: '3d-ocean-terrain',
    name: '🌊 Ocean Terrain',
    category: '3d',
    description: 'Wave-based heightmap converted to 3D terrain mesh',
    nodes: [
      makeNode('p-1', 'oceanWaves', 50, 100, { scale: 4, octaves: 5, choppy: 3, height: 0.8, time: 1, dragMult: 0.35 }),
      makeNode('p-2', 'heightToMesh', 300, 100, { heightScale: 0.4, resolution: 80 }),
      makeNode('p-3', 'pbrMaterial', 300, 350, { r: 30, g: 100, b: 180, roughness: 0.15, metalness: 0.1 }),
      makeNode('p-4', 'output3D', 520, 200),
    ],
    edges: [
      makeEdge('pe-1', 'p-1', 'p-2'),
      makeEdge('pe-2', 'p-2', 'p-4', 'out', 'mesh'),
      makeEdge('pe-3', 'p-3', 'p-4', 'out', 'material'),
    ],
  },

  {
    id: '3d-melting-sphere',
    name: '🫠 Melting Sphere',
    category: '3d',
    description: 'Sphere with heavy noise displacement — looks melted',
    nodes: [
      makeNode('p-1', 'sdfSphere', 50, 200, { radius: 0.8 }),
      makeNode('p-2', 'sdfDisplace', 280, 200, { strength: 0.35, frequency: 4 }),
      makeNode('p-3', 'sdfBend', 500, 200, { bend: 0.8 }),
      makeNode('p-4', 'extractMesh', 720, 100, { resolution: 40 }),
      makeNode('p-5', 'emissiveMaterial', 720, 350, { r: 255, g: 50, b: 20, intensity: 1.5 }),
      makeNode('p-6', 'output3D', 940, 200),
    ],
    edges: [
      makeEdge('pe-1', 'p-1', 'p-2'),
      makeEdge('pe-2', 'p-2', 'p-3'),
      makeEdge('pe-3', 'p-3', 'p-4', 'out', 'sdf'),
      makeEdge('pe-4', 'p-4', 'p-6', 'out', 'mesh'),
      makeEdge('pe-5', 'p-5', 'p-6', 'out', 'material'),
    ],
  },

  {
    id: '3d-floating-islands',
    name: '🏝️ Floating Islands',
    category: '3d',
    description: 'Eroded terrain with noise — floating landmass',
    nodes: [
      makeNode('p-1', 'ridged', 50, 100, { frequency: 3, octaves: 6, lacunarity: 2.2, persistence: 0.55, seed: 42 }),
      makeNode('p-2', 'erosion', 300, 100, { drops: 4000, erosionRate: 0.12, deposition: 0.06, seed: 42 }),
      makeNode('p-3', 'heightToMesh', 520, 100, { heightScale: 0.8, resolution: 80 }),
      makeNode('p-4', 'pbrMaterial', 520, 350, { r: 100, g: 140, b: 70, roughness: 0.85, metalness: 0 }),
      makeNode('p-5', 'output3D', 740, 200),
    ],
    edges: [
      makeEdge('pe-1', 'p-1', 'p-2'),
      makeEdge('pe-2', 'p-2', 'p-3'),
      makeEdge('pe-3', 'p-3', 'p-5', 'out', 'mesh'),
      makeEdge('pe-4', 'p-4', 'p-5', 'out', 'material'),
    ],
  },

  {
    id: '3d-totem',
    name: '🗿 Ancient Totem',
    category: '3d',
    description: 'Stacked round cones with displacement — alien artifact',
    nodes: [
      makeNode('p-1', 'sdfRoundCone', 50, 100, { r1: 0.5, r2: 0.3, height: 0.4 }),
      makeNode('p-2', 'sdfRoundCone', 50, 300, { r1: 0.3, r2: 0.15, height: 0.5 }),
      makeNode('p-3', 'sdfTranslate', 280, 300, { tx: 0, ty: 0.5, tz: 0 }),
      makeNode('p-4', 'sdfSmoothUnion', 500, 180, { smoothness: 0.15 }),
      makeNode('p-5', 'sdfDisplace', 720, 180, { strength: 0.06, frequency: 10 }),
      makeNode('p-6', 'extractMesh', 940, 80, { resolution: 40 }),
      makeNode('p-7', 'pbrMaterial', 940, 320, { r: 140, g: 120, b: 90, roughness: 0.9, metalness: 0 }),
      makeNode('p-8', 'output3D', 1160, 180),
    ],
    edges: [
      makeEdge('pe-1', 'p-1', 'p-4', 'out', 'a'),
      makeEdge('pe-2', 'p-2', 'p-3'),
      makeEdge('pe-3', 'p-3', 'p-4', 'out', 'b'),
      makeEdge('pe-4', 'p-4', 'p-5'),
      makeEdge('pe-5', 'p-5', 'p-6', 'out', 'sdf'),
      makeEdge('pe-6', 'p-6', 'p-8', 'out', 'mesh'),
      makeEdge('pe-7', 'p-7', 'p-8', 'out', 'material'),
    ],
  },

  {
    id: '3d-neon-knot',
    name: '💜 Neon Knot',
    category: '3d',
    description: 'Torus knot with emissive glow material',
    nodes: [
      makeNode('p-1', 'sdfTorusKnot', 50, 200, { major: 0.5, minor: 0.12, p: 3, q: 5 }),
      makeNode('p-2', 'extractMesh', 300, 100, { resolution: 48 }),
      makeNode('p-3', 'emissiveMaterial', 300, 350, { r: 180, g: 0, b: 255, intensity: 2 }),
      makeNode('p-4', 'output3D', 520, 200),
    ],
    edges: [
      makeEdge('pe-1', 'p-1', 'p-2', 'out', 'sdf'),
      makeEdge('pe-2', 'p-2', 'p-4', 'out', 'mesh'),
      makeEdge('pe-3', 'p-3', 'p-4', 'out', 'material'),
    ],
  },

  {
    id: '3d-chain-link',
    name: '⛓️ Chain Link',
    category: '3d',
    description: 'Single chain link with metallic finish',
    nodes: [
      makeNode('p-1', 'sdfLink', 50, 200, { length: 0.4, r1: 0.5, r2: 0.12 }),
      makeNode('p-2', 'extractMesh', 280, 100, { resolution: 44 }),
      makeNode('p-3', 'metalMaterial', 280, 350, { r: 200, g: 180, b: 140, roughness: 0.2 }),
      makeNode('p-4', 'output3D', 500, 200),
    ],
    edges: [
      makeEdge('pe-1', 'p-1', 'p-2', 'out', 'sdf'),
      makeEdge('pe-2', 'p-2', 'p-4', 'out', 'mesh'),
      makeEdge('pe-3', 'p-3', 'p-4', 'out', 'material'),
    ],
  },
];
