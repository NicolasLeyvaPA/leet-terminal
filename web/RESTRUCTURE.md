# Web Frontend - Restructured

## New Directory Structure

The frontend has been restructured to align with the architecture proposal:

```
web/src/
├── components/
│   ├── Terminal/           # Terminal components (NEW)
│   │   ├── Terminal.jsx
│   │   ├── CommandInput.jsx
│   │   ├── Output.jsx
│   │   └── History.jsx
│   │
│   ├── Visualization/      # Data visualization (NEW)
│   │   ├── DataChart.jsx   (moved from PriceChart.jsx)
│   │   ├── MonteCarloChart.jsx
│   │   ├── SentimentGraph.jsx (NEW)
│   │   ├── PredictionPlot.jsx (NEW)
│   │   └── MarkovChain.jsx (NEW)
│   │
│   ├── Dashboard/          # Dashboard panels (NEW)
│   │   ├── StatsPanel.jsx
│   │   ├── JobQueue.jsx
│   │   └── LiveFeed.jsx
│   │
│   ├── panels/             # Existing market panels
│   └── ...                 # Other existing components
│
├── hooks/                  # Custom React hooks (NEW)
│   ├── useWebSocket.js
│   ├── useTerminal.js
│   ├── useDataStream.js
│   └── useWatchlist.js     (moved from utils/)
│
├── services/               # API and communication (ENHANCED)
│   ├── api.js              (NEW - REST API client)
│   ├── websocket.js        (NEW - WebSocket service)
│   ├── commands.js         (NEW - Terminal commands)
│   └── polymarketAPI.js    (existing)
│
├── utils/                  # Utility functions (ENHANCED)
│   ├── parser.js           (NEW - data parsing)
│   ├── formatter.js        (NEW - data formatting)
│   ├── helpers.js          (existing)
│   ├── auth.js             (existing)
│   └── ...                 (other existing utils)
│
├── styles/                 # CSS organization (NEW)
│   ├── global.css          (moved from styles.css)
│   └── terminal.css        (NEW - terminal styling)
│
├── data/                   # Data and constants (existing)
├── assets/                 # Static assets (existing)
├── App.jsx                 # Main app component (updated imports)
└── main.jsx                # Entry point (updated imports)
```

## What's New

### Terminal Components
- **Terminal.jsx**: Main terminal interface with command execution
- **CommandInput.jsx**: Command input with history navigation (arrow keys)
- **Output.jsx**: Formatted command output display
- **History.jsx**: Command history display

### Visualization Components
- **DataChart.jsx**: Renamed from PriceChart for generic data visualization
- **SentimentGraph.jsx**: Sentiment analysis visualization
- **PredictionPlot.jsx**: Predictive model results display
- **MarkovChain.jsx**: Markov chain state visualization

### Dashboard Components
- **StatsPanel.jsx**: System statistics (jobs, articles, queue)
- **JobQueue.jsx**: Active scraping/analysis jobs
- **LiveFeed.jsx**: Real-time event stream

### Hooks
- **useWebSocket**: WebSocket connection management with auto-reconnect
- **useTerminal**: Terminal state and command execution
- **useDataStream**: Real-time data streaming from backend
- **useWatchlist**: Moved from utils/ to hooks/

### Services
- **api.js**: Centralized REST API client with endpoints for:
  - Scraping (initiate, status)
  - Articles (list, get)
  - Analysis (trigger, results)
  - Predictions (generate, retrieve)
  - System stats and jobs
- **websocket.js**: WebSocket service for real-time updates
- **commands.js**: Terminal command parser and executor
  - Commands: scrape, analyze, predict, list, stats, help

### Utilities
- **parser.js**: Command, URL, CSV, query string parsing
- **formatter.js**: Timestamp, file size, number, percentage formatting

## Usage Example

### Terminal Usage
```jsx
import Terminal from './components/Terminal/Terminal';

function App() {
  return <Terminal />;
}
```

### WebSocket Hook
```jsx
import { useWebSocket } from './hooks/useWebSocket';

const { isConnected, lastMessage, sendMessage } = useWebSocket('ws://localhost:8080/ws');
```

### API Service
```jsx
import { api } from './services/api';

// Scrape a URL
const result = await api.initiateScrape('https://example.com');

// Get articles
const articles = await api.getArticles({ limit: 10 });
```

### Terminal Commands
Available commands when using the terminal:
- `scrape <url>` - Scrape a webpage
- `analyze <article_id> [type]` - Analyze an article
- `predict <dataset_id> [model]` - Generate predictions
- `list <resource>` - List articles or jobs
- `stats` - Show system statistics
- `help` - Display help

## Migration Notes

1. **Import paths updated** in App.jsx and main.jsx
2. **useWatchlist** moved from utils/ to hooks/
3. **PriceChart** renamed to **DataChart** and moved to Visualization/
4. **styles.css** moved to **styles/global.css**
5. **New terminal.css** for terminal-specific styling

## Next Steps

1. Integrate new Terminal component into main App.jsx
2. Connect API service to backend when available
3. Implement WebSocket endpoints in backend
4. Add Chart.js/D3.js visualizations to chart components
5. Test command execution flow
6. Add authentication to API requests

## Configuration

Create `.env` file with:
```
VITE_API_URL=http://localhost:8080/api/v1
VITE_WS_URL=ws://localhost:8080/ws
```
