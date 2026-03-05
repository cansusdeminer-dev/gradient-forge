// Alchemy Studio — Geometry & Material Modules (Whitepaper §6.3, §6.5)

import type { ModuleDef } from './modules';
import type { Resource, SDF3DResource, MeshResource } from './types';
import * as SDF from './sdf';
import { extractMesh, heightmapToMesh } from './meshOps';

// ──── SDF Preview Helper ────
function sdfPreview(w: number, h: number, evaluate: (x: number, y: number, z: number) => number, bounds: number[]): ImageData {
  const img = new ImageData(w, h);
  const d = img.data;
  const range = bounds[3] - bounds[0];
  const mid = bounds[0];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const wx = mid + (x / w) * range, wy = mid + (y / h) * range;
      const dist = evaluate(wx, wy, 0);
      const i = (y * w + x) * 4;
      if (dist < 0) {
        const t = Math.min(1, -dist * 2.5);
        d[i] = 30 + t * 100; d[i + 1] = 80 + t * 130; d[i + 2] = 140 + t * 115;
      } else {
        const t = Math.max(0, 1 - dist * 2);
        d[i] = t * 15; d[i + 1] = t * 35; d[i + 2] = t * 65;
      }
      d[i + 3] = 255;
    }
  }
  return img;
}

const GEO_COLOR = 'hsl(200 100% 50%)';
const MAT_COLOR = 'hsl(30 100% 50%)';
const BOUNDS: [number, number, number, number, number, number] = [-2, -2, -2, 2, 2, 2];

export const GEOMETRY_MODULES: Record<string, ModuleDef> = {

  // ══════════════════════════════════════════════════
  //  SDF PRIMITIVES (Generators)
  // ══════════════════════════════════════════════════

  sdfSphere: {
    id: 'sdfSphere', name: 'SDF Sphere', category: 'geometry', icon: '⬤', color: GEO_COLOR,
    inputs: [], outputs: ['out'],
    params: [
      { id: 'radius', label: 'Radius', min: 0.05, max: 2, default: 0.8, step: 0.01 },
      { id: 'cx', label: 'X', min: -2, max: 2, default: 0, step: 0.01 },
      { id: 'cy', label: 'Y', min: -2, max: 2, default: 0, step: 0.01 },
      { id: 'cz', label: 'Z', min: -2, max: 2, default: 0, step: 0.01 },
    ],
    resourceType: 'sdf3d',
    compute: (w, h, p) => {
      const ev = (x: number, y: number, z: number) => SDF.sdSphere([x - (p.cx ?? 0), y - (p.cy ?? 0), z - (p.cz ?? 0)], p.radius ?? 0.8);
      return sdfPreview(w, h, ev, BOUNDS);
    },
    computeResource: (_w, _h, p): Resource => ({
      type: 'sdf3d',
      evaluate: (x, y, z) => SDF.sdSphere([x - (p.cx ?? 0), y - (p.cy ?? 0), z - (p.cz ?? 0)], p.radius ?? 0.8),
      bounds: BOUNDS,
    }),
  },

  sdfBox: {
    id: 'sdfBox', name: 'SDF Box', category: 'geometry', icon: '▬', color: GEO_COLOR,
    inputs: [], outputs: ['out'],
    params: [
      { id: 'width', label: 'W', min: 0.05, max: 2, default: 0.6, step: 0.01 },
      { id: 'height', label: 'H', min: 0.05, max: 2, default: 0.6, step: 0.01 },
      { id: 'depth', label: 'D', min: 0.05, max: 2, default: 0.6, step: 0.01 },
      { id: 'round', label: 'Round', min: 0, max: 0.3, default: 0, step: 0.005 },
    ],
    resourceType: 'sdf3d',
    compute: (w, h, p) => {
      const ev = (x: number, y: number, z: number) => SDF.opRound(SDF.sdBox([x, y, z], [p.width ?? 0.6, p.height ?? 0.6, p.depth ?? 0.6]), p.round ?? 0);
      return sdfPreview(w, h, ev, BOUNDS);
    },
    computeResource: (_w, _h, p): Resource => ({
      type: 'sdf3d',
      evaluate: (x, y, z) => SDF.opRound(SDF.sdBox([x, y, z], [p.width ?? 0.6, p.height ?? 0.6, p.depth ?? 0.6]), p.round ?? 0),
      bounds: BOUNDS,
    }),
  },

  sdfTorus: {
    id: 'sdfTorus', name: 'SDF Torus', category: 'geometry', icon: '◯', color: GEO_COLOR,
    inputs: [], outputs: ['out'],
    params: [
      { id: 'major', label: 'Major', min: 0.1, max: 2, default: 0.7, step: 0.01 },
      { id: 'minor', label: 'Minor', min: 0.02, max: 0.8, default: 0.25, step: 0.01 },
    ],
    resourceType: 'sdf3d',
    compute: (w, h, p) => sdfPreview(w, h, (x, y, z) => SDF.sdTorus([x, y, z], p.major ?? 0.7, p.minor ?? 0.25), BOUNDS),
    computeResource: (_w, _h, p): Resource => ({
      type: 'sdf3d',
      evaluate: (x, y, z) => SDF.sdTorus([x, y, z], p.major ?? 0.7, p.minor ?? 0.25),
      bounds: BOUNDS,
    }),
  },

  sdfCylinder: {
    id: 'sdfCylinder', name: 'SDF Cylinder', category: 'geometry', icon: '▮', color: GEO_COLOR,
    inputs: [], outputs: ['out'],
    params: [
      { id: 'radius', label: 'Radius', min: 0.05, max: 2, default: 0.5, step: 0.01 },
      { id: 'height', label: 'Height', min: 0.05, max: 3, default: 1, step: 0.01 },
    ],
    resourceType: 'sdf3d',
    compute: (w, h, p) => sdfPreview(w, h, (x, y, z) => SDF.sdCylinder([x, y, z], p.radius ?? 0.5, p.height ?? 1), BOUNDS),
    computeResource: (_w, _h, p): Resource => ({
      type: 'sdf3d',
      evaluate: (x, y, z) => SDF.sdCylinder([x, y, z], p.radius ?? 0.5, p.height ?? 1),
      bounds: BOUNDS,
    }),
  },

  sdfCapsule: {
    id: 'sdfCapsule', name: 'SDF Capsule', category: 'geometry', icon: '⬭', color: GEO_COLOR,
    inputs: [], outputs: ['out'],
    params: [
      { id: 'height', label: 'Height', min: 0.1, max: 3, default: 0.8, step: 0.01 },
      { id: 'radius', label: 'Radius', min: 0.05, max: 1, default: 0.3, step: 0.01 },
    ],
    resourceType: 'sdf3d',
    compute: (w, h, p) => sdfPreview(w, h, (x, y, z) => SDF.sdCapsule([x, y, z], p.height ?? 0.8, p.radius ?? 0.3), BOUNDS),
    computeResource: (_w, _h, p): Resource => ({
      type: 'sdf3d',
      evaluate: (x, y, z) => SDF.sdCapsule([x, y, z], p.height ?? 0.8, p.radius ?? 0.3),
      bounds: BOUNDS,
    }),
  },

  sdfOctahedron: {
    id: 'sdfOctahedron', name: 'SDF Octahedron', category: 'geometry', icon: '◇', color: GEO_COLOR,
    inputs: [], outputs: ['out'],
    params: [{ id: 'size', label: 'Size', min: 0.1, max: 2, default: 0.8, step: 0.01 }],
    resourceType: 'sdf3d',
    compute: (w, h, p) => sdfPreview(w, h, (x, y, z) => SDF.sdOctahedron([x, y, z], p.size ?? 0.8), BOUNDS),
    computeResource: (_w, _h, p): Resource => ({
      type: 'sdf3d',
      evaluate: (x, y, z) => SDF.sdOctahedron([x, y, z], p.size ?? 0.8),
      bounds: BOUNDS,
    }),
  },

  sdfCone: {
    id: 'sdfCone', name: 'SDF Cone', category: 'geometry', icon: '▲', color: GEO_COLOR,
    inputs: [], outputs: ['out'],
    params: [
      { id: 'angle', label: 'Angle', min: 0.1, max: 1.4, default: 0.5, step: 0.01 },
      { id: 'height', label: 'Height', min: 0.1, max: 3, default: 1, step: 0.01 },
    ],
    resourceType: 'sdf3d',
    compute: (w, h, p) => sdfPreview(w, h, (x, y, z) => SDF.sdCone([x, y, z], p.angle ?? 0.5, p.height ?? 1), BOUNDS),
    computeResource: (_w, _h, p): Resource => ({
      type: 'sdf3d',
      evaluate: (x, y, z) => SDF.sdCone([x, y, z], p.angle ?? 0.5, p.height ?? 1),
      bounds: BOUNDS,
    }),
  },

  sdfEllipsoid: {
    id: 'sdfEllipsoid', name: 'SDF Ellipsoid', category: 'geometry', icon: '⬮', color: GEO_COLOR,
    inputs: [], outputs: ['out'],
    params: [
      { id: 'rx', label: 'RX', min: 0.1, max: 2, default: 0.8, step: 0.01 },
      { id: 'ry', label: 'RY', min: 0.1, max: 2, default: 0.5, step: 0.01 },
      { id: 'rz', label: 'RZ', min: 0.1, max: 2, default: 0.6, step: 0.01 },
    ],
    resourceType: 'sdf3d',
    compute: (w, h, p) => sdfPreview(w, h, (x, y, z) => SDF.sdEllipsoid([x, y, z], [p.rx ?? 0.8, p.ry ?? 0.5, p.rz ?? 0.6]), BOUNDS),
    computeResource: (_w, _h, p): Resource => ({
      type: 'sdf3d',
      evaluate: (x, y, z) => SDF.sdEllipsoid([x, y, z], [p.rx ?? 0.8, p.ry ?? 0.5, p.rz ?? 0.6]),
      bounds: BOUNDS,
    }),
  },

  sdfLink: {
    id: 'sdfLink', name: 'SDF Chain Link', category: 'geometry', icon: '⛓', color: GEO_COLOR,
    inputs: [], outputs: ['out'],
    params: [
      { id: 'length', label: 'Length', min: 0, max: 1, default: 0.3, step: 0.01 },
      { id: 'r1', label: 'R1', min: 0.1, max: 1, default: 0.5, step: 0.01 },
      { id: 'r2', label: 'R2', min: 0.02, max: 0.3, default: 0.1, step: 0.005 },
    ],
    resourceType: 'sdf3d',
    compute: (w, h, p) => sdfPreview(w, h, (x, y, z) => SDF.sdLink([x, y, z], p.length ?? 0.3, p.r1 ?? 0.5, p.r2 ?? 0.1), BOUNDS),
    computeResource: (_w, _h, p): Resource => ({
      type: 'sdf3d',
      evaluate: (x, y, z) => SDF.sdLink([x, y, z], p.length ?? 0.3, p.r1 ?? 0.5, p.r2 ?? 0.1),
      bounds: BOUNDS,
    }),
  },

  sdfHexPrism: {
    id: 'sdfHexPrism', name: 'SDF Hex Prism', category: 'geometry', icon: '⬡', color: GEO_COLOR,
    inputs: [], outputs: ['out'],
    params: [
      { id: 'height', label: 'Height', min: 0.1, max: 2, default: 0.5, step: 0.01 },
      { id: 'radius', label: 'Radius', min: 0.1, max: 2, default: 0.6, step: 0.01 },
    ],
    resourceType: 'sdf3d',
    compute: (w, h, p) => sdfPreview(w, h, (x, y, z) => SDF.sdHexPrism([x, y, z], p.height ?? 0.5, p.radius ?? 0.6), BOUNDS),
    computeResource: (_w, _h, p): Resource => ({
      type: 'sdf3d',
      evaluate: (x, y, z) => SDF.sdHexPrism([x, y, z], p.height ?? 0.5, p.radius ?? 0.6),
      bounds: BOUNDS,
    }),
  },

  // ══════════════════════════════════════════════════
  //  CSG OPERATIONS (Modifiers)
  // ══════════════════════════════════════════════════

  sdfUnion: {
    id: 'sdfUnion', name: 'SDF Union', category: 'geometry', icon: '∪', color: GEO_COLOR,
    inputs: ['a', 'b'], outputs: ['out'],
    params: [],
    resourceType: 'sdf3d',
    compute: (w, h) => new ImageData(w, h),
    computeResource: (_w, _h, _p, inputs): Resource => {
      const a = inputs.a as SDF3DResource | null;
      const b = inputs.b as SDF3DResource | null;
      if (!a || a.type !== 'sdf3d') return b || { type: 'sdf3d', evaluate: () => 999, bounds: BOUNDS };
      if (!b || b.type !== 'sdf3d') return a;
      return { type: 'sdf3d', evaluate: (x, y, z) => SDF.opUnion(a.evaluate(x, y, z), b.evaluate(x, y, z)), bounds: BOUNDS };
    },
  },

  sdfSubtract: {
    id: 'sdfSubtract', name: 'SDF Subtract', category: 'geometry', icon: '−', color: GEO_COLOR,
    inputs: ['a', 'b'], outputs: ['out'],
    params: [],
    resourceType: 'sdf3d',
    compute: (w, h) => new ImageData(w, h),
    computeResource: (_w, _h, _p, inputs): Resource => {
      const a = inputs.a as SDF3DResource | null;
      const b = inputs.b as SDF3DResource | null;
      if (!a || a.type !== 'sdf3d') return { type: 'sdf3d', evaluate: () => 999, bounds: BOUNDS };
      if (!b || b.type !== 'sdf3d') return a;
      return { type: 'sdf3d', evaluate: (x, y, z) => SDF.opSubtract(a.evaluate(x, y, z), b.evaluate(x, y, z)), bounds: BOUNDS };
    },
  },

  sdfIntersect: {
    id: 'sdfIntersect', name: 'SDF Intersect', category: 'geometry', icon: '∩', color: GEO_COLOR,
    inputs: ['a', 'b'], outputs: ['out'],
    params: [],
    resourceType: 'sdf3d',
    compute: (w, h) => new ImageData(w, h),
    computeResource: (_w, _h, _p, inputs): Resource => {
      const a = inputs.a as SDF3DResource | null;
      const b = inputs.b as SDF3DResource | null;
      if (!a || a.type !== 'sdf3d' || !b || b.type !== 'sdf3d') return { type: 'sdf3d', evaluate: () => 999, bounds: BOUNDS };
      return { type: 'sdf3d', evaluate: (x, y, z) => SDF.opIntersect(a.evaluate(x, y, z), b.evaluate(x, y, z)), bounds: BOUNDS };
    },
  },

  sdfSmoothUnion: {
    id: 'sdfSmoothUnion', name: 'SDF Smooth Union', category: 'geometry', icon: '⊎', color: GEO_COLOR,
    inputs: ['a', 'b'], outputs: ['out'],
    params: [{ id: 'smoothness', label: 'Smooth', min: 0, max: 1, default: 0.3, step: 0.01 }],
    resourceType: 'sdf3d',
    compute: (w, h) => new ImageData(w, h),
    computeResource: (_w, _h, p, inputs): Resource => {
      const a = inputs.a as SDF3DResource | null;
      const b = inputs.b as SDF3DResource | null;
      if (!a || a.type !== 'sdf3d') return b || { type: 'sdf3d', evaluate: () => 999, bounds: BOUNDS };
      if (!b || b.type !== 'sdf3d') return a;
      const k = p.smoothness ?? 0.3;
      return { type: 'sdf3d', evaluate: (x, y, z) => SDF.opSmoothUnion(a.evaluate(x, y, z), b.evaluate(x, y, z), k), bounds: BOUNDS };
    },
  },

  sdfSmoothSubtract: {
    id: 'sdfSmoothSubtract', name: 'SDF Smooth Subtract', category: 'geometry', icon: '⊖', color: GEO_COLOR,
    inputs: ['a', 'b'], outputs: ['out'],
    params: [{ id: 'smoothness', label: 'Smooth', min: 0, max: 1, default: 0.2, step: 0.01 }],
    resourceType: 'sdf3d',
    compute: (w, h) => new ImageData(w, h),
    computeResource: (_w, _h, p, inputs): Resource => {
      const a = inputs.a as SDF3DResource | null;
      const b = inputs.b as SDF3DResource | null;
      if (!a || a.type !== 'sdf3d') return { type: 'sdf3d', evaluate: () => 999, bounds: BOUNDS };
      if (!b || b.type !== 'sdf3d') return a;
      return { type: 'sdf3d', evaluate: (x, y, z) => SDF.opSmoothSubtract(a.evaluate(x, y, z), b.evaluate(x, y, z), p.smoothness ?? 0.2), bounds: BOUNDS };
    },
  },

  // ══════════════════════════════════════════════════
  //  DOMAIN OPERATIONS
  // ══════════════════════════════════════════════════

  sdfTwist: {
    id: 'sdfTwist', name: 'SDF Twist', category: 'geometry', icon: '↻', color: GEO_COLOR,
    inputs: ['in'], outputs: ['out'],
    params: [{ id: 'twist', label: 'Twist', min: -10, max: 10, default: 2, step: 0.1 }],
    resourceType: 'sdf3d',
    compute: (w, h) => new ImageData(w, h),
    computeResource: (_w, _h, p, inputs): Resource => {
      const src = inputs.in as SDF3DResource | null;
      if (!src || src.type !== 'sdf3d') return { type: 'sdf3d', evaluate: () => 999, bounds: BOUNDS };
      const k = p.twist ?? 2;
      return { type: 'sdf3d', evaluate: (x, y, z) => { const tp = SDF.opTwist([x, y, z], k); return src.evaluate(tp[0], tp[1], tp[2]); }, bounds: BOUNDS };
    },
  },

  sdfBend: {
    id: 'sdfBend', name: 'SDF Bend', category: 'geometry', icon: '↪', color: GEO_COLOR,
    inputs: ['in'], outputs: ['out'],
    params: [{ id: 'bend', label: 'Bend', min: -5, max: 5, default: 1, step: 0.1 }],
    resourceType: 'sdf3d',
    compute: (w, h) => new ImageData(w, h),
    computeResource: (_w, _h, p, inputs): Resource => {
      const src = inputs.in as SDF3DResource | null;
      if (!src || src.type !== 'sdf3d') return { type: 'sdf3d', evaluate: () => 999, bounds: BOUNDS };
      const k = p.bend ?? 1;
      return { type: 'sdf3d', evaluate: (x, y, z) => { const bp = SDF.opBend([x, y, z], k); return src.evaluate(bp[0], bp[1], bp[2]); }, bounds: BOUNDS };
    },
  },

  sdfRepeat: {
    id: 'sdfRepeat', name: 'SDF Repeat', category: 'geometry', icon: '⊞', color: GEO_COLOR,
    inputs: ['in'], outputs: ['out'],
    params: [
      { id: 'periodX', label: 'PX', min: 0, max: 5, default: 2, step: 0.1 },
      { id: 'periodY', label: 'PY', min: 0, max: 5, default: 2, step: 0.1 },
      { id: 'periodZ', label: 'PZ', min: 0, max: 5, default: 2, step: 0.1 },
    ],
    resourceType: 'sdf3d',
    compute: (w, h) => new ImageData(w, h),
    computeResource: (_w, _h, p, inputs): Resource => {
      const src = inputs.in as SDF3DResource | null;
      if (!src || src.type !== 'sdf3d') return { type: 'sdf3d', evaluate: () => 999, bounds: BOUNDS };
      const period: SDF.Vec3 = [p.periodX ?? 2, p.periodY ?? 2, p.periodZ ?? 2];
      return { type: 'sdf3d', evaluate: (x, y, z) => { const rp = SDF.opRepeat([x, y, z], period); return src.evaluate(rp[0], rp[1], rp[2]); }, bounds: [-4, -4, -4, 4, 4, 4] };
    },
  },

  sdfRound: {
    id: 'sdfRound', name: 'SDF Round', category: 'geometry', icon: '○', color: GEO_COLOR,
    inputs: ['in'], outputs: ['out'],
    params: [{ id: 'radius', label: 'Radius', min: 0, max: 0.5, default: 0.05, step: 0.005 }],
    resourceType: 'sdf3d',
    compute: (w, h) => new ImageData(w, h),
    computeResource: (_w, _h, p, inputs): Resource => {
      const src = inputs.in as SDF3DResource | null;
      if (!src || src.type !== 'sdf3d') return { type: 'sdf3d', evaluate: () => 999, bounds: BOUNDS };
      const r = p.radius ?? 0.05;
      return { type: 'sdf3d', evaluate: (x, y, z) => SDF.opRound(src.evaluate(x, y, z), r), bounds: BOUNDS };
    },
  },

  sdfOnion: {
    id: 'sdfOnion', name: 'SDF Shell', category: 'geometry', icon: '◎', color: GEO_COLOR,
    inputs: ['in'], outputs: ['out'],
    params: [{ id: 'thickness', label: 'Thick', min: 0.01, max: 0.5, default: 0.05, step: 0.005 }],
    resourceType: 'sdf3d',
    compute: (w, h) => new ImageData(w, h),
    computeResource: (_w, _h, p, inputs): Resource => {
      const src = inputs.in as SDF3DResource | null;
      if (!src || src.type !== 'sdf3d') return { type: 'sdf3d', evaluate: () => 999, bounds: BOUNDS };
      const t = p.thickness ?? 0.05;
      return { type: 'sdf3d', evaluate: (x, y, z) => SDF.opOnion(src.evaluate(x, y, z), t), bounds: BOUNDS };
    },
  },

  sdfScale: {
    id: 'sdfScale', name: 'SDF Scale', category: 'geometry', icon: '⇔', color: GEO_COLOR,
    inputs: ['in'], outputs: ['out'],
    params: [{ id: 'scale', label: 'Scale', min: 0.1, max: 5, default: 1, step: 0.01 }],
    resourceType: 'sdf3d',
    compute: (w, h) => new ImageData(w, h),
    computeResource: (_w, _h, p, inputs): Resource => {
      const src = inputs.in as SDF3DResource | null;
      if (!src || src.type !== 'sdf3d') return { type: 'sdf3d', evaluate: () => 999, bounds: BOUNDS };
      const s = p.scale ?? 1;
      return { type: 'sdf3d', evaluate: (x, y, z) => src.evaluate(x / s, y / s, z / s) * s, bounds: BOUNDS };
    },
  },

  sdfSymmetry: {
    id: 'sdfSymmetry', name: 'SDF Mirror', category: 'geometry', icon: '⎸', color: GEO_COLOR,
    inputs: ['in'], outputs: ['out'],
    params: [{ id: 'mode', label: 'Mode', min: 0, max: 1, default: 0, step: 1 }],
    resourceType: 'sdf3d',
    compute: (w, h) => new ImageData(w, h),
    computeResource: (_w, _h, p, inputs): Resource => {
      const src = inputs.in as SDF3DResource | null;
      if (!src || src.type !== 'sdf3d') return { type: 'sdf3d', evaluate: () => 999, bounds: BOUNDS };
      const mode = Math.round(p.mode ?? 0);
      return {
        type: 'sdf3d',
        evaluate: (x, y, z) => {
          const mp = mode === 0 ? SDF.opSymX([x, y, z]) : SDF.opSymXZ([x, y, z]);
          return src.evaluate(mp[0], mp[1], mp[2]);
        },
        bounds: BOUNDS,
      };
    },
  },

  sdfElongate: {
    id: 'sdfElongate', name: 'SDF Elongate', category: 'geometry', icon: '⟷', color: GEO_COLOR,
    inputs: ['in'], outputs: ['out'],
    params: [
      { id: 'ex', label: 'EX', min: 0, max: 2, default: 0.2, step: 0.01 },
      { id: 'ey', label: 'EY', min: 0, max: 2, default: 0, step: 0.01 },
      { id: 'ez', label: 'EZ', min: 0, max: 2, default: 0, step: 0.01 },
    ],
    resourceType: 'sdf3d',
    compute: (w, h) => new ImageData(w, h),
    computeResource: (_w, _h, p, inputs): Resource => {
      const src = inputs.in as SDF3DResource | null;
      if (!src || src.type !== 'sdf3d') return { type: 'sdf3d', evaluate: () => 999, bounds: BOUNDS };
      const eh: SDF.Vec3 = [p.ex ?? 0.2, p.ey ?? 0, p.ez ?? 0];
      return { type: 'sdf3d', evaluate: (x, y, z) => { const ep = SDF.opElongate([x, y, z], eh); return src.evaluate(ep[0], ep[1], ep[2]); }, bounds: BOUNDS };
    },
  },

  // ══════════════════════════════════════════════════
  //  CONVERTERS
  // ══════════════════════════════════════════════════

  extractMesh: {
    id: 'extractMesh', name: 'Extract Mesh', category: 'geometry', icon: '▲', color: GEO_COLOR,
    inputs: ['sdf'], outputs: ['out'],
    params: [{ id: 'resolution', label: 'Res', min: 8, max: 64, default: 32, step: 1 }],
    resourceType: 'mesh',
    compute: (w, h) => new ImageData(w, h),
    computeResource: (_w, _h, p, inputs): Resource => {
      const sdfIn = inputs.sdf;
      if (!sdfIn || sdfIn.type !== 'sdf3d') return { type: 'mesh', vertices: new Float32Array(0), normals: new Float32Array(0), indices: new Uint32Array(0) };
      return extractMesh(sdfIn, Math.round(p.resolution ?? 32));
    },
  },

  heightToMesh: {
    id: 'heightToMesh', name: 'Height → Mesh', category: 'geometry', icon: '⛰', color: GEO_COLOR,
    inputs: ['in'], outputs: ['out'],
    params: [
      { id: 'heightScale', label: 'Height', min: 0.01, max: 2, default: 0.5, step: 0.01 },
      { id: 'resolution', label: 'Res', min: 8, max: 128, default: 64, step: 1 },
    ],
    resourceType: 'mesh',
    compute: (w, h) => new ImageData(w, h),
    computeResource: (_w, _h, p, inputs): Resource => {
      const field = inputs.in;
      if (!field || field.type !== 'field2d') return { type: 'mesh', vertices: new Float32Array(0), normals: new Float32Array(0), indices: new Uint32Array(0) };
      return heightmapToMesh(field.data, p.heightScale ?? 0.5, Math.round(p.resolution ?? 64));
    },
  },

  // ══════════════════════════════════════════════════
  //  MATERIALS (Whitepaper §6.5)
  // ══════════════════════════════════════════════════

  pbrMaterial: {
    id: 'pbrMaterial', name: 'PBR Material', category: 'material', icon: '🎨', color: MAT_COLOR,
    inputs: [], outputs: ['out'],
    params: [
      { id: 'r', label: 'R', min: 0, max: 255, default: 180, step: 1 },
      { id: 'g', label: 'G', min: 0, max: 255, default: 180, step: 1 },
      { id: 'b', label: 'B', min: 0, max: 255, default: 180, step: 1 },
      { id: 'roughness', label: 'Rough', min: 0, max: 1, default: 0.5, step: 0.01 },
      { id: 'metalness', label: 'Metal', min: 0, max: 1, default: 0, step: 0.01 },
    ],
    resourceType: 'material',
    compute: (w, h, p) => {
      const img = new ImageData(w, h);
      const d = img.data;
      const r = p.r ?? 180, g = p.g ?? 180, b = p.b ?? 180;
      for (let i = 0; i < d.length; i += 4) { d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255; }
      return img;
    },
    computeResource: (_w, _h, p): Resource => ({
      type: 'material',
      color: [p.r ?? 180, p.g ?? 180, p.b ?? 180],
      roughness: p.roughness ?? 0.5,
      metalness: p.metalness ?? 0,
    }),
  },

  metalMaterial: {
    id: 'metalMaterial', name: 'Metal Material', category: 'material', icon: '⬛', color: MAT_COLOR,
    inputs: [], outputs: ['out'],
    params: [
      { id: 'r', label: 'R', min: 0, max: 255, default: 220, step: 1 },
      { id: 'g', label: 'G', min: 0, max: 255, default: 210, step: 1 },
      { id: 'b', label: 'B', min: 0, max: 255, default: 200, step: 1 },
      { id: 'roughness', label: 'Rough', min: 0, max: 1, default: 0.2, step: 0.01 },
    ],
    resourceType: 'material',
    compute: (w, h, p) => {
      const img = new ImageData(w, h);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) { d[i] = p.r ?? 220; d[i + 1] = p.g ?? 210; d[i + 2] = p.b ?? 200; d[i + 3] = 255; }
      return img;
    },
    computeResource: (_w, _h, p): Resource => ({
      type: 'material',
      color: [p.r ?? 220, p.g ?? 210, p.b ?? 200],
      roughness: p.roughness ?? 0.2,
      metalness: 0.95,
    }),
  },

  emissiveMaterial: {
    id: 'emissiveMaterial', name: 'Emissive Material', category: 'material', icon: '💡', color: MAT_COLOR,
    inputs: [], outputs: ['out'],
    params: [
      { id: 'r', label: 'R', min: 0, max: 255, default: 255, step: 1 },
      { id: 'g', label: 'G', min: 0, max: 255, default: 120, step: 1 },
      { id: 'b', label: 'B', min: 0, max: 255, default: 50, step: 1 },
      { id: 'intensity', label: 'Bright', min: 0, max: 5, default: 1, step: 0.1 },
    ],
    resourceType: 'material',
    compute: (w, h, p) => {
      const img = new ImageData(w, h);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) { d[i] = p.r ?? 255; d[i + 1] = p.g ?? 120; d[i + 2] = p.b ?? 50; d[i + 3] = 255; }
      return img;
    },
    computeResource: (_w, _h, p): Resource => ({
      type: 'material',
      color: [p.r ?? 255, p.g ?? 120, p.b ?? 50],
      roughness: 0.3,
      metalness: 0,
      emissive: [
        Math.min(255, (p.r ?? 255) * (p.intensity ?? 1)),
        Math.min(255, (p.g ?? 120) * (p.intensity ?? 1)),
        Math.min(255, (p.b ?? 50) * (p.intensity ?? 1)),
      ],
    }),
  },

  // ══════════════════════════════════════════════════
  //  3D OUTPUT
  // ══════════════════════════════════════════════════

  output3D: {
    id: 'output3D', name: '3D Output', category: 'material', icon: '🎬', color: MAT_COLOR,
    inputs: ['mesh', 'material'], outputs: [],
    params: [],
    resourceType: 'scene3d',
    compute: (w, h) => new ImageData(w, h),
    computeResource: (_w, _h, _p, inputs): Resource => ({
      type: 'scene3d',
      mesh: (inputs.mesh?.type === 'mesh' ? inputs.mesh : null) as MeshResource | null,
      material: (inputs.material?.type === 'material' ? inputs.material : null),
    }),
  },
};
