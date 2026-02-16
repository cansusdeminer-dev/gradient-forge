import React, { useRef, useEffect, useCallback } from 'react';
import { Download } from 'lucide-react';

interface PreviewPanelProps {
  output: ImageData | null;
  resolution: number;
  onResolutionChange: (res: number) => void;
}

const RESOLUTIONS = [128, 256, 512, 1024];

const PreviewPanel: React.FC<PreviewPanelProps> = ({ output, resolution, onResolutionChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    if (output) {
      canvas.width = output.width;
      canvas.height = output.height;
      ctx.putImageData(output, 0, 0);
    } else {
      canvas.width = resolution;
      canvas.height = resolution;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, resolution, resolution);
      ctx.fillStyle = '#333';
      ctx.font = '14px JetBrains Mono';
      ctx.textAlign = 'center';
      ctx.fillText('No output', resolution / 2, resolution / 2);
    }
  }, [output, resolution]);

  const handleExport = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `texturesynth-${resolution}x${resolution}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [resolution]);

  return (
    <div className="flex flex-col h-full bg-card border-l border-border">
      {/* Header */}
      <div className="px-4 py-2 border-b border-border flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-primary text-glow-cyan">
          Preview
        </span>
        <div className="flex items-center gap-2">
          {RESOLUTIONS.map(res => (
            <button
              key={res}
              onClick={() => onResolutionChange(res)}
              className={`text-[9px] font-mono px-1.5 py-0.5 rounded transition-colors ${
                resolution === res
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {res}
            </button>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="border border-border/50 rounded-sm max-w-full max-h-full"
          style={{
            imageRendering: resolution <= 256 ? 'pixelated' : 'auto',
            boxShadow: '0 0 30px hsl(180 100% 50% / 0.08), 0 4px 20px hsl(0 0% 0% / 0.5)',
          }}
        />
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-border flex items-center justify-between">
        <span className="text-[9px] text-muted-foreground font-mono">
          {resolution}×{resolution}px
        </span>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
        >
          <Download size={12} />
          Export PNG
        </button>
      </div>
    </div>
  );
};

export default PreviewPanel;
