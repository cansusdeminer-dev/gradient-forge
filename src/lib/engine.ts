import type { Node, Edge } from '@xyflow/react';
import { MODULES } from './modules';
import type { Resource } from './types';

interface NodeData {
  moduleType: string;
  params: Record<string, number>;
  label: string;
}

export function computeGraph(
  nodes: Node[],
  edges: Edge[],
  width: number,
  height: number
): Map<string, Resource> {
  const results = new Map<string, Resource>();
  if (nodes.length === 0) return results;

  // Build input map
  const inputMap = new Map<string, Map<string, { nodeId: string; handleId: string }>>();
  for (const edge of edges) {
    if (!inputMap.has(edge.target)) inputMap.set(edge.target, new Map());
    inputMap.get(edge.target)!.set(
      edge.targetHandle || 'in',
      { nodeId: edge.source, handleId: edge.sourceHandle || 'out' }
    );
  }

  // Topological sort (Kahn's algorithm)
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adj.set(node.id, []);
  }
  for (const edge of edges) {
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    adj.get(edge.source)?.push(edge.target);
  }
  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }
  const sorted: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    sorted.push(id);
    for (const next of (adj.get(id) || [])) {
      const newDeg = (inDegree.get(next) || 1) - 1;
      inDegree.set(next, newDeg);
      if (newDeg === 0) queue.push(next);
    }
  }

  // Compute each node in topological order
  for (const nodeId of sorted) {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) continue;
    const data = node.data as unknown as NodeData;
    const moduleDef = MODULES[data.moduleType];
    if (!moduleDef) continue;

    try {
      if (moduleDef.computeResource) {
        // New-style: typed resource pipeline
        const resolvedInputs: Record<string, Resource | null> = {};
        for (const inputId of moduleDef.inputs) {
          const source = inputMap.get(nodeId)?.get(inputId);
          resolvedInputs[inputId] = source ? (results.get(source.nodeId) || null) : null;
        }
        results.set(nodeId, moduleDef.computeResource(width, height, data.params, resolvedInputs));
      } else {
        // Legacy: ImageData pipeline → wrap as field2d
        const resolvedInputs: Record<string, ImageData | null> = {};
        for (const inputId of moduleDef.inputs) {
          const source = inputMap.get(nodeId)?.get(inputId);
          const res = source ? results.get(source.nodeId) : null;
          resolvedInputs[inputId] = res && res.type === 'field2d' ? res.data : null;
        }
        const imageData = moduleDef.compute(width, height, data.params, resolvedInputs);
        results.set(nodeId, { type: 'field2d', data: imageData });
      }
    } catch (e) {
      console.warn(`Compute error for node ${nodeId}:`, e);
      results.set(nodeId, { type: 'field2d', data: new ImageData(width, height) });
    }
  }

  return results;
}

export function findOutputNode(nodes: Node[]): Node | undefined {
  // Prefer output3D, then regular output
  const output3D = nodes.find(n => (n.data as unknown as { moduleType: string }).moduleType === 'output3D');
  if (output3D) return output3D;
  return nodes.find(n => (n.data as unknown as { moduleType: string }).moduleType === 'output');
}

export function imageDataToDataURL(imageData: ImageData, size = 48): string {
  const tmp = document.createElement('canvas');
  tmp.width = imageData.width;
  tmp.height = imageData.height;
  tmp.getContext('2d')!.putImageData(imageData, 0, 0);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  canvas.getContext('2d')!.drawImage(tmp, 0, 0, size, size);
  return canvas.toDataURL();
}

/** Generate a 2D SDF slice preview for node thumbnails */
export function sdfToPreviewDataURL(evaluate: (x: number, y: number, z: number) => number, bounds: number[], size = 56): string {
  const img = new ImageData(size, size);
  const d = img.data;
  const range = bounds[3] - bounds[0];
  const mid = bounds[0];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const wx = mid + (x / size) * range, wy = mid + (y / size) * range;
      const dist = evaluate(wx, wy, 0);
      const i = (y * size + x) * 4;
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
  return imageDataToDataURL(img, size);
}
