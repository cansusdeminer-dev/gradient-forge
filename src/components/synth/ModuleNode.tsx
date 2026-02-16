import React, { useCallback } from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import { MODULES } from '@/lib/modules';
import Knob from './Knob';

interface ModuleNodeData {
  moduleType: string;
  params: Record<string, number>;
  label: string;
  [key: string]: unknown;
}

const CATEGORY_LABELS: Record<string, string> = {
  generator: 'GEN',
  modifier: 'MOD',
  output: 'OUT',
};

const ModuleNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const { moduleType, params, label } = data as ModuleNodeData;
  const moduleDef = MODULES[moduleType];
  const { setNodes } = useReactFlow();

  const handleParamChange = useCallback((paramId: string, value: number) => {
    setNodes(nds => nds.map(n =>
      n.id === id
        ? { ...n, data: { ...n.data, params: { ...(n.data as ModuleNodeData).params, [paramId]: value } } }
        : n
    ));
  }, [id, setNodes]);

  if (!moduleDef) return null;

  const categoryLabel = CATEGORY_LABELS[moduleDef.category] || '';

  return (
    <div
      className={`
        rounded-lg border overflow-hidden min-w-[160px] transition-shadow duration-200
        ${selected ? 'glow-cyan border-primary/60' : 'border-border/50'}
      `}
      style={{ background: 'hsl(240 20% 12%)' }}
    >
      {/* Header */}
      <div
        className="px-3 py-1.5 flex items-center justify-between gap-2"
        style={{
          background: `linear-gradient(135deg, ${moduleDef.color}15, ${moduleDef.color}08)`,
          borderBottom: `1px solid ${moduleDef.color}30`,
        }}
      >
        <span className="text-[10px] font-semibold text-foreground truncate">
          {label}
        </span>
        <span
          className="text-[8px] font-bold px-1.5 py-0.5 rounded"
          style={{
            color: moduleDef.color,
            background: `${moduleDef.color}15`,
          }}
        >
          {categoryLabel}
        </span>
      </div>

      {/* Params */}
      {moduleDef.params.length > 0 && (
        <div className="px-2 py-2 flex flex-wrap justify-center gap-1">
          {moduleDef.params.map(param => (
            <Knob
              key={param.id}
              value={params[param.id] ?? param.default}
              min={param.min}
              max={param.max}
              step={param.step}
              label={param.label}
              onChange={(v) => handleParamChange(param.id, v)}
              color={moduleDef.color}
            />
          ))}
        </div>
      )}

      {/* Empty state for output */}
      {moduleDef.params.length === 0 && (
        <div className="px-3 py-3 text-center">
          <span className="text-[9px] text-muted-foreground/40 uppercase tracking-widest">
            {moduleDef.category === 'output' ? '◉ Final Output' : 'No params'}
          </span>
        </div>
      )}

      {/* Input handles */}
      {moduleDef.inputs.map((inputId, i) => {
        const total = moduleDef.inputs.length;
        const topPercent = total === 1 ? 50 : 25 + (i * 50) / (total - 1);
        return (
          <Handle
            key={`in-${inputId}`}
            type="target"
            position={Position.Left}
            id={inputId}
            style={{ top: `${topPercent}%` }}
          />
        );
      })}

      {/* Output handles */}
      {moduleDef.outputs.map((outputId, i) => {
        const total = moduleDef.outputs.length;
        const topPercent = total === 1 ? 50 : 25 + (i * 50) / (total - 1);
        return (
          <Handle
            key={`out-${outputId}`}
            type="source"
            position={Position.Right}
            id={outputId}
            style={{ top: `${topPercent}%` }}
          />
        );
      })}
    </div>
  );
};

export default ModuleNode;
