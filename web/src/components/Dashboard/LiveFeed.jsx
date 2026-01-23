import { useEffect, useRef } from 'react';

/**
 * LiveFeed component
 * Real-time feed of scraping and analysis events
 */
const LiveFeed = ({ events, maxEvents = 50 }) => {
  const feedRef = useRef(null);

  useEffect(() => {
    // Auto-scroll to bottom when new events arrive
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [events]);

  const getEventIcon = (type) => {
    switch (type) {
      case 'scrape': return '🔍';
      case 'analyze': return '🧠';
      case 'predict': return '📊';
      case 'error': return '❌';
      case 'success': return '✅';
      default: return '📝';
    }
  };

  const displayEvents = events ? events.slice(-maxEvents) : [];

  return (
    <div className="live-feed">
      <h3>Live Feed</h3>
      <div className="feed-container" ref={feedRef}>
        {displayEvents.length > 0 ? (
          <ul className="feed-list">
            {displayEvents.map((event, idx) => (
              <li key={idx} className={`feed-item feed-${event.type}`}>
                <span className="feed-icon">{getEventIcon(event.type)}</span>
                <span className="feed-time">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
                <span className="feed-message">{event.message}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-feed">No events yet</p>
        )}
      </div>
    </div>
  );
};

export default LiveFeed;
