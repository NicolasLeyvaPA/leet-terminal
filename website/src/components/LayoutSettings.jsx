import { useState } from 'react';

// ============================================
// LAYOUT SETTINGS PANEL
// Toggle panel visibility, reorder, and reset layout
// ============================================

export const LayoutSettings = ({
  panels,
  panelInfo,
  visibility,
  toggleVisibility,
  collapsed,
  toggleCollapsed,
  movePanel,
  resetLayout,
  onClose,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="text-[10px] px-2 py-1 rounded bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-orange-400 transition-colors border border-gray-700"
        title="Customize layout"
      >
        <span className="flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          LAYOUT
        </span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-lg border border-gray-700 shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 bg-gradient-to-r from-gray-900 to-orange-900/20">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-bold text-sm">Layout Settings</h2>
              <p className="text-[10px] text-gray-500 mt-0.5">Toggle panels, drag to reorder</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Panel List */}
        <div className="p-4 max-h-96 overflow-y-auto">
          <div className="space-y-2">
            {panels.map((panelId, index) => {
              const info = panelInfo[panelId] || { name: panelId, icon: '?', color: 'gray' };
              const isVisible = visibility[panelId] !== false;
              const isCollapsedPanel = collapsed[panelId] === true;

              return (
                <div
                  key={panelId}
                  className={`flex items-center gap-3 p-2 rounded border transition-all ${
                    isVisible
                      ? 'bg-gray-800/50 border-gray-700'
                      : 'bg-gray-900/50 border-gray-800 opacity-50'
                  }`}
                >
                  {/* Visibility Toggle */}
                  <button
                    onClick={() => toggleVisibility(panelId)}
                    className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                      isVisible
                        ? 'bg-orange-500 text-black'
                        : 'bg-gray-700 text-gray-500'
                    }`}
                  >
                    {isVisible ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 6L9 17l-5-5 1.41-1.41L9 14.17l9.59-9.59L20 6z" />
                      </svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    )}
                  </button>

                  {/* Panel Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{info.icon}</span>
                      <span className="text-sm text-white font-medium truncate">{info.name}</span>
                    </div>
                  </div>

                  {/* Reorder Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => movePanel(panelId, 'up')}
                      disabled={index === 0}
                      className={`p-1 rounded transition-colors ${
                        index === 0
                          ? 'text-gray-700 cursor-not-allowed'
                          : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                      }`}
                      title="Move up"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 15l-6-6-6 6" />
                      </svg>
                    </button>
                    <button
                      onClick={() => movePanel(panelId, 'down')}
                      disabled={index === panels.length - 1}
                      className={`p-1 rounded transition-colors ${
                        index === panels.length - 1
                          ? 'text-gray-700 cursor-not-allowed'
                          : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                      }`}
                      title="Move down"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-gray-900/50">
          <div className="flex items-center justify-between">
            <button
              onClick={resetLayout}
              className="text-[11px] px-3 py-1.5 rounded bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors"
            >
              Reset to Default
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="text-[11px] px-4 py-1.5 rounded bg-orange-500 text-black font-bold hover:bg-orange-400 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LayoutSettings;
