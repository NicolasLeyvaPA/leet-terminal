import { useState, useEffect, useRef } from 'react';
import { PanelHeader } from '../PanelHeader';
import { DataRow } from '../DataRow';
import { Tag } from '../Tag';
import { CryptoExchangeAPI } from '../../services/cryptoExchangeAPI';

// Format duration from milliseconds
const formatDuration = (ms) => {
  if (!ms) return '00:00:00';
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / 60000) % 60;
  const hours = Math.floor(ms / 3600000);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// Format currency
const formatCurrency = (value) => {
  if (value === undefined || value === null || isNaN(value)) return '$0.00';
  return `$${Number(value).toFixed(2)}`;
};

// Log entry component
const LogEntry = ({ log }) => {
  const typeColors = {
    info: 'text-blue-400',
    success: 'text-green-400',
    warning: 'text-yellow-400',
    error: 'text-red-400',
    trade: 'text-orange-400',
  };

  return (
    <div className="text-[10px] py-0.5 border-b border-gray-800/50">
      <span className="text-gray-600 mono">
        {new Date(log.timestamp).toLocaleTimeString()}
      </span>
      <span className={`ml-2 ${typeColors[log.type] || 'text-gray-400'}`}>
        [{log.type.toUpperCase()}]
      </span>
      <span className="text-gray-300 ml-2">{log.message}</span>
    </div>
  );
};

export const ArbitrageBotPanel = ({ bot }) => {
  const [state, setState] = useState(bot?.getState() || { isRunning: false, config: {}, stats: {} });
  const [logs, setLogs] = useState([]);
  const [config, setConfig] = useState({
    minProfitPercent: 0.1,
    maxTradeSize: 10000,
    scanInterval: 10,
    autoExecute: false,
  });
  const [activeTab, setActiveTab] = useState('controls'); // controls, config, exchanges
  const logsRef = useRef(null);

  useEffect(() => {
    if (!bot) return;

    const unsubscribe = bot.subscribe((newState) => {
      setState(newState);

      // Add log entries for state changes
      if (newState.opportunities?.length > 0) {
        addLog('info', `Found ${newState.opportunities.length} arbitrage opportunities`);
      }
    });

    setState(bot.getState());
    return unsubscribe;
  }, [bot]);

  // Auto-scroll logs
  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = (type, message) => {
    setLogs(prev => [...prev.slice(-50), { type, message, timestamp: Date.now() }]);
  };

  const handleStart = () => {
    if (!bot) return;
    bot.updateConfig(config);
    bot.start(config.scanInterval * 1000);
    addLog('success', 'Arbitrage bot started');
  };

  const handleStop = () => {
    if (!bot) return;
    bot.stop();
    addLog('warning', 'Arbitrage bot stopped');
  };

  const handleConfigChange = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const exchanges = CryptoExchangeAPI.getAllExchanges();

  return (
    <div className="terminal-panel h-full flex flex-col">
      <PanelHeader
        title="ARBITRAGE BOT"
        subtitle="Control Center"
        actions={
          <div className="flex items-center gap-2">
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${state.isRunning ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
              {state.isRunning ? 'RUNNING' : 'STOPPED'}
            </span>
          </div>
        }
      />

      {/* Tab navigation */}
      <div className="flex border-b border-gray-800">
        {['controls', 'config', 'exchanges'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 text-[10px] font-bold uppercase ${
              activeTab === tab
                ? 'text-orange-400 border-b-2 border-orange-400'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="panel-content flex-1 overflow-hidden flex flex-col">
        {activeTab === 'controls' && (
          <>
            {/* Main controls */}
            <div className="p-3 border-b border-gray-800">
              <div className="flex gap-2 mb-3">
                <button
                  onClick={handleStart}
                  disabled={state.isRunning}
                  className={`flex-1 py-2 text-xs font-bold rounded ${
                    state.isRunning
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                  }`}
                >
                  START BOT
                </button>
                <button
                  onClick={handleStop}
                  disabled={!state.isRunning}
                  className={`flex-1 py-2 text-xs font-bold rounded ${
                    !state.isRunning
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                  }`}
                >
                  STOP BOT
                </button>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-900/50 rounded p-2 border border-gray-800">
                  <div className="text-[9px] text-gray-500">RUNTIME</div>
                  <div className="text-sm font-bold text-orange-400 mono">
                    {formatDuration(bot?.getRuntime() || 0)}
                  </div>
                </div>
                <div className="bg-gray-900/50 rounded p-2 border border-gray-800">
                  <div className="text-[9px] text-gray-500">TOTAL PROFIT</div>
                  <div className="text-sm font-bold text-green-400 mono">
                    {formatCurrency(state.stats?.totalProfit || 0)}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats grid */}
            <div className="p-3 border-b border-gray-800">
              <div className="text-[10px] text-gray-500 mb-2">SESSION STATISTICS</div>
              <div className="grid grid-cols-2 gap-x-4">
                <DataRow label="Total Scans" value={state.stats?.totalScans || 0} small />
                <DataRow label="Opportunities" value={state.stats?.opportunitiesFound || 0} small />
                <DataRow label="Trades Executed" value={state.stats?.tradesExecuted || 0} small />
                <DataRow label="Active Opps" value={state.opportunities?.length || 0} small />
              </div>
            </div>

            {/* Logs */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="text-[10px] text-gray-500 px-3 py-1 border-b border-gray-800">
                ACTIVITY LOG
              </div>
              <div ref={logsRef} className="flex-1 overflow-y-auto p-2 bg-gray-950/50">
                {logs.length === 0 ? (
                  <div className="text-center text-gray-600 text-[10px] py-4">
                    No activity yet. Start the bot to begin.
                  </div>
                ) : (
                  logs.map((log, idx) => <LogEntry key={idx} log={log} />)
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'config' && (
          <div className="p-3 space-y-4">
            {/* Min Profit */}
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">
                MINIMUM PROFIT (%)
              </label>
              <input
                type="number"
                value={config.minProfitPercent}
                onChange={(e) => handleConfigChange('minProfitPercent', parseFloat(e.target.value) || 0)}
                step="0.05"
                min="0"
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white mono"
              />
              <div className="text-[9px] text-gray-600 mt-0.5">
                Only show opportunities above this threshold after fees
              </div>
            </div>

            {/* Max Trade Size */}
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">
                MAX TRADE SIZE (USDT)
              </label>
              <input
                type="number"
                value={config.maxTradeSize}
                onChange={(e) => handleConfigChange('maxTradeSize', parseInt(e.target.value) || 0)}
                step="1000"
                min="100"
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white mono"
              />
              <div className="text-[9px] text-gray-600 mt-0.5">
                Maximum amount per arbitrage trade
              </div>
            </div>

            {/* Scan Interval */}
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">
                SCAN INTERVAL (seconds)
              </label>
              <input
                type="number"
                value={config.scanInterval}
                onChange={(e) => handleConfigChange('scanInterval', parseInt(e.target.value) || 10)}
                step="5"
                min="5"
                max="300"
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white mono"
              />
              <div className="text-[9px] text-gray-600 mt-0.5">
                How often to scan for opportunities (5-300 seconds)
              </div>
            </div>

            {/* Auto Execute */}
            <div className="flex items-center justify-between bg-gray-900/50 rounded p-3 border border-gray-800">
              <div>
                <div className="text-xs text-white">Auto-Execute Trades</div>
                <div className="text-[9px] text-gray-500">
                  Automatically execute profitable opportunities
                </div>
              </div>
              <button
                onClick={() => handleConfigChange('autoExecute', !config.autoExecute)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  config.autoExecute ? 'bg-green-500' : 'bg-gray-700'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  config.autoExecute ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            {/* Warning */}
            {config.autoExecute && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-2">
                <div className="text-[10px] text-yellow-400 font-bold mb-0.5">WARNING</div>
                <div className="text-[9px] text-yellow-200/70">
                  Auto-execution is enabled. Trades will be simulated. Connect exchange APIs for real trading.
                </div>
              </div>
            )}

            {/* Apply button */}
            <button
              onClick={() => {
                bot?.updateConfig(config);
                addLog('info', 'Configuration updated');
              }}
              className="w-full py-2 text-xs font-bold bg-orange-500/20 text-orange-400 rounded border border-orange-500/30 hover:bg-orange-500/30"
            >
              APPLY CONFIGURATION
            </button>
          </div>
        )}

        {activeTab === 'exchanges' && (
          <div className="p-3">
            <div className="text-[10px] text-gray-500 mb-2">CONNECTED EXCHANGES</div>
            <div className="space-y-2">
              {exchanges.map(exchange => (
                <div
                  key={exchange.id}
                  className="bg-gray-900/50 rounded p-2 border border-gray-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                    <div>
                      <div className="text-xs text-white font-bold">{exchange.name}</div>
                      <div className="text-[9px] text-gray-500">{exchange.type}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-gray-400">Fee: {(exchange.fee * 100).toFixed(2)}%</div>
                    <Tag type="category">ACTIVE</Tag>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-gray-900/30 rounded border border-gray-800">
              <div className="text-[10px] text-gray-500 mb-2">SUPPORTED PAIRS</div>
              <div className="flex flex-wrap gap-1">
                {CryptoExchangeAPI.SUPPORTED_PAIRS.map(pair => (
                  <span
                    key={`${pair.base}/${pair.quote}`}
                    className="text-[9px] bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded"
                  >
                    {pair.base}/{pair.quote}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-4 text-[9px] text-gray-600 text-center">
              Using public APIs for price data. Connect exchange API keys for trading.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArbitrageBotPanel;
