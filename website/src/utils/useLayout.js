import { useState, useEffect, useCallback } from 'react';

// ============================================
// LAYOUT MANAGEMENT HOOK
// Handles panel ordering, visibility, and persistence
// ============================================

// Default panel configuration
const DEFAULT_PANELS = {
  analysis: ['marketOverview', 'priceChart', 'confluence', 'modelBreakdown', 'monteCarlo', 'profitTester', 'orderBook'],
  portfolio: ['portfolio', 'priceChart', 'orderBook', 'monteCarlo', 'profitTester'],
  lab: ['quantumLab', 'monteCarlo', 'confluence', 'modelBreakdown', 'profitTester'],
};

// Panel metadata
const PANEL_INFO = {
  marketOverview: { name: 'Market Overview', icon: '📊', color: 'orange' },
  priceChart: { name: 'Price Chart', icon: '📈', color: 'blue' },
  confluence: { name: 'Confluence', icon: '🎯', color: 'purple' },
  modelBreakdown: { name: 'Model Analysis', icon: '🔬', color: 'cyan' },
  monteCarlo: { name: 'Outcome Simulator', icon: '🎲', color: 'green' },
  profitTester: { name: 'Profit Tester', icon: '💰', color: 'green' },
  orderBook: { name: 'Order Book', icon: '📖', color: 'red' },
  portfolio: { name: 'Portfolio', icon: '💼', color: 'orange' },
  quantumLab: { name: 'Quantum Lab', icon: '⚛️', color: 'purple' },
  newsFeed: { name: 'News Feed', icon: '📰', color: 'blue' },
};

const STORAGE_KEY = 'leet-terminal-layout';

export const useLayout = (workspace = 'analysis') => {
  // Load saved layout from localStorage or use defaults
  const [layouts, setLayouts] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_PANELS, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to load saved layout:', e);
    }
    return DEFAULT_PANELS;
  });

  // Current workspace panels
  const [panels, setPanels] = useState(layouts[workspace] || DEFAULT_PANELS.analysis);

  // Panel visibility state
  const [visibility, setVisibility] = useState(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}-visibility`);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    // All panels visible by default
    return Object.keys(PANEL_INFO).reduce((acc, key) => ({ ...acc, [key]: true }), {});
  });

  // Collapsed panels state
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}-collapsed`);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {};
  });

  // Drag state
  const [dragState, setDragState] = useState({
    isDragging: false,
    draggedPanel: null,
    dragOverPanel: null,
  });

  // Update panels when workspace changes
  useEffect(() => {
    setPanels(layouts[workspace] || DEFAULT_PANELS.analysis);
  }, [workspace, layouts]);

  // Persist layouts to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
    } catch (e) {
      console.warn('Failed to save layout:', e);
    }
  }, [layouts]);

  // Persist visibility to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}-visibility`, JSON.stringify(visibility));
    } catch (e) {}
  }, [visibility]);

  // Persist collapsed state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}-collapsed`, JSON.stringify(collapsed));
    } catch (e) {}
  }, [collapsed]);

  // Start dragging a panel
  const startDrag = useCallback((panelId) => {
    setDragState({
      isDragging: true,
      draggedPanel: panelId,
      dragOverPanel: null,
    });
  }, []);

  // Handle drag over another panel
  const handleDragOver = useCallback((panelId) => {
    setDragState(prev => ({
      ...prev,
      dragOverPanel: panelId,
    }));
  }, []);

  // End drag and reorder if needed
  const endDrag = useCallback(() => {
    const { draggedPanel, dragOverPanel } = dragState;

    if (draggedPanel && dragOverPanel && draggedPanel !== dragOverPanel) {
      setPanels(prev => {
        const newPanels = [...prev];
        const fromIndex = newPanels.indexOf(draggedPanel);
        const toIndex = newPanels.indexOf(dragOverPanel);

        if (fromIndex !== -1 && toIndex !== -1) {
          // Remove from old position and insert at new position
          newPanels.splice(fromIndex, 1);
          newPanels.splice(toIndex, 0, draggedPanel);

          // Save to layouts
          setLayouts(prevLayouts => ({
            ...prevLayouts,
            [workspace]: newPanels,
          }));
        }

        return newPanels;
      });
    }

    setDragState({
      isDragging: false,
      draggedPanel: null,
      dragOverPanel: null,
    });
  }, [dragState, workspace]);

  // Cancel drag
  const cancelDrag = useCallback(() => {
    setDragState({
      isDragging: false,
      draggedPanel: null,
      dragOverPanel: null,
    });
  }, []);

  // Toggle panel visibility
  const toggleVisibility = useCallback((panelId) => {
    setVisibility(prev => ({
      ...prev,
      [panelId]: !prev[panelId],
    }));
  }, []);

  // Toggle panel collapsed state
  const toggleCollapsed = useCallback((panelId) => {
    setCollapsed(prev => ({
      ...prev,
      [panelId]: !prev[panelId],
    }));
  }, []);

  // Reset to default layout
  const resetLayout = useCallback(() => {
    setLayouts(DEFAULT_PANELS);
    setPanels(DEFAULT_PANELS[workspace] || DEFAULT_PANELS.analysis);
    setVisibility(Object.keys(PANEL_INFO).reduce((acc, key) => ({ ...acc, [key]: true }), {}));
    setCollapsed({});
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(`${STORAGE_KEY}-visibility`);
    localStorage.removeItem(`${STORAGE_KEY}-collapsed`);
  }, [workspace]);

  // Move panel to specific position
  const movePanel = useCallback((panelId, direction) => {
    setPanels(prev => {
      const index = prev.indexOf(panelId);
      if (index === -1) return prev;

      const newPanels = [...prev];
      const newIndex = direction === 'up' ? index - 1 : index + 1;

      if (newIndex < 0 || newIndex >= newPanels.length) return prev;

      // Swap positions
      [newPanels[index], newPanels[newIndex]] = [newPanels[newIndex], newPanels[index]];

      // Save to layouts
      setLayouts(prevLayouts => ({
        ...prevLayouts,
        [workspace]: newPanels,
      }));

      return newPanels;
    });
  }, [workspace]);

  // Get visible panels in order
  const visiblePanels = panels.filter(p => visibility[p] !== false);

  return {
    // Panel data
    panels,
    visiblePanels,
    panelInfo: PANEL_INFO,

    // Visibility
    visibility,
    toggleVisibility,

    // Collapsed state
    collapsed,
    toggleCollapsed,

    // Drag & drop
    dragState,
    startDrag,
    handleDragOver,
    endDrag,
    cancelDrag,

    // Utilities
    movePanel,
    resetLayout,
  };
};

export default useLayout;
