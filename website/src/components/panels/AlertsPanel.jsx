import { useState } from 'react';
import { PanelHeader } from '../PanelHeader';
import { Tag } from '../Tag';
import { useAlerts, ALERT_TYPES, ALERT_STATUS } from '../../utils/alertsEngine';

/**
 * Alerts Management Panel
 * 
 * Create, view, and manage price/volume alerts.
 */
export const AlertsPanel = ({ markets, selectedMarket, onSelectMarket }) => {
  const {
    alerts,
    triggeredAlerts,
    activeAlerts,
    createAlert,
    deleteAlert,
    togglePause,
    clearHistory,
    soundEnabled,
    toggleSound,
  } = useAlerts();
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [newAlert, setNewAlert] = useState({
    type: ALERT_TYPES.PRICE_ABOVE,
    targetValue: '',
    note: '',
  });

  // Handle creating alert for selected market
  const handleCreateAlert = () => {
    if (!selectedMarket || !newAlert.targetValue) return;
    
    const targetValue = parseFloat(newAlert.targetValue) / 100; // Convert from cents
    if (isNaN(targetValue) || targetValue < 0 || targetValue > 1) return;
    
    createAlert({
      marketId: selectedMarket.id,
      marketTicker: selectedMarket.ticker,
      marketQuestion: selectedMarket.question,
      type: newAlert.type,
      targetValue,
      note: newAlert.note,
    });
    
    setNewAlert({ type: ALERT_TYPES.PRICE_ABOVE, targetValue: '', note: '' });
    setShowCreateForm(false);
  };

  // Format price as cents
  const formatPrice = (prob) => `${(prob * 100).toFixed(1)}¢`;

  // Get alert type icon
  const getTypeIcon = (type) => {
    switch (type) {
      case ALERT_TYPES.PRICE_ABOVE: return '↑';
      case ALERT_TYPES.PRICE_BELOW: return '↓';
      case ALERT_TYPES.PRICE_CROSS: return '↕';
      case ALERT_TYPES.VOLUME_SPIKE: return '📊';
      case ALERT_TYPES.SPREAD_WIDE: return '↔';
      default: return '•';
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case ALERT_STATUS.ACTIVE: return 'text-green-400';
      case ALERT_STATUS.TRIGGERED: return 'text-orange-400';
      case ALERT_STATUS.PAUSED: return 'text-gray-500';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="terminal-panel h-full flex flex-col">
      <PanelHeader 
        title="ALERTS" 
        subtitle={`${activeAlerts.length} active`}
      />
      
      {/* Controls */}
      <div className="px-2 py-1.5 border-b border-gray-800 bg-gray-900/50 flex gap-2 items-center">
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className={`px-2 py-0.5 text-xs rounded ${
            showCreateForm 
              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50' 
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          + New
        </button>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className={`px-2 py-0.5 text-xs rounded ${
            showHistory 
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' 
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          History ({triggeredAlerts.length})
        </button>
        <div className="flex-1" />
        <button
          onClick={toggleSound}
          className={`px-2 py-0.5 text-xs rounded ${
            soundEnabled 
              ? 'bg-gray-800 text-green-400' 
              : 'bg-gray-800 text-gray-500'
          }`}
          title={soundEnabled ? 'Sound on' : 'Sound off'}
        >
          {soundEnabled ? '🔔' : '🔕'}
        </button>
      </div>

      {/* Create Alert Form */}
      {showCreateForm && (
        <div className="px-2 py-2 border-b border-gray-800 bg-gray-900/30">
          {selectedMarket ? (
            <>
              <div className="text-xs text-orange-500 font-bold mb-2 truncate">
                {selectedMarket.ticker}
              </div>
              <div className="text-xs text-gray-500 mb-2 truncate">
                Current: {formatPrice(selectedMarket.market_prob)}
              </div>
              
              <div className="flex gap-2 mb-2">
                <select
                  value={newAlert.type}
                  onChange={(e) => setNewAlert({ ...newAlert, type: e.target.value })}
                  className="flex-1 bg-gray-800 text-xs text-gray-300 rounded px-2 py-1 border border-gray-700"
                >
                  <option value={ALERT_TYPES.PRICE_ABOVE}>Price Above</option>
                  <option value={ALERT_TYPES.PRICE_BELOW}>Price Below</option>
                  <option value={ALERT_TYPES.PRICE_CROSS}>Price Crosses</option>
                </select>
                <input
                  type="number"
                  placeholder="Target ¢"
                  value={newAlert.targetValue}
                  onChange={(e) => setNewAlert({ ...newAlert, targetValue: e.target.value })}
                  className="w-20 bg-gray-800 text-xs text-gray-300 rounded px-2 py-1 border border-gray-700"
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>
              
              <input
                type="text"
                placeholder="Note (optional)"
                value={newAlert.note}
                onChange={(e) => setNewAlert({ ...newAlert, note: e.target.value })}
                className="w-full bg-gray-800 text-xs text-gray-300 rounded px-2 py-1 border border-gray-700 mb-2"
              />
              
              <button
                onClick={handleCreateAlert}
                disabled={!newAlert.targetValue}
                className="w-full bg-orange-500/20 text-orange-400 text-xs py-1 rounded hover:bg-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Alert
              </button>
            </>
          ) : (
            <div className="text-xs text-gray-500 text-center py-4">
              Select a market to create an alert
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="panel-content flex-1 overflow-y-auto">
        {showHistory ? (
          // Triggered Alerts History
          <>
            {triggeredAlerts.length > 0 && (
              <button
                onClick={clearHistory}
                className="w-full px-2 py-1 text-xs text-gray-500 hover:text-red-400 text-center border-b border-gray-900"
              >
                Clear History
              </button>
            )}
            {triggeredAlerts.length === 0 ? (
              <div className="text-xs text-gray-600 text-center py-8">
                No triggered alerts yet
              </div>
            ) : (
              triggeredAlerts.map((alert, i) => (
                <div
                  key={`${alert.id}-${i}`}
                  className="px-2 py-2 border-b border-gray-900 hover:bg-gray-900/50"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-orange-500 truncate">
                      {alert.marketTicker}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(alert.triggeredAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {getTypeIcon(alert.type)} {formatPrice(alert.targetValue)} → {formatPrice(alert.triggeredPrice)}
                  </div>
                  {alert.note && (
                    <div className="text-xs text-gray-600 mt-1 truncate">
                      {alert.note}
                    </div>
                  )}
                </div>
              ))
            )}
          </>
        ) : (
          // Active Alerts
          <>
            {alerts.length === 0 ? (
              <div className="text-xs text-gray-600 text-center py-8">
                No alerts set.<br />
                Select a market and click "+ New" to create one.
              </div>
            ) : (
              alerts.map((alert) => {
                const market = markets?.find(m => m.id === alert.marketId);
                const currentPrice = market?.market_prob;
                
                return (
                  <div
                    key={alert.id}
                    className={`px-2 py-2 border-b border-gray-900 hover:bg-gray-900/50 cursor-pointer ${
                      alert.status === ALERT_STATUS.PAUSED ? 'opacity-50' : ''
                    }`}
                    onClick={() => market && onSelectMarket?.(market)}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-orange-500 truncate flex-1">
                        {alert.marketTicker}
                      </span>
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePause(alert.id);
                          }}
                          className="text-xs px-1.5 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-400"
                          title={alert.status === ALERT_STATUS.PAUSED ? 'Resume' : 'Pause'}
                        >
                          {alert.status === ALERT_STATUS.PAUSED ? '▶' : '⏸'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteAlert(alert.id);
                          }}
                          className="text-xs px-1.5 py-0.5 rounded bg-gray-800 hover:bg-red-900/50 text-gray-400 hover:text-red-400"
                          title="Delete"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-xs">
                      <span className={getStatusColor(alert.status)}>
                        {getTypeIcon(alert.type)} {formatPrice(alert.targetValue)}
                      </span>
                      {currentPrice !== undefined && (
                        <span className="text-gray-500">
                          now: {formatPrice(currentPrice)}
                        </span>
                      )}
                    </div>
                    
                    {alert.note && (
                      <div className="text-xs text-gray-600 mt-1 truncate">
                        {alert.note}
                      </div>
                    )}
                    
                    {alert.status === ALERT_STATUS.TRIGGERED && (
                      <Tag type="warning" className="mt-1">TRIGGERED</Tag>
                    )}
                  </div>
                );
              })
            )}
          </>
        )}
      </div>
    </div>
  );
};
