// Alchemy Studio — Mesh Operations: Surface Nets + Heightmap (Whitepaper §5.3)

import type { MeshResource, SDF3DResource } from './types';

/**
 * Surface Nets mesh extraction from SDF (Whitepaper §6.8)
 * Produces smooth meshes from signed distance fields
 */
export function extractMesh(sdf: SDF3DResource, resolution = 32): MeshResource {
  const [minX, minY, minZ, maxX, maxY, maxZ] = sdf.bounds;
  const nx = resolution, ny = resolution, nz = resolution;
  const dx = (maxX - minX) / nx;
  const dy = (maxY - minY) / ny;
  const dz = (maxZ - minZ) / nz;

  // Evaluate SDF at all grid vertices
  const sx = nx + 1, sy = ny + 1;
  const stride_y = sx;
  const stride_z = sx * sy;
  const grid = new Float32Array(sx * sy * (nz + 1));

  for (let iz = 0; iz <= nz; iz++)
    for (let iy = 0; iy <= ny; iy++)
      for (let ix = 0; ix <= nx; ix++)
        grid[iz * stride_z + iy * stride_y + ix] =
          sdf.evaluate(minX + ix * dx, minY + iy * dy, minZ + iz * dz);

  // Surface Nets: place vertices at averaged edge crossings in each cell
  const cellStride_y = nx;
  const cellStride_z = nx * ny;
  const vertexMap = new Int32Array(nx * ny * nz).fill(-1);
  const verts: number[] = [];

  const cornerOffsets = [
    [0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0],
    [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1],
  ];
  const edges: [number, number][] = [
    [0, 1], [2, 3], [4, 5], [6, 7],
    [0, 2], [1, 3], [4, 6], [5, 7],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ];

  for (let iz = 0; iz < nz; iz++)
    for (let iy = 0; iy < ny; iy++)
      for (let ix = 0; ix < nx; ix++) {
        const c: number[] = [];
        for (const [ox, oy, oz] of cornerOffsets)
          c.push(grid[(iz + oz) * stride_z + (iy + oy) * stride_y + (ix + ox)]);

        let mask = 0;
        for (let i = 0; i < 8; i++) if (c[i] < 0) mask |= (1 << i);
        if (mask === 0 || mask === 255) continue;

        let sumX = 0, sumY = 0, sumZ = 0, count = 0;
        for (const [a, b] of edges) {
          if ((c[a] < 0) !== (c[b] < 0)) {
            const t = c[a] / (c[a] - c[b]);
            sumX += cornerOffsets[a][0] + t * (cornerOffsets[b][0] - cornerOffsets[a][0]);
            sumY += cornerOffsets[a][1] + t * (cornerOffsets[b][1] - cornerOffsets[a][1]);
            sumZ += cornerOffsets[a][2] + t * (cornerOffsets[b][2] - cornerOffsets[a][2]);
            count++;
          }
        }

        if (count > 0) {
          const cellIdx = iz * cellStride_z + iy * cellStride_y + ix;
          vertexMap[cellIdx] = verts.length / 3;
          verts.push(
            minX + (ix + sumX / count) * dx,
            minY + (iy + sumY / count) * dy,
            minZ + (iz + sumZ / count) * dz
          );
        }
      }

  // Generate quads between adjacent surface cells
  const tris: number[] = [];

  for (let iz = 0; iz < nz; iz++)
    for (let iy = 0; iy < ny; iy++)
      for (let ix = 0; ix < nx; ix++) {
        const cellIdx = iz * cellStride_z + iy * cellStride_y + ix;
        if (vertexMap[cellIdx] < 0) continue;

        // X-axis face
        if (iy > 0 && iz > 0) {
          const v0 = grid[iz * stride_z + iy * stride_y + ix];
          const v1 = grid[iz * stride_z + iy * stride_y + ix + 1];
          if ((v0 < 0) !== (v1 < 0)) {
            const a = vertexMap[cellIdx];
            const b = vertexMap[iz * cellStride_z + (iy - 1) * cellStride_y + ix];
            const c = vertexMap[(iz - 1) * cellStride_z + (iy - 1) * cellStride_y + ix];
            const d = vertexMap[(iz - 1) * cellStride_z + iy * cellStride_y + ix];
            if (a >= 0 && b >= 0 && c >= 0 && d >= 0) {
              if (v0 < 0) { tris.push(a, b, c, a, c, d); }
              else { tris.push(a, c, b, a, d, c); }
            }
          }
        }

        // Y-axis face
        if (ix > 0 && iz > 0) {
          const v0 = grid[iz * stride_z + iy * stride_y + ix];
          const v1 = grid[iz * stride_z + (iy + 1) * stride_y + ix];
          if ((v0 < 0) !== (v1 < 0)) {
            const a = vertexMap[cellIdx];
            const b = vertexMap[(iz - 1) * cellStride_z + iy * cellStride_y + ix];
            const c = vertexMap[(iz - 1) * cellStride_z + iy * cellStride_y + (ix - 1)];
            const d = vertexMap[iz * cellStride_z + iy * cellStride_y + (ix - 1)];
            if (a >= 0 && b >= 0 && c >= 0 && d >= 0) {
              if (v0 < 0) { tris.push(a, b, c, a, c, d); }
              else { tris.push(a, c, b, a, d, c); }
            }
          }
        }

        // Z-axis face
        if (ix > 0 && iy > 0) {
          const v0 = grid[iz * stride_z + iy * stride_y + ix];
          const v1 = grid[(iz + 1) * stride_z + iy * stride_y + ix];
          if ((v0 < 0) !== (v1 < 0)) {
            const a = vertexMap[cellIdx];
            const b = vertexMap[iz * cellStride_z + (iy - 1) * cellStride_y + ix];
            const c = vertexMap[iz * cellStride_z + (iy - 1) * cellStride_y + (ix - 1)];
            const d = vertexMap[iz * cellStride_z + iy * cellStride_y + (ix - 1)];
            if (a >= 0 && b >= 0 && c >= 0 && d >= 0) {
              if (v0 < 0) { tris.push(a, b, c, a, c, d); }
              else { tris.push(a, c, b, a, d, c); }
            }
          }
        }
      }

  // Compute normals from SDF gradient
  const vertices = new Float32Array(verts);
  const normals = new Float32Array(verts.length);
  const eps = Math.min(dx, dy, dz) * 0.5;

  for (let i = 0; i < verts.length; i += 3) {
    const x = verts[i], y = verts[i + 1], z = verts[i + 2];
    const gx = sdf.evaluate(x + eps, y, z) - sdf.evaluate(x - eps, y, z);
    const gy = sdf.evaluate(x, y + eps, z) - sdf.evaluate(x, y - eps, z);
    const gz = sdf.evaluate(x, y, z + eps) - sdf.evaluate(x, y, z - eps);
    const len = Math.sqrt(gx * gx + gy * gy + gz * gz) || 1;
    normals[i] = gx / len; normals[i + 1] = gy / len; normals[i + 2] = gz / len;
  }

  return { type: 'mesh', vertices, normals, indices: new Uint32Array(tris) };
}

/**
 * Heightmap (Field2D) → Mesh (Whitepaper §5.3)
 */
export function heightmapToMesh(heightData: ImageData, heightScale: number, meshRes: number): MeshResource {
  const w = Math.min(meshRes, heightData.width);
  const h = Math.min(meshRes, heightData.height);
  const vertices = new Float32Array(w * h * 3);
  const normals = new Float32Array(w * h * 3);
  const idxList: number[] = [];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx = Math.floor(x / w * heightData.width);
      const sy = Math.floor(y / h * heightData.height);
      const si = (sy * heightData.width + sx) * 4;
      const hv = heightData.data[si] / 255 * heightScale;
      const idx = (y * w + x) * 3;
      vertices[idx] = (x / w - 0.5) * 2;
      vertices[idx + 1] = hv;
      vertices[idx + 2] = (y / h - 0.5) * 2;
    }
  }

  for (let y = 0; y < h - 1; y++) {
    for (let x = 0; x < w - 1; x++) {
      const a = y * w + x, b = a + 1, c = (y + 1) * w + x, d = c + 1;
      idxList.push(a, c, b, b, c, d);
    }
  }

  // Compute normals from finite differences
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 3;
      const getH = (px: number, py: number) => vertices[(Math.max(0, Math.min(h - 1, py)) * w + Math.max(0, Math.min(w - 1, px))) * 3 + 1];
      const dhdx = getH(x + 1, y) - getH(x - 1, y);
      const dhdz = getH(x, y + 1) - getH(x, y - 1);
      const len = Math.sqrt(dhdx * dhdx + 1 + dhdz * dhdz);
      normals[idx] = -dhdx / len;
      normals[idx + 1] = 1 / len;
      normals[idx + 2] = -dhdz / len;
    }
  }

  return { type: 'mesh', vertices, normals, indices: new Uint32Array(idxList) };
}
