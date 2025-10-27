# PayForMyMembership - Multi-Game Investment Analyzer

A Node.js application that analyzes in-game market data to find profitable premium currency trading opportunities across multiple MMO games.

## Supported Games

- **OSRS (Old School RuneScape)**: Analyze item prices to maximize ROI before buying Bonds
- **EVE Online**: *(Coming soon)* PLEX trading analysis

## Features

### OSRS Analyzer
- Fetches live item data from the OSRS item database
- Analyzes 180-day price history for any number of items
- Supports both F2P and Members items
- User-customizable investment budget (supports "2.5m", "500k", "6b" format)
- Random sampling for faster analysis
- Smart filtering:
  - Respects Grand Exchange buy limits
  - Ensures sufficient market volume (max 10% of daily volume)
  - Filters by membership status
- Investment metrics:
  - Price change percentage
  - Price volatility (high volatility = good for this strategy)
  - Recent momentum (30-day vs 60-day trends)
  - Investment score (0-100)
- Displays top 3 high-volatility, high-ROI recommendations

## Installation

```bash
npm install
```

## Usage

Run the analyzer:

```bash
npm start
```

Then select a game:
- Enter `1` or `osrs` for Old School RuneScape
- Enter `2` or `eve` for EVE Online

### OSRS Workflow

1. Select game (OSRS)
2. Choose whether to include member items (y/n)
3. Enter your investment budget (e.g., "2.5m", "500k", "10b")
4. Enter how many items to analyze (random sampling)
5. Wait for analysis (1 request per second to respect API limits)
6. View top 3 investment recommendations

## How It Works (OSRS)

1. **Data Collection**: 
   - Fetches live item database from `https://chisel.weirdgloop.org/gazproj/gazbot/os_dump.json`
   - Fetches 180-day price history from `https://secure.runescape.com/m=itemdb_oldschool/api/graph/{itemId}.json`
2. **Filtering**:
   - Removes items without required data (price, volume, buy limit)
   - Filters by membership status (F2P vs Members)
   - Excludes items where purchase would exceed GE buy limit
   - Excludes items with insufficient volume (rejects if purchase > 10% of daily volume)
3. **Analysis**: Calculates multiple metrics:
   - Overall price change over 180 days
   - Price volatility (standard deviation as % of mean)
   - Recent momentum (30-day vs 60-day average comparison)
4. **Scoring**: Generates investment score (0-100) based on:
   - **High volatility** (20%+ volatility gets max points)
   - **Strong momentum** (positive short-term trends)
   - **Price movement** (40%+ price change favored)
   - **Affordability** (cheap items = buy more units)
   - Breakout patterns (bonus points)
5. **Recommendations**: Shows top 3 items ranked by investment score

## Investment Strategy (OSRS)

This analyzer targets **high-volatility, high-ROI opportunities**:
- Looks for items with 40-50% return potential
- Favors volatile items (20%+ volatility)
- Prefers cheap items (can buy more units)
- Identifies momentum breakouts
- **NOT** a conservative strategy - this is for aggressive speculation

## Output (OSRS)

Displays top 3 recommendations with:
- Investment score (0-100)
- Current price
- Units you can buy within budget
- Total investment cost
- Price change over 180 days
- Momentum score
- Volatility (🔥 emoji for items with 20%+ volatility)

## Rate Limiting

- OSRS API: 1 request per second (1000ms delay)
- Respectful of API limits to avoid being blocked

## File Structure

```
├── index.js        # Main entry point - game selection menu
├── osrs.js         # OSRS analyzer (all-in-one module)
├── eve.js          # EVE Online analyzer (coming soon)
├── package.json    # Project configuration
└── README.md       # This file
```

## Future Plans

- EVE Online PLEX price analysis
- Guild Wars 2 Gem trading analyzer
- Historical price charting
- Discord bot integration
- Web interface
