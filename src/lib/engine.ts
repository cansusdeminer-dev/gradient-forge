import type { Node, Edge } from '@xyflow/react';
import { MODULES } from './modules';

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
): Map<string, ImageData> {
  const results = new Map<string, ImageData>();
  if (nodes.length === 0) return results;

  // Build input map: targetNodeId → { handleId → sourceNodeId.sourceHandleId }
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

    // Resolve inputs
    const resolvedInputs: Record<string, ImageData | null> = {};
    for (const inputId of moduleDef.inputs) {
      const source = inputMap.get(nodeId)?.get(inputId);
      if (source) {
        resolvedInputs[inputId] = results.get(source.nodeId) || null;
      } else {
        resolvedInputs[inputId] = null;
      }
    }

    try {
      const result = moduleDef.compute(width, height, data.params, resolvedInputs);
      results.set(nodeId, result);
    } catch (e) {
      console.warn(`Compute error for node ${nodeId}:`, e);
      results.set(nodeId, new ImageData(width, height));
    }
  }

  return results;
}

export function findOutputNode(nodes: Node[]): Node | undefined {
  return nodes.find(n => (n.data as unknown as NodeData).moduleType === 'output');
}
