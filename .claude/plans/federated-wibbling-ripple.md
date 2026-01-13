# Chart Integration Migration Plan

## Objective
Replace Chart.js components with new ECharts/TradingView components to fix the build error and provide professional-grade charts.

## Current Problem
- `chart.js` was removed from `package.json` but old components still import it
- Error: `Failed to resolve import "chart.js/auto" from "src/components/MonteCarloChart.jsx"`

---

## Files to Modify (4 files)

### 1. `website/src/components/panels/MonteCarloPanel.jsx`

**Line 4 - Change import:**
```javascript
// FROM:
import { MonteCarloChart } from '../MonteCarloChart';

// TO:
import { MonteCarloChart } from '../charts/MonteCarloChart';
```

**Line 93-95 - Replace the chart div and component:**
```javascript
// FROM:
<div className="h-20 p-1">
  <MonteCarloChart paths={simulation.paths} />
</div>

// TO: (compute medianPath inline, increase height)
<div className="p-1" style={{ height: '120px' }}>
  <MonteCarloChart
    samplePaths={simulation.paths}
    medianPath={(() => {
      const paths = simulation.paths;
      if (!paths || paths.length === 0) return [];
      const numTrades = paths[0]?.length || 0;
      const median = [];
      for (let i = 0; i < numTrades; i++) {
        const vals = paths.map(p => p[i] || 0).sort((a, b) => a - b);
        median.push(vals[Math.floor(vals.length / 2)]);
      }
      return median;
    })()}
    startingCapital={10000}
    height={110}
    showExpand={true}
  />
</div>
```

---

### 2. `website/src/components/panels/PriceChartPanel.jsx`

**Line 2 - Change import:**
```javascript
// FROM:
import { PriceChart } from '../PriceChart';

// TO:
import { TradingViewChart } from '../charts/TradingViewChart';
```

**Lines 15-18 - Replace chart component:**
```javascript
// FROM:
<div className="flex-1 min-h-0">
  <PriceChart data={market.price_history} />
</div>

// TO: (map `time` to `timestamp` for compatibility)
<div className="flex-1 min-h-0">
  <TradingViewChart
    data={(market.price_history || []).map(p => ({
      ...p,
      timestamp: p.time || p.timestamp || Date.now()
    }))}
    height={200}
    chartType="area"
    priceFormat="percent"
    showExpand={true}
  />
</div>
```

---

### 3. `website/src/components/MarketDetailDock.jsx`

**Line 2 - Change import:**
```javascript
// FROM:
import { PriceChart } from './PriceChart';

// TO:
import { TradingViewChart } from './charts/TradingViewChart';
```

**Lines 71-76 - Replace chart component:**
```javascript
// FROM:
<div className="flex-1 p-1">
  <PriceChart
    data={market.price_history}
    height={150}
  />
</div>

// TO:
<div className="flex-1 p-1">
  <TradingViewChart
    data={(market.price_history || []).map(p => ({
      ...p,
      timestamp: p.time || p.timestamp || Date.now()
    }))}
    height={140}
    chartType="area"
    priceFormat="percent"
    showExpand={false}
  />
</div>
```

---

### 4. `website/src/utils/quantEngine.js`

**Line 46 - Add medianPath to return object:**

After line 45 (`paths: results.slice(0, 40).map((r) => r.path),`), add:
```javascript
medianPath: (() => {
  const allPaths = results.slice(0, 40).map((r) => r.path);
  if (allPaths.length === 0) return [];
  const numTrades = allPaths[0]?.length || 0;
  const median = [];
  for (let i = 0; i < numTrades; i++) {
    const vals = allPaths.map(p => p[i] || 0).sort((a, b) => a - b);
    median.push(vals[Math.floor(vals.length / 2)]);
  }
  return median;
})(),
```

**NOTE:** This is optional - the MonteCarloPanel already computes it inline. But adding it here is cleaner.

---

## Data Format Mapping

### Price History
| Old Field | New Field | Action |
|-----------|-----------|--------|
| `time` | `timestamp` | Map in panel: `timestamp: p.time` |
| `date` | `date` | No change |
| `price` | `price` | No change |

### Monte Carlo
| Old | New | Action |
|-----|-----|--------|
| `paths` | `samplePaths` | Rename prop |
| (computed) | `medianPath` | Calculate inline |
| (hardcoded) | `startingCapital` | Pass `10000` |

---

## Verification Checklist

After making changes, run:
```bash
cd /Users/nicolasleyva/Downloads/leet-terminal-claude-hybrid-charting-artifact-KJDs4/website
npm run dev
```

Then open http://localhost:5173 and verify:

- [ ] No build errors
- [ ] Price chart panel shows orange area chart
- [ ] Monte Carlo panel shows multiple colored paths with orange median
- [ ] Market detail dock shows mini price chart
- [ ] Charts have zoom (mouse wheel) and pan (drag)
- [ ] "Expand" button opens fullscreen modal
- [ ] Tooltips appear on hover
- [ ] ESC closes modal
- [ ] No console errors

---

## Execution Order

1. **MonteCarloPanel.jsx** - Fix the immediate build error first
2. **PriceChartPanel.jsx** - Replace price chart
3. **MarketDetailDock.jsx** - Replace dock price chart
4. **Test thoroughly**
5. **Optional cleanup** - Delete old components after verification:
   - `website/src/components/MonteCarloChart.jsx`
   - `website/src/components/PriceChart.jsx`
