import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type Connection,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus, Zap, Trash2 } from 'lucide-react';
import ModuleNode from '@/components/synth/ModuleNode';
import PreviewPanel from '@/components/synth/PreviewPanel';
import { MODULES, MODULE_CATEGORIES } from '@/lib/modules';
import { computeGraph, findOutputNode } from '@/lib/engine';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const nodeTypes = { module: ModuleNode };

let nodeIdCounter = 10;

function createModuleNode(moduleType: string, position: { x: number; y: number }): Node {
  const def = MODULES[moduleType];
  const params: Record<string, number> = {};
  def.params.forEach(p => { params[p.id] = p.default; });
  nodeIdCounter++;
  return {
    id: `node-${nodeIdCounter}`,
    type: 'module',
    position,
    data: { moduleType, params, label: def.name },
  };
}

const initialNodes: Node[] = [
  {
    id: 'node-1',
    type: 'module',
    position: { x: 50, y: 180 },
    data: { moduleType: 'perlin', params: { frequency: 4, octaves: 4, lacunarity: 2, persistence: 0.5, seed: 42 }, label: 'Perlin Noise' },
  },
  {
    id: 'node-2',
    type: 'module',
    position: { x: 340, y: 180 },
    data: { moduleType: 'colorMap', params: { palette: 4, contrast: 1, shift: 0 }, label: 'Color Map' },
  },
  {
    id: 'node-3',
    type: 'module',
    position: { x: 600, y: 200 },
    data: { moduleType: 'output', params: {}, label: 'Output' },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: 'node-1', target: 'node-2', sourceHandle: 'out', targetHandle: 'in', animated: true },
  { id: 'e2-3', source: 'node-2', target: 'node-3', sourceHandle: 'out', targetHandle: 'in', animated: true },
];

function SynthApp() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [resolution, setResolution] = useState(256);
  const [output, setOutput] = useState<ImageData | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const computeTimeoutRef = useRef<number>();

  const onConnect = useCallback((connection: Connection) => {
    setEdges(eds => addEdge({
      ...connection,
      animated: true,
    }, eds));
  }, [setEdges]);

  // Debounced compute
  useEffect(() => {
    if (computeTimeoutRef.current) cancelAnimationFrame(computeTimeoutRef.current);
    computeTimeoutRef.current = requestAnimationFrame(() => {
      const results = computeGraph(nodes, edges, resolution, resolution);
      const outputNode = findOutputNode(nodes);
      if (outputNode && results.has(outputNode.id)) {
        setOutput(results.get(outputNode.id)!);
      } else {
        // Show last computed result
        const lastNode = nodes[nodes.length - 1];
        if (lastNode && results.has(lastNode.id)) {
          setOutput(results.get(lastNode.id)!);
        } else {
          setOutput(null);
        }
      }
    });
    return () => {
      if (computeTimeoutRef.current) cancelAnimationFrame(computeTimeoutRef.current);
    };
  }, [nodes, edges, resolution]);

  const addModule = useCallback((moduleType: string) => {
    const node = createModuleNode(moduleType, {
      x: 200 + Math.random() * 200,
      y: 100 + Math.random() * 200,
    });
    setNodes(nds => [...nds, node]);
    setMenuOpen(false);
  }, [setNodes]);

  const deleteSelected = useCallback(() => {
    setNodes(nds => nds.filter(n => !n.selected));
    setEdges(eds => eds.filter(e => {
      const sourceSelected = nodes.find(n => n.id === e.source)?.selected;
      const targetSelected = nodes.find(n => n.id === e.target)?.selected;
      return !sourceSelected && !targetSelected;
    }));
  }, [setNodes, setEdges, nodes]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background">
      {/* Toolbar */}
      <header className="h-11 border-b border-border flex items-center justify-between px-4 shrink-0"
        style={{ background: 'linear-gradient(180deg, hsl(240 24% 10%), hsl(240 24% 8%))' }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Zap size={14} className="text-primary" style={{ filter: 'drop-shadow(0 0 4px hsl(180 100% 50% / 0.5))' }} />
            <h1 className="text-xs font-bold tracking-wider">
              <span className="text-primary text-glow-cyan">TEXTURE</span>
              <span className="text-secondary text-glow-magenta">SYNTH</span>
            </h1>
          </div>
          <div className="h-4 w-px bg-border" />
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20">
                <Plus size={12} />
                Add Module
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-card border-border min-w-[180px]">
              <DropdownMenuLabel className="text-[10px] text-primary uppercase tracking-widest">Generators</DropdownMenuLabel>
              {MODULE_CATEGORIES.generator.map(m => (
                <DropdownMenuItem key={m.id} onClick={() => addModule(m.id)} className="text-xs cursor-pointer">
                  {m.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] text-secondary uppercase tracking-widest">Modifiers</DropdownMenuLabel>
              {MODULE_CATEGORIES.modifier.map(m => (
                <DropdownMenuItem key={m.id} onClick={() => addModule(m.id)} className="text-xs cursor-pointer">
                  {m.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] text-accent uppercase tracking-widest">Output</DropdownMenuLabel>
              {MODULE_CATEGORIES.output.map(m => (
                <DropdownMenuItem key={m.id} onClick={() => addModule(m.id)} className="text-xs cursor-pointer">
                  {m.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            onClick={deleteSelected}
            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 size={11} />
            Delete
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[8px] text-muted-foreground/50 font-mono uppercase tracking-widest">
            {nodes.length} modules · {edges.length} cables
          </span>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Patch Bay */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            defaultEdgeOptions={{ animated: true }}
            deleteKeyCode={['Backspace', 'Delete']}
            className="bg-background"
          >
            <Background variant={BackgroundVariant.Dots} color="hsl(240 15% 15%)" gap={24} size={1} />
            <Controls showInteractive={false} />
            <MiniMap
              nodeColor={() => 'hsl(180 100% 50%)'}
              maskColor="hsl(240 27% 4% / 0.8)"
              style={{ width: 120, height: 80 }}
            />
          </ReactFlow>
          {/* Canvas label */}
          <div className="absolute bottom-3 left-3 text-[8px] text-muted-foreground/30 uppercase tracking-[0.2em] font-mono pointer-events-none">
            Patch Bay
          </div>
        </div>

        {/* Preview */}
        <div className="w-[320px] shrink-0">
          <PreviewPanel output={output} resolution={resolution} onResolutionChange={setResolution} />
        </div>
      </div>
    </div>
  );
}

const Index = () => (
  <ReactFlowProvider>
    <SynthApp />
  </ReactFlowProvider>
);

export default Index;
