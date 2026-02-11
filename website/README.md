# Leet Terminal

A React-based prediction markets analytics terminal, converted from a single HTML file to a modular React application.

## Project Structure

```
website/
├── src/
│   ├── components/
│   │   ├── panels/          # Panel components
│   │   │   ├── WatchlistPanel.jsx
│   │   │   ├── MarketOverviewPanel.jsx
│   │   │   ├── PriceChartPanel.jsx
│   │   │   ├── OrderBookPanel.jsx
│   │   │   ├── ConfluencePanel.jsx
│   │   │   ├── ModelBreakdownPanel.jsx
│   │   │   ├── GreeksPanel.jsx
│   │   │   ├── MonteCarloPanel.jsx
│   │   │   ├── PortfolioPanel.jsx
│   │   │   ├── QuantumLabPanel.jsx
│   │   │   ├── NewsFeedPanel.jsx
│   │   │   ├── MarketTradesPanel.jsx
│   │   │   └── BuySellPanel.jsx
│   │   ├── DataRow.jsx
│   │   ├── PanelHeader.jsx
│   │   ├── Tag.jsx
│   │   ├── PriceChart.jsx
│   │   ├── MonteCarloChart.jsx
│   │   └── MarketDetailDock.jsx
│   ├── data/
│   │   └── constants.js     # Market data, news feed, portfolio positions
│   ├── utils/
│   │   ├── helpers.js        # Utility functions (price history, orderbook, trades)
│   │   └── quantEngine.js    # Quantitative analysis engine
│   ├── App.jsx               # Main Terminal component
│   ├── main.jsx              # Entry point
│   └── styles.css            # Global styles
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

## Features

- **Modular Architecture**: All components are split into separate files for better maintainability
- **Data Management**: Centralized data constants and utility functions
- **Component-Based**: Reusable React components organized by functionality
- **Quantitative Analysis**: Monte Carlo simulations, Kelly criterion, expected value calculations
- **Real-time Updates**: Market data updates and live trade feeds
- **Resizable Layout**: Drag-to-resize panels for custom workspace layouts

## Technologies

- React 18
- Vite
- Chart.js
- Tailwind CSS (via CDN)

