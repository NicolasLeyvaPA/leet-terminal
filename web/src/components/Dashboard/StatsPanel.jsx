/**
 * StatsPanel component
 * Displays real-time system statistics and metrics
 */
const StatsPanel = ({ stats }) => {
  const defaultStats = {
    activeJobs: 0,
    completedJobs: 0,
    totalArticles: 0,
    queueSize: 0,
    lastUpdate: null,
  };

  const displayStats = stats || defaultStats;

  return (
    <div className="stats-panel">
      <h3>System Statistics</h3>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Active Jobs</div>
          <div className="stat-value">{displayStats.activeJobs}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Completed</div>
          <div className="stat-value">{displayStats.completedJobs}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Articles</div>
          <div className="stat-value">{displayStats.totalArticles}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Queue Size</div>
          <div className="stat-value">{displayStats.queueSize}</div>
        </div>
      </div>
      {displayStats.lastUpdate && (
        <div className="last-update">
          Last updated: {new Date(displayStats.lastUpdate).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

export default StatsPanel;
