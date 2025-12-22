import { PanelHeader } from '../PanelHeader';

export const ModelBreakdownPanel = ({ market }) => {
  if (!market)
    return (
      <div className="terminal-panel h-full flex items-center justify-center text-gray-600 text-xs">
        Select a market
      </div>
    );

  const models = market.model_breakdown;

  return (
    <div className="terminal-panel h-full">
      <PanelHeader title="MODEL ENSEMBLE" subtitle="4 models" />
      <div className="panel-content p-2">
        {Object.entries(models).map(([name, model]) => (
          <div key={name} className="mb-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-400 capitalize">
                {name}
              </span>
              <span className="mono text-gray-300">
                {(model.prob * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 confluence-bar">
                <div
                  className="confluence-fill bg-gradient-to-r from-orange-500 to-yellow-500"
                  style={{ width: `${model.prob * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 w-10">
                {(model.weight * 100).toFixed(0)}%w
              </span>
            </div>
            <div className="flex items-center justify-between text-xs mt-0.5">
              <span className="text-gray-600">Confidence</span>
              <span
                className={
                  model.confidence > 0.8
                    ? "positive"
                    : model.confidence > 0.6
                    ? "neutral"
                    : "negative"
                }
              >
                {(model.confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        ))}

        <div className="border-t border-gray-800 pt-2 mt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-300 font-medium">
              Ensemble
            </span>
            <span className="mono text-orange-500 font-bold">
              {(market.model_prob * 100).toFixed(1)}%
            </span>
          </div>
          <div className="confluence-bar mt-1">
            <div
              className="confluence-fill bg-orange-500"
              style={{ width: `${market.model_prob * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

