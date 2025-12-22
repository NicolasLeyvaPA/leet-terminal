import { useState, useEffect } from 'react'
import BetsMarket from './components/BetsMarket'
import './App.css'

function App() {
  const [workspace, setWorkspace] = useState('bets')
  const [time, setTime] = useState(new Date())
  const [command, setCommand] = useState('')

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const handleCommand = (e) => {
    if (e.key === 'Enter' && command) {
      const cmd = command.toUpperCase().trim()
      if (['BETS', 'MARKETS', 'BET'].includes(cmd)) {
        setWorkspace('bets')
      } else if (['ANALYSIS', 'ANA'].includes(cmd)) {
        setWorkspace('analysis')
      } else if (['PORTFOLIO', 'PORT'].includes(cmd)) {
        setWorkspace('portfolio')
      } else if (['LAB', 'QUANTUM'].includes(cmd)) {
        setWorkspace('lab')
      } else if (['SCAN'].includes(cmd)) {
        setWorkspace('scan')
      }
      setCommand('')
    }
  }

  return (
    <div className="terminal-app">
      {/* Top Bar */}
      <div className="terminal-top-bar">
        <div className="terminal-top-left">
          <span className="terminal-logo">
            LEET<span className="terminal-logo-white">QUANTUM</span>
            <span className="terminal-logo-gray">TERMINAL</span>
            <span className="terminal-logo-small">PRO</span>
          </span>
          <div className="terminal-tabs">
            {['bets', 'analysis', 'portfolio', 'lab', 'scan'].map((ws) => (
              <button
                key={ws}
                onClick={() => setWorkspace(ws)}
                className={`workspace-tab ${workspace === ws ? 'active' : ''}`}
              >
                {ws === 'bets' ? 'BETS MARKET' : ws}
              </button>
            ))}
          </div>
        </div>
        <div className="terminal-top-right">
          <span className="terminal-time mono">{time.toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Command Bar */}
      <div className="terminal-command-bar">
        <span className="terminal-prompt">❯</span>
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={handleCommand}
          placeholder="Enter command (BETS, ANALYSIS, PORTFOLIO, LAB, SCAN)..."
          className="terminal-cmd-input"
        />
        <div className="terminal-command-actions">
          <button className="terminal-btn">HELP</button>
          <button className="terminal-btn">⚙</button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="terminal-main-content">
        {workspace === 'bets' && <BetsMarket />}
        {workspace === 'analysis' && (
          <div className="terminal-placeholder">
            <div className="panel-header">ANALYSIS</div>
            <div className="panel-content" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Analysis workspace coming soon...
            </div>
          </div>
        )}
        {workspace === 'portfolio' && (
          <div className="terminal-placeholder">
            <div className="panel-header">PORTFOLIO</div>
            <div className="panel-content" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Portfolio workspace coming soon...
            </div>
          </div>
        )}
        {workspace === 'lab' && (
          <div className="terminal-placeholder">
            <div className="panel-header">QUANTUM LAB</div>
            <div className="panel-content" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Quantum Lab workspace coming soon...
            </div>
          </div>
        )}
        {workspace === 'scan' && (
          <div className="terminal-placeholder">
            <div className="panel-header">SCAN</div>
            <div className="panel-content" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Scan workspace coming soon...
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="terminal-status-bar">
        <div className="terminal-status-left">
          <span className="terminal-status-indicator">
            <span className="terminal-status-dot"></span>
            Connected
          </span>
        </div>
        <div className="terminal-status-right">
          <span className="terminal-status-warning">⚠ Analysis Only - No Execution</span>
          <span className="terminal-status-version">v2.0.0</span>
        </div>
      </div>
    </div>
  )
}

export default App
