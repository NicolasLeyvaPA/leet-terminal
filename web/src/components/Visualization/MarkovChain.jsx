/**
 * MarkovChain component
 * Visualizes Markov chain states and transitions
 */
const MarkovChain = ({ states, transitions, currentState }) => {
  return (
    <div className="markov-chain">
      <div className="chain-header">
        <h3>Markov Chain Visualization</h3>
        <div className="current-state">
          Current: <span className="state-value">{currentState || 'N/A'}</span>
        </div>
      </div>
      <div className="chain-body">
        {states && states.length > 0 ? (
          <div className="chain-container">
            <div className="states-list">
              {states.map((state, idx) => (
                <div 
                  key={idx} 
                  className={`state-node ${state === currentState ? 'active' : ''}`}
                >
                  {state}
                </div>
              ))}
            </div>
            {/* TODO: Add D3.js force-directed graph or network diagram */}
            <div className="transitions-canvas">
              Network visualization coming soon...
            </div>
          </div>
        ) : (
          <p>No Markov chain data available</p>
        )}
      </div>
    </div>
  );
};

export default MarkovChain;
