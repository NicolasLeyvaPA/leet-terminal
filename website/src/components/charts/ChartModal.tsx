/**
 * Chart Fullscreen Modal
 *
 * Provides a fullscreen view for any chart component.
 */

import React, { useEffect, useCallback } from 'react';

interface ChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  helpText?: string;
  children: React.ReactNode;
}

export function ChartModal({
  isOpen,
  onClose,
  title,
  helpText,
  children,
}: ChartModalProps) {
  // Handle escape key
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="chart-modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Header */}
      <div
        className="chart-modal-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px',
          borderBottom: '1px solid #333',
          backgroundColor: '#0a0a0a',
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 600,
              color: '#fff',
            }}
          >
            {title}
          </h2>
          {helpText && (
            <p
              style={{
                margin: '4px 0 0 0',
                fontSize: '12px',
                color: '#888',
              }}
            >
              {helpText}
            </p>
          )}
        </div>

        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: '1px solid #444',
            borderRadius: '4px',
            padding: '8px 16px',
            color: '#888',
            cursor: 'pointer',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#666';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#444';
            e.currentTarget.style.color = '#888';
          }}
        >
          <span>ESC</span>
          <span>Close</span>
        </button>
      </div>

      {/* Chart Container */}
      <div
        className="chart-modal-content"
        style={{
          flex: 1,
          padding: '24px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#0d0d0d',
            borderRadius: '8px',
            border: '1px solid #222',
          }}
        >
          {children}
        </div>
      </div>

      {/* Footer with controls hint */}
      <div
        className="chart-modal-footer"
        style={{
          padding: '12px 24px',
          borderTop: '1px solid #333',
          backgroundColor: '#0a0a0a',
          display: 'flex',
          justifyContent: 'center',
          gap: '24px',
          fontSize: '11px',
          color: '#666',
        }}
      >
        <span>🖱️ Scroll to zoom</span>
        <span>✋ Drag to pan</span>
        <span>📍 Hover for details</span>
      </div>
    </div>
  );
}

/**
 * Expand Button Component
 */
export function ExpandButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Expand to fullscreen"
      style={{
        background: 'transparent',
        border: '1px solid #333',
        borderRadius: '4px',
        padding: '4px 8px',
        color: '#666',
        cursor: 'pointer',
        fontSize: '11px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#ff6b00';
        e.currentTarget.style.color = '#ff6b00';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#333';
        e.currentTarget.style.color = '#666';
      }}
    >
      <span style={{ fontSize: '10px' }}>⛶</span>
      Expand
    </button>
  );
}

export default ChartModal;
