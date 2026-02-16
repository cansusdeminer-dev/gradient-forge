import React, { useCallback, useContext } from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import { MODULES } from '@/lib/modules';
import { NodePreviewContext } from '@/lib/synthContext';
import Knob from './Knob';

interface ModuleNodeData {
  moduleType: string;
  params: Record<string, number>;
  label: string;
  [key: string]: unknown;
}

const CATEGORY_COLORS: Record<string, string> = {
  generator: 'hsl(180 100% 50%)',
  modifier: 'hsl(300 100% 60%)',
  fx: 'hsl(45 100% 55%)',
  utility: 'hsl(120 100% 45%)',
};

const CATEGORY_LABELS: Record<string, string> = {
  generator: 'GEN',
  modifier: 'MOD',
  fx: 'FX',
  utility: 'UTIL',
};

const ModuleNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const { moduleType, params, label } = data as ModuleNodeData;
  const moduleDef = MODULES[moduleType];
  const { setNodes } = useReactFlow();
  const previews = useContext(NodePreviewContext);
  const preview = previews.get(id);

  const handleParamChange = useCallback((paramId: string, value: number) => {
    setNodes(nds => nds.map(n =>
      n.id === id
        ? { ...n, data: { ...n.data, params: { ...(n.data as ModuleNodeData).params, [paramId]: value } } }
        : n
    ));
  }, [id, setNodes]);

  if (!moduleDef) return null;

  const catColor = CATEGORY_COLORS[moduleDef.category] || 'hsl(180 100% 50%)';
  const catLabel = CATEGORY_LABELS[moduleDef.category] || '';

  return (
    <div
      className={`rounded-lg border overflow-hidden transition-shadow duration-200 ${selected ? 'border-primary/60' : 'border-border/40'}`}
      style={{
        background: 'hsl(240 20% 11%)',
        minWidth: moduleDef.params.length > 4 ? 200 : 160,
        boxShadow: selected
          ? `0 0 16px ${catColor}30, 0 0 4px ${catColor}20`
          : '0 2px 8px hsl(0 0% 0% / 0.3)',
      }}
    >
      {/* Header */}
      <div
        className="px-2.5 py-1.5 flex items-center justify-between gap-2"
        style={{
          background: `linear-gradient(135deg, ${catColor}12, ${catColor}06)`,
          borderBottom: `1px solid ${catColor}25`,
        }}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[10px] opacity-60">{moduleDef.icon}</span>
          <span className="text-[10px] font-semibold text-foreground truncate">{label}</span>
        </div>
        <span
          className="text-[7px] font-bold px-1.5 py-0.5 rounded shrink-0"
          style={{ color: catColor, background: `${catColor}12` }}
        >
          {catLabel}
        </span>
      </div>

      {/* Mini Preview */}
      {preview && (
        <div className="px-2 pt-2 flex justify-center">
          <img
            src={preview}
            width={56}
            height={56}
            className="rounded border border-border/30"
            style={{ imageRendering: 'auto' }}
            alt="preview"
          />
        </div>
      )}

      {/* Params */}
      {moduleDef.params.length > 0 && (
        <div className="px-1.5 py-2 flex flex-wrap justify-center gap-0.5">
          {moduleDef.params.map(param => (
            <Knob
              key={param.id}
              value={params[param.id] ?? param.default}
              min={param.min}
              max={param.max}
              step={param.step}
              label={param.label}
              onChange={(v) => handleParamChange(param.id, v)}
              color={catColor}
            />
          ))}
        </div>
      )}

      {/* Empty state for output */}
      {moduleDef.params.length === 0 && !preview && (
        <div className="px-3 py-3 text-center">
          <span className="text-[9px] text-muted-foreground/40 uppercase tracking-widest">
            {moduleDef.category === 'utility' ? '◉ Final Output' : 'No params'}
          </span>
        </div>
      )}

      {/* Input handles */}
      {moduleDef.inputs.map((inputId, i) => {
        const total = moduleDef.inputs.length;
        const topPercent = total === 1 ? 50 : 30 + (i * 40) / Math.max(total - 1, 1);
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
        const topPercent = total === 1 ? 50 : 30 + (i * 40) / Math.max(total - 1, 1);
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
