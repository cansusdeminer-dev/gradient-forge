import React, { useRef, useCallback } from 'react';

interface KnobProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  label: string;
  onChange: (value: number) => void;
  color?: string;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  if (Math.abs(endAngle - startAngle) < 0.1) return '';
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

const Knob: React.FC<KnobProps> = ({
  value, min, max, step = 0.01, label, onChange, color = 'hsl(180 100% 50%)'
}) => {
  const dragRef = useRef({ dragging: false, startY: 0, startValue: 0 });

  const normalized = (value - min) / (max - min);
  const startAngle = -135;
  const endAngle = -135 + normalized * 270;

  const size = 40;
  const cx = size / 2, cy = size / 2, r = 15;

  const indicator = polarToCartesian(cx, cy, r - 3, endAngle);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
    dragRef.current = { dragging: true, startY: e.clientY, startValue: value };
  }, [value]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.dragging) return;
    const delta = (dragRef.current.startY - e.clientY) / 120;
    const range = max - min;
    let newValue = dragRef.current.startValue + delta * range;
    newValue = Math.min(max, Math.max(min, newValue));
    newValue = Math.round(newValue / step) * step;
    onChange(newValue);
  }, [min, max, step, onChange]);

  const handlePointerUp = useCallback(() => {
    dragRef.current.dragging = false;
  }, []);

  const displayValue = step >= 1 ? value.toFixed(0) : value.toFixed(2);

  return (
    <div className="flex flex-col items-center gap-0 select-none cursor-ns-resize" style={{ width: 52 }}>
      <svg
        width={size}
        height={size}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="touch-none"
      >
        {/* Track */}
        <path
          d={describeArc(cx, cy, r, -135, 135)}
          fill="none"
          stroke="hsl(240 15% 22%)"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        {/* Active arc */}
        {Math.abs(endAngle - startAngle) > 0.1 && (
          <path
            d={describeArc(cx, cy, r, startAngle, endAngle)}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 3px ${color})` }}
          />
        )}
        {/* Center dot */}
        <circle cx={cx} cy={cy} r={3} fill="hsl(240 15% 18%)" stroke="hsl(240 15% 30%)" strokeWidth={1} />
        {/* Indicator */}
        <circle
          cx={indicator.x}
          cy={indicator.y}
          r={2}
          fill={color}
          style={{ filter: `drop-shadow(0 0 2px ${color})` }}
        />
      </svg>
      <span className="text-[8px] text-muted-foreground truncate max-w-[52px] text-center leading-tight">
        {label}
      </span>
      <span className="text-[7px] text-muted-foreground/50 font-mono leading-tight">
        {displayValue}
      </span>
    </div>
  );
};

export default Knob;
