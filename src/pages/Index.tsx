import React, { useState, useCallback, useEffect, useRef } from 'react';
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
import { Plus, Zap, Trash2, Search, RotateCcw } from 'lucide-react';
import ModuleNode from '@/components/synth/ModuleNode';
import PreviewPanel from '@/components/synth/PreviewPanel';
import AddModuleDialog from '@/components/synth/AddModuleDialog';
import { MODULES } from '@/lib/modules';
import { computeGraph, findOutputNode, imageDataToDataURL } from '@/lib/engine';
import { PRESETS } from '@/lib/presets';
import { NodePreviewContext } from '@/lib/synthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const nodeTypes = { module: ModuleNode };

let nodeIdCounter = 100;

function createModuleNode(moduleType: string, position: { x: number; y: number }): Node {
  const def = MODULES[moduleType];
  if (!def) throw new Error(`Unknown module: ${moduleType}`);
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

const defaultPreset = PRESETS[0];

function SynthApp() {
  const [nodes, setNodes, onNodesChange] = useNodesState(defaultPreset.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(defaultPreset.edges);
  const [resolution, setResolution] = useState(256);
  const [output, setOutput] = useState<ImageData | null>(null);
  const [previews, setPreviews] = useState<Map<string, string>>(new Map());
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const computeTimeoutRef = useRef<number>();

  const onConnect = useCallback((connection: Connection) => {
    setEdges(eds => addEdge({ ...connection, animated: true }, eds));
  }, [setEdges]);

  // Compute graph on changes
  useEffect(() => {
    if (computeTimeoutRef.current) cancelAnimationFrame(computeTimeoutRef.current);
    computeTimeoutRef.current = requestAnimationFrame(() => {
      try {
        const results = computeGraph(nodes, edges, resolution, resolution);

        // Generate per-node previews
        const newPreviews = new Map<string, string>();
        for (const [nodeId, imageData] of results) {
          newPreviews.set(nodeId, imageDataToDataURL(imageData, 56));
        }
        setPreviews(newPreviews);

        // Find output
        const outputNode = findOutputNode(nodes);
        if (outputNode && results.has(outputNode.id)) {
          setOutput(results.get(outputNode.id)!);
        } else {
          // Last sink node
          const sinks = nodes.filter(n => !edges.some(e => e.source === n.id));
          const lastSink = sinks[sinks.length - 1];
          if (lastSink && results.has(lastSink.id)) {
            setOutput(results.get(lastSink.id)!);
          } else {
            setOutput(null);
          }
        }
      } catch (e) {
        console.error('Graph compute error:', e);
      }
    });
    return () => {
      if (computeTimeoutRef.current) cancelAnimationFrame(computeTimeoutRef.current);
    };
  }, [nodes, edges, resolution]);

  const addModule = useCallback((moduleType: string) => {
    const node = createModuleNode(moduleType, {
      x: 200 + Math.random() * 300,
      y: 100 + Math.random() * 300,
    });
    setNodes(nds => [...nds, node]);
  }, [setNodes]);

  const deleteSelected = useCallback(() => {
    const selectedIds = new Set(nodes.filter(n => n.selected).map(n => n.id));
    setNodes(nds => nds.filter(n => !n.selected));
    setEdges(eds => eds.filter(e => !selectedIds.has(e.source) && !selectedIds.has(e.target)));
  }, [setNodes, setEdges, nodes]);

  const loadPreset = useCallback((preset: typeof PRESETS[0]) => {
    setNodes(preset.nodes.map(n => ({ ...n })));
    setEdges(preset.edges.map(e => ({ ...e })));
  }, [setNodes, setEdges]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '/' || (e.key === 'k' && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        setAddDialogOpen(true);
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelected();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteSelected]);

  const moduleCount = nodes.length;
  const cableCount = edges.length;

  return (
    <NodePreviewContext.Provider value={previews}>
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-background">
        {/* Toolbar */}
        <header
          className="h-11 border-b border-border flex items-center justify-between px-3 shrink-0"
          style={{ background: 'linear-gradient(180deg, hsl(240 24% 10%), hsl(240 24% 7%))' }}
        >
          <div className="flex items-center gap-2">
            {/* Logo */}
            <div className="flex items-center gap-1.5 mr-1">
              <Zap size={13} className="text-primary" style={{ filter: 'drop-shadow(0 0 4px hsl(180 100% 50% / 0.5))' }} />
              <h1 className="text-[11px] font-bold tracking-wider">
                <span className="text-primary text-glow-cyan">TEXTURE</span>
                <span className="text-secondary text-glow-magenta">SYNTH</span>
              </h1>
            </div>

            <div className="h-4 w-px bg-border/50" />

            {/* Add Module */}
            <button
              onClick={() => setAddDialogOpen(true)}
              className="flex items-center gap-1 text-[9px] font-semibold px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
            >
              <Plus size={11} />
              Add
            </button>

            {/* Search hint */}
            <button
              onClick={() => setAddDialogOpen(true)}
              className="flex items-center gap-1 text-[8px] px-1.5 py-0.5 rounded bg-muted/30 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              <Search size={9} />
              <span className="font-mono">/</span>
            </button>

            <div className="h-4 w-px bg-border/50" />

            {/* Presets */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 text-[9px] px-2 py-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors">
                  <RotateCcw size={10} />
                  Presets
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-card border-border min-w-[200px]">
                {PRESETS.map(preset => (
                  <DropdownMenuItem
                    key={preset.id}
                    onClick={() => loadPreset(preset)}
                    className="text-xs cursor-pointer flex flex-col items-start gap-0.5 py-2"
                  >
                    <span className="font-semibold">{preset.name}</span>
                    <span className="text-[9px] text-muted-foreground">{preset.description}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="h-4 w-px bg-border/50" />

            {/* Delete */}
            <button
              onClick={deleteSelected}
              className="flex items-center gap-1 text-[9px] px-2 py-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 size={10} />
              Delete
            </button>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3">
            <span className="text-[7px] text-muted-foreground/40 font-mono uppercase tracking-widest">
              {moduleCount} modules · {cableCount} cables · {Object.keys(MODULES).length} types
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
              deleteKeyCode={[]}
              className="bg-background"
              onDoubleClick={() => setAddDialogOpen(true)}
            >
              <Background variant={BackgroundVariant.Dots} color="hsl(240 15% 13%)" gap={24} size={1} />
              <Controls showInteractive={false} />
              <MiniMap
                nodeColor={() => 'hsl(180 100% 50%)'}
                maskColor="hsl(240 27% 4% / 0.8)"
                style={{ width: 120, height: 80 }}
              />
            </ReactFlow>

            {/* Canvas label */}
            <div className="absolute bottom-3 left-3 text-[7px] text-muted-foreground/20 uppercase tracking-[0.25em] font-mono pointer-events-none">
              Patch Bay — Double-click or press / to add modules
            </div>

            {/* Keyboard shortcuts hint */}
            <div className="absolute top-2 right-2 flex flex-col gap-1 pointer-events-none">
              <div className="text-[7px] text-muted-foreground/25 font-mono flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-muted/20 border border-border/30 text-[7px]">/</kbd> search
              </div>
              <div className="text-[7px] text-muted-foreground/25 font-mono flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-muted/20 border border-border/30 text-[7px]">Del</kbd> delete
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="w-[320px] shrink-0">
            <PreviewPanel output={output} resolution={resolution} onResolutionChange={setResolution} />
          </div>
        </div>

        {/* Add Module Dialog */}
        <AddModuleDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          onAddModule={addModule}
        />
      </div>
    </NodePreviewContext.Provider>
  );
}

const Index = () => (
  <ReactFlowProvider>
    <SynthApp />
  </ReactFlowProvider>
);

export default Index;
