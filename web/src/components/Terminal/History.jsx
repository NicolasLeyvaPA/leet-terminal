/**
 * History component
 * Displays previously executed commands
 */
const History = ({ history }) => {
  if (!history || history.length === 0) {
    return null;
  }

  return (
    <div className="terminal-history">
      {history.map((entry, index) => (
        <div key={index} className="history-entry">
          <div className="history-command">
            <span className="prompt-symbol">$</span>
            <span className="command-text">{entry.command}</span>
          </div>
          {entry.output && (
            <div className={`history-output ${entry.error ? 'error' : ''}`}>
              {entry.output}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default History;
