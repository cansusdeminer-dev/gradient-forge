import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Download, Grid3X3, Maximize2 } from 'lucide-react';

interface PreviewPanelProps {
  output: ImageData | null;
  resolution: number;
  onResolutionChange: (res: number) => void;
}

const RESOLUTIONS = [128, 256, 512, 1024];

const PreviewPanel: React.FC<PreviewPanelProps> = ({ output, resolution, onResolutionChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tiling, setTiling] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    if (output) {
      if (tiling) {
        canvas.width = output.width * 2;
        canvas.height = output.height * 2;
        const tmp = document.createElement('canvas');
        tmp.width = output.width; tmp.height = output.height;
        tmp.getContext('2d')!.putImageData(output, 0, 0);
        ctx.drawImage(tmp, 0, 0);
        ctx.drawImage(tmp, output.width, 0);
        ctx.drawImage(tmp, 0, output.height);
        ctx.drawImage(tmp, output.width, output.height);
      } else {
        canvas.width = output.width;
        canvas.height = output.height;
        ctx.putImageData(output, 0, 0);
      }
    } else {
      canvas.width = resolution;
      canvas.height = resolution;
      ctx.fillStyle = '#0a0a12';
      ctx.fillRect(0, 0, resolution, resolution);
      ctx.fillStyle = '#333';
      ctx.font = '12px JetBrains Mono';
      ctx.textAlign = 'center';
      ctx.fillText('Connect to Output', resolution / 2, resolution / 2);
    }
  }, [output, resolution, tiling]);

  const handleExport = useCallback((format: 'png' | 'jpeg' | 'webp' = 'png') => {
    const canvas = canvasRef.current;
    if (!canvas || !output) return;
    // Re-render at full res without tiling for export
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = output.width;
    exportCanvas.height = output.height;
    exportCanvas.getContext('2d')!.putImageData(output, 0, 0);
    const link = document.createElement('a');
    const mimeType = format === 'png' ? 'image/png' : format === 'jpeg' ? 'image/jpeg' : 'image/webp';
    link.download = `texturesynth-${resolution}x${resolution}.${format}`;
    link.href = exportCanvas.toDataURL(mimeType, 0.95);
    link.click();
  }, [output, resolution]);

  return (
    <div className={`flex flex-col h-full bg-card border-l border-border ${fullscreen ? 'fixed inset-0 z-50 border-none' : ''}`}>
      {/* Header */}
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-primary text-glow-cyan">
          Preview
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setTiling(!tiling)}
            className={`p-1 rounded transition-colors ${tiling ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            title="Toggle tiling preview"
          >
            <Grid3X3 size={12} />
          </button>
          <button
            onClick={() => setFullscreen(!fullscreen)}
            className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
            title="Toggle fullscreen"
          >
            <Maximize2 size={12} />
          </button>
        </div>
      </div>

      {/* Resolution */}
      <div className="px-3 py-1.5 border-b border-border/50 flex items-center gap-1">
        {RESOLUTIONS.map(res => (
          <button
            key={res}
            onClick={() => onResolutionChange(res)}
            className={`text-[8px] font-mono px-1.5 py-0.5 rounded transition-colors ${
              resolution === res ? 'bg-primary/20 text-primary' : 'text-muted-foreground/60 hover:text-foreground'
            }`}
          >
            {res}
          </button>
        ))}
        <span className="text-[7px] text-muted-foreground/40 ml-auto font-mono">
          {tiling ? `${resolution * 2}×${resolution * 2} tiled` : `${resolution}×${resolution}`}
        </span>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex items-center justify-center p-3 overflow-hidden bg-[#050508]">
        <canvas
          ref={canvasRef}
          className="border border-border/30 rounded-sm max-w-full max-h-full"
          style={{
            imageRendering: resolution <= 256 && !tiling ? 'pixelated' : 'auto',
            boxShadow: '0 0 40px hsl(180 100% 50% / 0.06), 0 4px 20px hsl(0 0% 0% / 0.5)',
          }}
        />
      </div>

      {/* Export */}
      <div className="px-3 py-2 border-t border-border flex items-center gap-1.5">
        <button
          onClick={() => handleExport('png')}
          className="flex items-center gap-1 text-[9px] font-semibold px-2.5 py-1.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
        >
          <Download size={10} />
          PNG
        </button>
        <button
          onClick={() => handleExport('jpeg')}
          className="text-[9px] font-semibold px-2 py-1.5 rounded bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
        >
          JPG
        </button>
        <button
          onClick={() => handleExport('webp')}
          className="text-[9px] font-semibold px-2 py-1.5 rounded bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
        >
          WebP
        </button>
      </div>
    </div>
  );
};

export default PreviewPanel;
