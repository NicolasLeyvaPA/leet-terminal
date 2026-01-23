/**
 * SentimentGraph component
 * Displays sentiment analysis visualization from scraped articles
 */
const SentimentGraph = ({ data, timeRange = '24h' }) => {
  // TODO: Implement sentiment visualization using Chart.js or D3
  return (
    <div className="sentiment-graph">
      <div className="graph-header">
        <h3>Sentiment Analysis</h3>
        <select value={timeRange} className="time-range-select">
          <option value="1h">1 Hour</option>
          <option value="24h">24 Hours</option>
          <option value="7d">7 Days</option>
          <option value="30d">30 Days</option>
        </select>
      </div>
      <div className="graph-body">
        {data ? (
          <p>Sentiment data visualization coming soon...</p>
        ) : (
          <p>No sentiment data available</p>
        )}
      </div>
    </div>
  );
};

export default SentimentGraph;
