/**
 * PredictionPlot component
 * Displays predictive model results and forecasts
 */
const PredictionPlot = ({ predictions, confidence, model = 'markov' }) => {
  return (
    <div className="prediction-plot">
      <div className="plot-header">
        <h3>Predictions</h3>
        <span className="model-badge">{model.toUpperCase()}</span>
      </div>
      <div className="plot-body">
        {predictions && predictions.length > 0 ? (
          <div className="predictions-container">
            <div className="confidence-meter">
              <label>Confidence:</label>
              <div className="meter">
                <div 
                  className="meter-fill" 
                  style={{ width: `${confidence * 100}%` }}
                />
              </div>
              <span className="confidence-value">{(confidence * 100).toFixed(1)}%</span>
            </div>
            {/* TODO: Add Chart.js line chart for predictions */}
            <div className="plot-canvas">
              Plot visualization coming soon...
            </div>
          </div>
        ) : (
          <p>No prediction data available</p>
        )}
      </div>
    </div>
  );
};

export default PredictionPlot;
