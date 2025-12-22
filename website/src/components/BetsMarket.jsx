import { useState, useEffect } from 'react'
import '../BetsMarket.css'

function BetsMarket() {
  const [markets, setMarkets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showNews, setShowNews] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [settings, setSettings] = useState({
    closed: false,
    ascending: false,
    limit: 100
  })

  useEffect(() => {
    fetchMarkets()
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const fetchMarkets = async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams({
        order: 'id',
        ascending: settings.ascending.toString(),
        closed: settings.closed.toString(),
        limit: settings.limit.toString()
      })
      const response = await fetch(`/api/events?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      setMarkets(data || [])
    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch markets'
      setError(errorMessage)
      console.error('Error fetching markets:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSettingsChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleApplySettings = () => {
    fetchMarkets()
    setShowSettings(false)
  }

  const getNewsItems = () => {
    if (!markets || markets.length === 0) return []
    
    return markets.slice(0, 10).map((market, index) => {
      const volumeNum = Number(market.volume) || 0
      const liquidityNum = Number(market.liquidity) || 0
      const isPositive = volumeNum > 0 || liquidityNum > 0 || index % 2 === 0
      
      const changePercent = isPositive 
        ? (Math.random() * 10 + 2).toFixed(1) 
        : (Math.random() * 5 + 1).toFixed(1)
      const change = isPositive ? `+${changePercent}%` : `-${changePercent}%`
      
      const price = market.markets && market.markets[0] && market.markets[0].lastTradePrice
        ? (Number(market.markets[0].lastTradePrice) * 100).toFixed(1)
        : (Math.random() * 50 + 10).toFixed(1)
      
      const timeOffset = new Date(currentTime.getTime() - (index * 60000))
      const timeStr = timeOffset.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      })
      
      return {
        id: market.id,
        time: timeStr,
        ticker: market.ticker || `MKT${String(market.id).slice(-4)}`,
        headline: market.title || 'Market Update',
        price: price,
        change: change,
        isPositive: isPositive,
        volume: volumeNum
      }
    })
  }

  return (
    <div className="bets-market-container">
      <div className="bets-market-header">
        <div className="bets-market-title">
          <span>POLYMARKET MARKETS</span>
          <div className="bets-market-actions">
            <button 
              onClick={() => setShowSettings(!showSettings)} 
              className="terminal-btn"
            >
              ⚙️ SETTINGS
            </button>
            <button onClick={fetchMarkets} className="terminal-btn primary" disabled={loading}>
              {loading ? 'LOADING...' : 'REFRESH'}
            </button>
          </div>
        </div>
      </div>

      {showSettings && (
        <div className="terminal-panel" style={{ marginBottom: '12px' }}>
          <div className="panel-header">FILTER SETTINGS</div>
          <div className="panel-content" style={{ padding: '12px' }}>
            <div className="data-row">
              <span className="data-label">Include Closed:</span>
              <label className="data-value">
                <input
                  type="checkbox"
                  checked={settings.closed}
                  onChange={(e) => handleSettingsChange('closed', e.target.checked)}
                />
              </label>
            </div>
            <div className="data-row">
              <span className="data-label">Ascending:</span>
              <label className="data-value">
                <input
                  type="checkbox"
                  checked={settings.ascending}
                  onChange={(e) => handleSettingsChange('ascending', e.target.checked)}
                />
              </label>
            </div>
            <div className="data-row">
              <span className="data-label">Limit:</span>
              <input
                type="number"
                min="1"
                max="1000"
                value={settings.limit}
                onChange={(e) => handleSettingsChange('limit', parseInt(e.target.value) || 100)}
                className="terminal-input"
                style={{ width: '100px', marginLeft: '8px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button onClick={handleApplySettings} className="terminal-btn primary">
                APPLY
              </button>
              <button onClick={() => setShowSettings(false)} className="terminal-btn">
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bets-market-content">
        {loading && <div className="terminal-loading">Loading markets...</div>}
        
        {error && (
          <div className="terminal-error">
            <div className="data-row">
              <span className="data-label">Error:</span>
              <span className="data-value negative">{error}</span>
            </div>
            <button onClick={fetchMarkets} className="terminal-btn" style={{ marginTop: '12px' }}>
              TRY AGAIN
            </button>
          </div>
        )}

        {!loading && !error && markets.length === 0 && (
          <div className="terminal-loading">No markets found</div>
        )}

        {!loading && !error && markets.length > 0 && (
          <>
            <div className="terminal-panel" style={{ marginBottom: '12px' }}>
              <div className="panel-header">
                STATS
                <span style={{ marginLeft: '16px', color: 'var(--text-secondary)' }}>
                  Total: {markets.length} | Active: {markets.filter(m => m.active).length}
                </span>
                <button 
                  onClick={() => setShowNews(!showNews)} 
                  className="terminal-btn"
                  style={{ marginLeft: 'auto', fontSize: '9px', padding: '2px 8px' }}
                >
                  {showNews ? 'HIDE NEWS' : 'SHOW NEWS'}
                </button>
              </div>
            </div>
            
            {showNews && (
              <div className="terminal-panel" style={{ marginBottom: '12px' }}>
                <div className="panel-header">
                  NEWS FEED
                  <span className="mono" style={{ marginLeft: 'auto', color: 'var(--text-secondary)' }}>
                    {currentTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
                <div className="panel-content" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {getNewsItems().map((news, index) => (
                    <div key={news.id || index} className="data-row" style={{ padding: '6px 12px', borderBottom: '1px solid var(--border)' }}>
                      <span className="mono" style={{ color: 'var(--text-muted)', fontSize: '10px', width: '80px' }}>
                        [{news.time}]
                      </span>
                      <span className={`mono ${news.isPositive ? 'positive' : 'negative'}`} style={{ width: '100px', fontWeight: '600' }}>
                        {news.ticker}
                      </span>
                      <span className="mono" style={{ width: '70px' }}>{news.price}¢</span>
                      <span className={`mono ${news.isPositive ? 'positive' : 'negative'}`} style={{ width: '80px' }}>
                        {news.isPositive ? '▲' : '▼'}{news.change}
                      </span>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {news.headline}
                      </span>
                      {news.volume > 0 && (
                        <span className="mono" style={{ color: 'var(--text-secondary)', fontSize: '10px', marginLeft: '12px' }}>
                          Vol: ${(news.volume / 1000).toFixed(0)}k
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="markets-grid-terminal">
              {markets.map((event) => (
                <div key={event.id} className="terminal-panel market-card-terminal">
                  {event.image && (
                    <img src={event.image} alt={event.title} style={{ width: '100%', maxHeight: '150px', objectFit: 'cover' }} />
                  )}
                  <div className="panel-header" style={{ fontSize: '11px' }}>
                    {event.ticker || `MKT${String(event.id).slice(-4)}`}
                  </div>
                  <div className="panel-content" style={{ padding: '12px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-primary)', marginBottom: '8px', fontWeight: '500' }}>
                      {event.title || 'Untitled Market'}
                    </div>
                    
                    {event.ticker && (
                      <div className="data-row" style={{ padding: '4px 0' }}>
                        <span className="data-label">Ticker:</span>
                        <span className="data-value highlight mono">{event.ticker}</span>
                      </div>
                    )}
                    
                    {event.description && (
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: '1.4', 
                        display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {event.description}
                      </div>
                    )}
                    
                    {event.endDate && (
                      <div className="data-row" style={{ padding: '4px 0' }}>
                        <span className="data-label">End:</span>
                        <span className="data-value">{new Date(event.endDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    
                    {event.markets && event.markets.length > 0 && event.markets[0].outcomes && (
                      <div className="data-row" style={{ padding: '4px 0' }}>
                        <span className="data-label">Outcomes:</span>
                        <span className="data-value">
                          {(() => {
                            try {
                              const outcomes = JSON.parse(event.markets[0].outcomes);
                              return Array.isArray(outcomes) ? outcomes.join(', ') : event.markets[0].outcomes;
                            } catch {
                              return event.markets[0].outcomes;
                            }
                          })()}
                        </span>
                      </div>
                    )}
                    
                    <div style={{ borderTop: '1px solid var(--border)', marginTop: '8px', paddingTop: '8px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      {event.volume !== undefined && (
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                          Vol: ${Number(event.volume).toLocaleString()}
                        </span>
                      )}
                      {event.liquidity !== undefined && (
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                          Liq: ${Number(event.liquidity).toLocaleString()}
                        </span>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                      <span className="mono" style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                        ID: {event.id}
                      </span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {event.active && <span className="tag tag-buy" style={{ fontSize: '8px' }}>ACTIVE</span>}
                        {event.closed && <span className="tag tag-sell" style={{ fontSize: '8px' }}>CLOSED</span>}
                        {event.featured && <span className="tag tag-platform" style={{ fontSize: '8px' }}>FEAT</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default BetsMarket

