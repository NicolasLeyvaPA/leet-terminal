import { PanelHeader } from '../PanelHeader';

export const NewsFeedPanel = ({ news, onNewsClick }) => (
  <div className="terminal-panel h-full">
    <PanelHeader title="NEWS & SOCIAL" subtitle="Live feed • Click to jump" />
    <div className="panel-content">
      {news.map((item) => (
        <div
          key={item.id}
          className={`news-item px-2 py-2 border-b border-gray-900 cursor-pointer hover:bg-gray-900 ${
            item.sentiment > 0.3
              ? "news-positive"
              : item.sentiment < -0.3
              ? "news-negative"
              : "news-neutral"
          }`}
          onClick={() => onNewsClick && onNewsClick(item)}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-orange-500">
              {item.source}
            </span>
            <span className="text-xs text-gray-600">
              {item.time}
            </span>
          </div>
          <div className="text-xs text-gray-300 leading-tight mb-1">
            {item.title}
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs ${
                item.sentiment > 0 ? "positive" : "negative"
              }`}
            >
              {item.sentiment > 0 ? "↑" : "↓"}{" "}
              {Math.abs(item.sentiment * 100).toFixed(0)}%
            </span>
            <div className="flex gap-1">
              {item.markets.map((t) => (
                <span
                  key={t}
                  className="text-xs text-gray-500 bg-gray-800 px-1 rounded hover:bg-orange-900"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

