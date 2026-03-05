// Alchemy Studio — SDF Primitives, CSG, Domain Operations (Whitepaper §6.3)

export type Vec3 = [number, number, number];

// ──── Primitives ────
export const sdSphere = (p: Vec3, r: number): number =>
  Math.sqrt(p[0] * p[0] + p[1] * p[1] + p[2] * p[2]) - r;

export const sdBox = (p: Vec3, b: Vec3): number => {
  const qx = Math.abs(p[0]) - b[0], qy = Math.abs(p[1]) - b[1], qz = Math.abs(p[2]) - b[2];
  return Math.sqrt(Math.max(qx, 0) ** 2 + Math.max(qy, 0) ** 2 + Math.max(qz, 0) ** 2) + Math.min(Math.max(qx, qy, qz), 0);
};

export const sdTorus = (p: Vec3, R: number, r: number): number => {
  const q = Math.sqrt(p[0] * p[0] + p[2] * p[2]) - R;
  return Math.sqrt(q * q + p[1] * p[1]) - r;
};

export const sdCylinder = (p: Vec3, r: number, h: number): number => {
  const d = Math.sqrt(p[0] * p[0] + p[2] * p[2]) - r;
  return Math.max(d, Math.abs(p[1]) - h);
};

export const sdCone = (p: Vec3, angle: number, h: number): number => {
  const q = Math.sqrt(p[0] * p[0] + p[2] * p[2]);
  return Math.max(q * Math.cos(angle) - p[1] * Math.sin(angle), p[1] - h);
};

export const sdCapsule = (p: Vec3, h: number, r: number): number => {
  const py = Math.max(-h, Math.min(h, p[1]));
  return Math.sqrt(p[0] * p[0] + (p[1] - py) ** 2 + p[2] * p[2]) - r;
};

export const sdOctahedron = (p: Vec3, s: number): number =>
  (Math.abs(p[0]) + Math.abs(p[1]) + Math.abs(p[2]) - s) * 0.57735027;

export const sdPlane = (p: Vec3, n: Vec3, h: number): number =>
  p[0] * n[0] + p[1] * n[1] + p[2] * n[2] + h;

export const sdEllipsoid = (p: Vec3, r: Vec3): number => {
  const k0 = Math.sqrt((p[0] / r[0]) ** 2 + (p[1] / r[1]) ** 2 + (p[2] / r[2]) ** 2);
  const k1 = Math.sqrt((p[0] / (r[0] * r[0])) ** 2 + (p[1] / (r[1] * r[1])) ** 2 + (p[2] / (r[2] * r[2])) ** 2);
  return k0 * (k0 - 1) / k1;
};

export const sdHexPrism = (p: Vec3, h: number, r: number): number => {
  const ax = Math.abs(p[0]), az = Math.abs(p[2]);
  const d = Math.max(ax * 0.866025 + az * 0.5, az) - r;
  return Math.max(d, Math.abs(p[1]) - h);
};

export const sdTriPrism = (p: Vec3, h: number, r: number): number => {
  const ax = Math.abs(p[0]);
  const d = Math.max(ax * 1.732 + p[2], -p[2] - r * 0.5) - r * 0.5;
  return Math.max(d, Math.abs(p[1]) - h);
};

export const sdLink = (p: Vec3, le: number, r1: number, r2: number): number => {
  const qx = p[0], qy = Math.max(Math.abs(p[1]) - le, 0), qz = p[2];
  return Math.sqrt((Math.sqrt(qx * qx + qy * qy) - r1) ** 2 + qz * qz) - r2;
};

// ──── CSG Operations ────
export const opUnion = (a: number, b: number): number => Math.min(a, b);
export const opSubtract = (a: number, b: number): number => Math.max(a, -b);
export const opIntersect = (a: number, b: number): number => Math.max(a, b);

export const opSmoothUnion = (a: number, b: number, k: number): number => {
  if (k <= 0) return Math.min(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
};

export const opSmoothSubtract = (a: number, b: number, k: number): number => {
  if (k <= 0) return Math.max(a, -b);
  const h = Math.max(k - Math.abs(-b - a), 0) / k;
  return Math.max(a, -b) + h * h * k * 0.25;
};

export const opSmoothIntersect = (a: number, b: number, k: number): number => {
  if (k <= 0) return Math.max(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.max(a, b) + h * h * k * 0.25;
};

// ──── Domain Operations ────
export const opTwist = (p: Vec3, k: number): Vec3 => {
  const c = Math.cos(k * p[1]), s = Math.sin(k * p[1]);
  return [p[0] * c - p[2] * s, p[1], p[0] * s + p[2] * c];
};

export const opBend = (p: Vec3, k: number): Vec3 => {
  const c = Math.cos(k * p[0]), s = Math.sin(k * p[0]);
  return [c * p[0] - s * p[1], s * p[0] + c * p[1], p[2]];
};

export const opRepeat = (p: Vec3, period: Vec3): Vec3 => [
  period[0] > 0 ? p[0] - period[0] * Math.round(p[0] / period[0]) : p[0],
  period[1] > 0 ? p[1] - period[1] * Math.round(p[1] / period[1]) : p[1],
  period[2] > 0 ? p[2] - period[2] * Math.round(p[2] / period[2]) : p[2],
];

export const opRepeatLimited = (p: Vec3, period: number, limit: Vec3): Vec3 => [
  p[0] - period * Math.max(-limit[0], Math.min(limit[0], Math.round(p[0] / period))),
  p[1] - period * Math.max(-limit[1], Math.min(limit[1], Math.round(p[1] / period))),
  p[2] - period * Math.max(-limit[2], Math.min(limit[2], Math.round(p[2] / period))),
];

export const opRound = (d: number, r: number): number => d - r;
export const opOnion = (d: number, thickness: number): number => Math.abs(d) - thickness;

export const opScale = (p: Vec3, s: number): Vec3 => [p[0] / s, p[1] / s, p[2] / s];

export const opElongate = (p: Vec3, h: Vec3): Vec3 => [
  p[0] - Math.max(-h[0], Math.min(h[0], p[0])),
  p[1] - Math.max(-h[1], Math.min(h[1], p[1])),
  p[2] - Math.max(-h[2], Math.min(h[2], p[2])),
];

export const opSymX = (p: Vec3): Vec3 => [Math.abs(p[0]), p[1], p[2]];
export const opSymXZ = (p: Vec3): Vec3 => [Math.abs(p[0]), p[1], Math.abs(p[2])];

// ──── Distance estimation helpers ────
export function sdfGradient(evaluate: (x: number, y: number, z: number) => number, x: number, y: number, z: number, eps = 0.001): Vec3 {
  const dx = evaluate(x + eps, y, z) - evaluate(x - eps, y, z);
  const dy = evaluate(x, y + eps, z) - evaluate(x, y - eps, z);
  const dz = evaluate(x, y, z + eps) - evaluate(x, y, z - eps);
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
  return [dx / len, dy / len, dz / len];
}
