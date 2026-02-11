import { useState, useCallback } from 'react';
import { PanelHeader } from '../PanelHeader';
import { ResearchEngine } from '../../services/parallelAPI';
import { useResearchHistory } from '../../utils/researchHistory';

export const ResearchPanel = ({ market, onResearchComplete }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [research, setResearch] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [customQuery, setCustomQuery] = useState('');
  const [depth, setDepth] = useState('deep');
  const [showHistory, setShowHistory] = useState(false);

  const { sessions, save, remove, clear, toggleStar } = useResearchHistory();

  const isConfigured = ResearchEngine.isConfigured();

  // Auto-save helper
  const saveSession = useCallback((result, opts = {}) => {
    save({
      marketTicker: opts.marketTicker || market?.ticker || null,
      marketQuestion: opts.marketQuestion || market?.question || market?.title || null,
      query: opts.query || null,
      depth: opts.depth || depth,
      result,
    });
  }, [save, market, depth]);

  // Run deep research on the market
  const runResearch = useCallback(async () => {
    if (!market) return;

    setLoading(true);
    setError(null);
    setShowHistory(false);

    try {
      const result = await ResearchEngine.researchMarket(market);
      setResearch(result);
      saveSession(result);
      if (onResearchComplete) onResearchComplete(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [market, onResearchComplete, saveSession]);

  // Run custom research query
  const runCustomResearch = useCallback(async () => {
    if (!customQuery.trim()) return;

    setLoading(true);
    setError(null);
    setShowHistory(false);

    try {
      const result = await ResearchEngine.customResearch(customQuery, depth);
      setResearch(result);
      saveSession(result, { query: customQuery, depth });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [customQuery, depth, saveSession]);

  // Load a past session into the results view
  const loadSession = useCallback((session) => {
    setResearch(session.result);
    setActiveTab('overview');
    setShowHistory(false);
  }, []);

  // Group sessions by date
  const groupedSessions = sessions.reduce((groups, session) => {
    const date = new Date(session.timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    if (!groups[date]) groups[date] = [];
    groups[date].push(session);
    return groups;
  }, {});

  // History tab button for the panel header
  const headerActions = (
    <button
      onClick={() => setShowHistory(!showHistory)}
      className={`px-2 py-1 text-xs rounded transition-colors ${
        showHistory
          ? 'bg-orange-500 text-black font-bold'
          : 'text-gray-500 hover:text-gray-300 border border-gray-700 hover:border-gray-500'
      }`}
    >
      HISTORY{sessions.length > 0 ? ` (${sessions.length})` : ''}
    </button>
  );

  // Render history list
  const renderHistory = () => {
    if (sessions.length === 0) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-gray-500 text-sm mb-2">No saved sessions</div>
          <div className="text-gray-600 text-xs">Research results are auto-saved here</div>
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto space-y-3">
          {Object.entries(groupedSessions).map(([date, dateSessions]) => (
            <div key={date}>
              <div className="text-gray-600 text-xs font-bold mb-1 px-1 sticky top-0 bg-gray-950/90 py-1">
                {date}
              </div>
              <div className="space-y-1">
                {dateSessions.map((session) => (
                  <div
                    key={session.id}
                    className="bg-gray-900/50 rounded p-2 hover:bg-gray-800/50 transition-colors group cursor-pointer"
                    onClick={() => loadSession(session)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {session.starred && (
                            <span className="text-yellow-500 text-xs">*</span>
                          )}
                          <span className="text-gray-300 text-sm truncate">
                            {session.marketQuestion
                              ? `"${session.marketQuestion}"`
                              : session.query
                                ? `Custom: "${session.query}"`
                                : 'Research'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          {session.marketTicker && (
                            <span className="text-orange-400">{session.marketTicker}</span>
                          )}
                          <span className={`px-1 rounded ${
                            session.depth === 'deep'
                              ? 'bg-orange-500/20 text-orange-400'
                              : session.depth === 'standard'
                                ? 'bg-cyan-500/20 text-cyan-400'
                                : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {(session.depth || 'deep').toUpperCase()}
                          </span>
                          <span className="text-gray-600">
                            {new Date(session.timestamp).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleStar(session.id); }}
                          className={`p-1 text-xs rounded hover:bg-gray-700 ${
                            session.starred ? 'text-yellow-500' : 'text-gray-600'
                          }`}
                          title={session.starred ? 'Unstar' : 'Star'}
                        >
                          {session.starred ? '*' : '.'}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); remove(session.id); }}
                          className="p-1 text-xs text-gray-600 rounded hover:bg-gray-700 hover:text-red-400"
                          title="Delete"
                        >
                          x
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-gray-800 mt-3">
          <button
            onClick={clear}
            className="w-full py-2 bg-gray-800 text-gray-500 text-xs rounded hover:bg-gray-700 hover:text-red-400"
          >
            Clear All History
          </button>
        </div>
      </div>
    );
  };

  // Not configured state
  if (!isConfigured) {
    return (
      <div className="terminal-panel h-full">
        <PanelHeader title="DEEP RESEARCH" subtitle="LEET TERMINAL" actions={headerActions} />
        <div className="panel-content flex flex-col items-center justify-center h-full p-4">
          {showHistory ? renderHistory() : (
            <div className="text-center max-w-md">
              <div className="text-orange-500 text-lg mb-3">RESEARCH ENGINE</div>
              <div className="text-gray-400 text-sm mb-4">
                Deep research intelligence is available but not configured for this instance.
              </div>
              <div className="bg-gray-900 rounded p-4 text-left mb-4">
                <div className="text-gray-500 text-xs mb-2">Add to your .env file:</div>
                <code className="text-cyan-400 text-xs">VITE_RESEARCH_API_KEY=your_key</code>
              </div>
              <div className="text-gray-600 text-xs">
                Contact admin for API credentials.
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render research results
  const renderResults = () => {
    if (loading) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-orange-500 animate-pulse mb-2">Running deep analysis...</div>
          <div className="text-gray-600 text-xs">Scanning sources — this may take 10-30 seconds</div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-red-500 mb-2">Analysis Failed</div>
          <div className="text-gray-500 text-xs max-w-sm text-center">{error}</div>
          <button
            onClick={market ? runResearch : runCustomResearch}
            className="mt-4 px-4 py-2 bg-gray-800 text-gray-300 text-sm rounded hover:bg-gray-700"
          >
            Retry
          </button>
        </div>
      );
    }

    if (!research) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-gray-500 text-sm mb-4">No research results yet</div>
          {market && (
            <button
              onClick={runResearch}
              className="px-6 py-3 bg-orange-500 text-black font-bold rounded hover:bg-orange-400"
            >
              Run Deep Research
            </button>
          )}
        </div>
      );
    }

    const output = research.output || {};
    const citations = research.citations || [];

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tabs */}
        <div className="flex gap-1 mb-3 border-b border-gray-800 pb-2">
          {['overview', 'factors', 'news', 'sources'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 text-xs rounded-t transition-colors ${
                activeTab === tab
                  ? 'bg-orange-500 text-black font-bold'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {output.summary && (
                <div className="bg-gray-900/50 rounded p-3">
                  <div className="text-orange-500 text-xs font-bold mb-2">SUMMARY</div>
                  <div className="text-gray-300 text-sm leading-relaxed">
                    {output.summary}
                  </div>
                </div>
              )}

              {output.current_status && (
                <div className="bg-gray-900/50 rounded p-3">
                  <div className="text-cyan-500 text-xs font-bold mb-2">CURRENT STATUS</div>
                  <div className="text-gray-300 text-sm">
                    {output.current_status}
                  </div>
                </div>
              )}

              {output.probability_assessment && (
                <div className="bg-gray-900/50 rounded p-3">
                  <div className="text-green-500 text-xs font-bold mb-2">PROBABILITY ASSESSMENT</div>
                  <div className="flex items-center gap-4 mb-2">
                    <div className="text-2xl font-bold text-white">
                      {((output.probability_assessment.estimated_probability || 0) * 100).toFixed(0)}%
                    </div>
                    <div className={`text-xs px-2 py-1 rounded ${
                      output.probability_assessment.confidence === 'high' ? 'bg-green-500/20 text-green-400' :
                      output.probability_assessment.confidence === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {output.probability_assessment.confidence || 'unknown'} confidence
                    </div>
                  </div>
                  {output.probability_assessment.reasoning && (
                    <div className="text-gray-400 text-xs">
                      {output.probability_assessment.reasoning}
                    </div>
                  )}
                </div>
              )}

              {research._cached && (
                <div className="text-gray-600 text-xs text-center">
                  Cached result — refresh for new analysis
                </div>
              )}
            </div>
          )}

          {activeTab === 'factors' && (
            <div className="space-y-4">
              {output.key_factors?.length > 0 && (
                <div className="bg-gray-900/50 rounded p-3">
                  <div className="text-orange-500 text-xs font-bold mb-2">KEY FACTORS</div>
                  <ul className="space-y-2">
                    {output.key_factors.map((factor, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                        <span className="text-orange-400 mt-1">•</span>
                        <span>{factor}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {output.risk_factors?.length > 0 && (
                <div className="bg-gray-900/50 rounded p-3">
                  <div className="text-red-500 text-xs font-bold mb-2">RISK FACTORS</div>
                  <ul className="space-y-2">
                    {output.risk_factors.map((risk, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                        <span className="text-red-400 mt-1">!</span>
                        <span>{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeTab === 'news' && (
            <div className="space-y-2">
              {output.recent_news?.length > 0 ? (
                output.recent_news.map((item, i) => (
                  <div key={i} className="bg-gray-900/50 rounded p-3 hover:bg-gray-800/50 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-gray-300 text-sm font-medium">
                        {item.headline}
                      </span>
                      <span className="text-gray-600 text-xs ml-2 whitespace-nowrap">
                        {item.date}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-orange-400 text-xs">{item.source}</span>
                      {item.relevance && (
                        <span className="text-gray-500 text-xs">• {item.relevance}</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-gray-500 text-sm text-center py-4">
                  No recent news found
                </div>
              )}
            </div>
          )}

          {activeTab === 'sources' && (
            <div className="space-y-2">
              {citations.length > 0 ? (
                citations.map((citation, i) => (
                  <a
                    key={i}
                    href={citation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-gray-900/50 rounded p-3 hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="text-cyan-400 text-sm font-medium mb-1 hover:underline">
                      {citation.title || citation.url}
                    </div>
                    <div className="text-gray-500 text-xs truncate">
                      {citation.url}
                    </div>
                  </a>
                ))
              ) : (
                <div className="text-gray-500 text-sm text-center py-4">
                  No citations available
                </div>
              )}
            </div>
          )}
        </div>

        {/* Refresh button */}
        <div className="pt-3 border-t border-gray-800 mt-3">
          <button
            onClick={market ? runResearch : runCustomResearch}
            disabled={loading}
            className="w-full py-2 bg-gray-800 text-gray-300 text-xs rounded hover:bg-gray-700 disabled:opacity-50"
          >
            {loading ? 'Analyzing...' : 'Refresh Analysis'}
          </button>
        </div>
      </div>
    );
  };

  // No market selected — show custom query input
  if (!market) {
    return (
      <div className="terminal-panel h-full">
        <PanelHeader title="DEEP RESEARCH" subtitle="LEET TERMINAL" actions={headerActions} />
        <div className="panel-content flex flex-col h-full p-4">
          {showHistory ? renderHistory() : (
            <>
              <div className="text-gray-500 text-sm mb-4">
                Select a market to research, or enter a custom query:
              </div>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={customQuery}
                  onChange={(e) => setCustomQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && runCustomResearch()}
                  placeholder="Enter research query..."
                  className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-300 placeholder-gray-600 outline-none focus:border-orange-500"
                />
                <button
                  onClick={runCustomResearch}
                  disabled={loading || !customQuery.trim()}
                  className="px-4 py-2 bg-orange-500 text-black text-sm font-bold rounded hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '...' : 'RESEARCH'}
                </button>
              </div>
              <div className="flex gap-1 mb-4">
                {['quick', 'standard', 'deep'].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDepth(d)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      depth === d
                        ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                        : 'text-gray-600 hover:text-gray-400'
                    }`}
                  >
                    {d.toUpperCase()}
                  </button>
                ))}
              </div>
              {renderResults()}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="terminal-panel h-full flex flex-col">
      <PanelHeader
        title="DEEP RESEARCH"
        subtitle={market?.ticker || 'LEET TERMINAL'}
        actions={headerActions}
      />
      <div className="panel-content flex-1 flex flex-col overflow-hidden p-3">
        {showHistory ? renderHistory() : (
          <>
            {/* Market Question */}
            <div className="bg-gray-900/50 rounded p-2 mb-3">
              <div className="text-gray-500 text-xs mb-1">RESEARCHING</div>
              <div className="text-gray-300 text-sm line-clamp-2">
                {market.question || market.title}
              </div>
            </div>

            {renderResults()}
          </>
        )}
      </div>
    </div>
  );
};
