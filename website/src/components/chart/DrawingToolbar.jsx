import { useState } from 'react';

const TOOLS = [
  { id: 'none', label: 'PTR', title: 'Pointer (no drawing)', icon: '↖' },
  { id: 'trendline', label: 'TRD', title: 'Trend line (click 2 points)', icon: '╲' },
  { id: 'hline', label: 'HLN', title: 'Horizontal line (click price level)', icon: '─' },
  { id: 'ray', label: 'RAY', title: 'Ray (click 2 points, extends one direction)', icon: '╱' },
  { id: 'fibonacci', label: 'FIB', title: 'Fibonacci retracement (click high & low)', icon: '≡' },
];

export const DrawingToolbar = ({ activeTool, onToolChange, onClear, onUndo, drawingCount = 0 }) => {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="absolute top-1 left-1 z-20 bg-gray-900/90 border border-gray-700 rounded px-1.5 py-0.5 text-[9px] text-gray-400 hover:text-orange-400 transition-colors"
        title="Show drawing tools"
      >
        Draw
      </button>
    );
  }

  return (
    <div className="absolute top-1 left-1 z-20 flex items-center gap-0.5 bg-gray-900/90 border border-gray-700/60 rounded-md px-1 py-0.5 backdrop-blur-sm">
      {TOOLS.map((t) => (
        <button
          key={t.id}
          onClick={() => onToolChange(t.id)}
          title={t.title}
          className={`px-1.5 py-0.5 text-[9px] font-mono rounded transition-all ${
            activeTool === t.id
              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
              : 'text-gray-500 hover:text-gray-300 border border-transparent'
          }`}
        >
          <span className="mr-0.5">{t.icon}</span>
          {t.label}
        </button>
      ))}

      <div className="w-px h-3 bg-gray-700 mx-0.5" />

      {drawingCount > 0 && (
        <>
          <button
            onClick={onUndo}
            title="Undo last drawing"
            className="px-1.5 py-0.5 text-[9px] text-gray-500 hover:text-yellow-400 transition-colors"
          >
            ↩
          </button>
          <button
            onClick={onClear}
            title="Clear all drawings"
            className="px-1.5 py-0.5 text-[9px] text-gray-500 hover:text-red-400 transition-colors"
          >
            ✕
          </button>
          <span className="text-[8px] text-gray-600 ml-0.5">{drawingCount}</span>
        </>
      )}

      <button
        onClick={() => setCollapsed(true)}
        title="Collapse toolbar"
        className="px-1 py-0.5 text-[9px] text-gray-600 hover:text-gray-400 ml-0.5"
      >
        ‹
      </button>
    </div>
  );
};
