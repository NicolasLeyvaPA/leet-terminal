import { useState } from 'react';

// ============================================
// ENHANCED PANEL HEADER
// Supports drag-and-drop reordering and collapse
// ============================================

export const PanelHeader = ({
  title,
  subtitle,
  actions,
  // Drag & drop props
  draggable = false,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging = false,
  isDragOver = false,
  // Collapse props
  collapsible = false,
  isCollapsed = false,
  onToggleCollapse,
  // Panel ID for drag operations
  panelId,
}) => {
  const [isHovering, setIsHovering] = useState(false);

  const handleDragStart = (e) => {
    if (!draggable || !onDragStart) return;

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', panelId);
    onDragStart(panelId);
  };

  const handleDragOver = (e) => {
    if (!draggable) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (onDragOver) onDragOver(panelId);
  };

  const handleDragEnd = () => {
    if (onDragEnd) onDragEnd();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (onDragEnd) onDragEnd();
  };

  return (
    <div
      className={`panel-header flex items-center justify-between transition-colors ${
        isDragging ? 'opacity-50 bg-orange-500/10' : ''
      } ${isDragOver ? 'bg-orange-500/20 border-orange-500' : ''}`}
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDrop={handleDrop}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {/* Drag Handle */}
        {draggable && (
          <span
            className={`cursor-grab active:cursor-grabbing text-gray-600 hover:text-orange-400 transition-colors ${
              isHovering ? 'opacity-100' : 'opacity-30'
            }`}
            title="Drag to reorder"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="9" cy="6" r="2" />
              <circle cx="9" cy="12" r="2" />
              <circle cx="9" cy="18" r="2" />
              <circle cx="15" cy="6" r="2" />
              <circle cx="15" cy="12" r="2" />
              <circle cx="15" cy="18" r="2" />
            </svg>
          </span>
        )}

        {/* Title */}
        <span className="truncate">{title}</span>
        {subtitle && (
          <span className="text-gray-600 font-normal text-xs truncate">| {subtitle}</span>
        )}
      </div>

      <div className="flex items-center gap-1">
        {/* Custom actions */}
        {actions}

        {/* Collapse button */}
        {collapsible && (
          <button
            onClick={onToggleCollapse}
            className={`p-0.5 rounded hover:bg-gray-700 transition-colors ${
              isHovering ? 'opacity-100' : 'opacity-30'
            }`}
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default PanelHeader;
