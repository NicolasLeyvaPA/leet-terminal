const WORKSPACES = ["analysis", "research", "portfolio", "lab", "alerts", "news", "bets"];

export function TerminalHeader({ workspace, onWorkspaceChange, statusMessage, time, onLogout }) {
  return (
    <div className="h-8 bg-gradient-to-r from-[#0a0a0a] to-[#111] border-b border-orange-500/30 flex items-center justify-between px-3 flex-shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center">
          <span className="text-orange-500 font-black text-lg tracking-tight">LEET</span>
          <span className="text-orange-400 font-bold text-lg ml-1">TERMINAL</span>
        </div>
        <div className="h-4 w-px bg-gray-700" />
        <div className="flex">
          {WORKSPACES.map((ws) => (
            <button
              key={ws}
              onClick={() => onWorkspaceChange(ws)}
              className={`px-3 py-1 text-xs font-medium transition-all ${
                workspace === ws
                  ? "text-orange-400 border-b-2 border-orange-500"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {ws.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs">
        {statusMessage && (
          <span className="text-orange-400 animate-pulse">{statusMessage}</span>
        )}
        <span className="text-gray-600">PM</span>
        <span className="text-gray-700">|</span>
        <span className="text-gray-600">KA</span>
        <span className="mono text-orange-500 font-medium">{time.toLocaleTimeString()}</span>
        <button
          onClick={onLogout}
          className="btn text-xs hover:bg-red-500/20 hover:text-red-400"
          title="Logout"
        >
          LOGOUT
        </button>
      </div>
    </div>
  );
}
