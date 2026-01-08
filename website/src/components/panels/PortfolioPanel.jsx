import { useState } from 'react';
import { PanelHeader } from '../PanelHeader';
import { Tag } from '../Tag';

export const PortfolioPanel = ({ positions: initialPositions, markets }) => {
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [positions, setPositions] = useState(initialPositions || []);

  const fetchPolymarketPositions = async () => {
    if (!userId || !userId.startsWith('0x')) {
      setError('Please enter a valid wallet address (0x...)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Direct request to Polymarket API
      const url = `https://data-api.polymarket.com/positions?user=${userId}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch positions: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Transform Polymarket API data to match component format
      const transformedPositions = data.map((pos, index) => ({
        id: `polymarket-${index}`,
        market_id: pos.eventId || pos.conditionId || `market-${index}`,
        shares: pos.size || 0,
        avg_price: pos.avgPrice || 0,
        current_price: pos.curPrice || 0,
        side: pos.outcomeIndex === 0 ? 'YES' : 'NO',
        // Store original data for display
        originalData: {
          title: pos.title,
          outcome: pos.outcome,
          icon: pos.icon,
          slug: pos.slug,
          cashPnl: pos.cashPnl,
          percentPnl: pos.percentPnl,
          initialValue: pos.initialValue,
          currentValue: pos.currentValue,
          redeemable: pos.redeemable,
          endDate: pos.endDate,
        },
      }));

      setPositions(transformedPositions);
    } catch (err) {
      console.error('Error fetching Polymarket positions:', err);
      setError(err.message || 'Failed to fetch positions');
    } finally {
      setLoading(false);
    }
  };

  const enrichedPositions = positions.map((p) => {
    const market = markets.find((m) => m.id === p.market_id);
    // Use API cashPnl if available (in cents), otherwise calculate
    const pnl = p.originalData?.cashPnl !== undefined 
      ? p.originalData.cashPnl / 100  // Convert cents to dollars
      : (p.current_price - p.avg_price) * p.shares * (p.side === "NO" ? -1 : 1);
    const pnlPct = p.originalData?.percentPnl !== undefined
      ? p.originalData.percentPnl
      : ((p.current_price - p.avg_price) / (p.avg_price || 1) * 100) * (p.side === "NO" ? -1 : 1);
    return { ...p, market, pnl, pnlPct };
  });

  // Calculate totals using API values if available
  const totalPnL = enrichedPositions.reduce((sum, p) => {
    if (p.originalData?.cashPnl !== undefined) {
      return sum + (p.originalData.cashPnl / 100); // Convert cents to dollars
    }
    return sum + p.pnl;
  }, 0);
  
  const totalValue = enrichedPositions.reduce((sum, p) => {
    if (p.originalData?.currentValue !== undefined) {
      return sum + (p.originalData.currentValue / 100); // Convert cents to dollars
    }
    return sum + (p.shares * p.current_price);
  }, 0);

  return (
    <div className="terminal-panel h-full">
      <PanelHeader
        title="PORTFOLIO"
        subtitle={`${positions.length} positions`}
      />
      <div className="panel-content">
        {/* Temporary User ID Input */}
        <div className="px-2 py-2 border-b border-gray-800 bg-gray-900/30">
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter user ID (0x...)"
              className="flex-1 px-2 py-1 bg-[#080808] border border-[#222] text-white text-xs focus:outline-none focus:border-orange-500"
            />
            <button
              onClick={fetchPolymarketPositions}
              disabled={loading || !userId}
              className="px-3 py-1 bg-orange-500 text-black text-xs font-bold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'LOADING...' : 'SEND'}
            </button>
          </div>
          {error && (
            <div className="text-red-400 text-xs mt-1">{error}</div>
          )}
        </div>

        <div className="px-2 py-2 border-b border-gray-800 bg-gray-900/30">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Total Value</span>
            <span className="mono">${totalValue.toFixed(0)}</span>
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className="text-gray-500">Unrealized P&L</span>
            <span
              className={`mono ${
                totalPnL >= 0 ? "positive" : "negative"
              }`}
            >
              {totalPnL >= 0 ? "+" : ""}${totalPnL.toFixed(2)}
            </span>
          </div>
        </div>
        {enrichedPositions.length === 0 ? (
          <div className="px-2 py-4 text-center text-gray-500 text-xs">
            {loading ? 'Loading positions...' : 'No positions. Enter a user ID and click SEND.'}
          </div>
        ) : (
          enrichedPositions.map((p, i) => (
            <div key={p.id || i} className="px-2 py-2 border-b border-gray-900">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-orange-500">
                  {p.originalData?.title || p.market?.ticker || "N/A"}
                </span>
                <Tag type={p.side === "YES" ? "buy" : "sell"}>
                  {p.side}
                </Tag>
              </div>
              {p.originalData?.outcome && (
                <div className="text-xs text-gray-400 mb-1">
                  {p.originalData.outcome}
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-gray-600">Shares</span>
                  <div className="mono">{p.shares.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-gray-600">Avg</span>
                  <div className="mono">
                    {(p.avg_price * 100).toFixed(1)}¢
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">P&L</span>
                  <div
                    className={`mono ${
                      (p.originalData?.cashPnl ?? p.pnl) >= 0 ? "positive" : "negative"
                    }`}
                  >
                    {(p.originalData?.cashPnl ?? p.pnl) >= 0 ? "+" : ""}${((p.originalData?.cashPnl ?? p.pnl) / 100).toFixed(2)}
                  </div>
                </div>
              </div>
              {p.originalData?.percentPnl !== undefined && (
                <div className="text-xs mt-1">
                  <span className="text-gray-600">P&L %: </span>
                  <span className={p.originalData.percentPnl >= 0 ? "positive" : "negative"}>
                    {p.originalData.percentPnl >= 0 ? "+" : ""}{p.originalData.percentPnl.toFixed(2)}%
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

