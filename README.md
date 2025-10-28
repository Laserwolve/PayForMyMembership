# Mythic Market Mogul - Multi-Game Investment Analyzer

A Node.js application that analyzes in-game market data to find profitable premium currency trading opportunities across multiple MMO games.

## Supported Games

- **Old School RuneScape**: Analyze item prices to maximize ROI before buying Bonds
- **EVE Online**: Analyze Jita market data to find high-volatility investment opportunities

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

### EVE Online Analyzer
- Fetches all tradeable items in Jita (The Forge region)
- Analyzes market history for dynamic item selection
- User-customizable ISK budget (supports "2.5b", "500m", "1000k" format)
- Smart filtering:
  - Ensures sufficient market liquidity (max 10% of daily volume)
  - Dynamically loads all available market items
- Investment metrics:
  - Price change percentage over available history
  - Price volatility (standard deviation analysis)
  - Recent momentum (30-day vs 60-day comparison)
  - Investment score (0-100) optimized for EVE markets
- Displays top 3 high-volatility investment opportunities

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

### EVE Online Workflow

1. Select game (EVE Online)
2. Enter your ISK budget (e.g., "2.5b", "500m", "1000k")
3. Enter how many items to analyze (random sampling from all Jita items)
4. Wait for analysis (1 request per second to respect ESI API limits)
5. View top 3 investment recommendations with detailed metrics

## How It Works

### OSRS Analysis Process

1. **Data Collection**: 
   - Fetches live item database from `https://chisel.weirdgloop.org/gazproj/gazbot/os_dump.json`
   - Fetches 180-day price history from `https://secure.runescape.com/m=itemdb_oldschool/api/graph/{itemId}.json`
2. **Filtering**:
   - Removes items without required data (price, volume)
   - Filters by membership status (F2P vs Members)
   - Excludes items where purchase would exceed GE buy limit (when limit exists)
   - Items without buy limit data are included (unlimited purchase potential)
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

### EVE Online Analysis Process

1. **Data Collection**:
   - Fetches all tradeable items in Jita from `https://esi.evetech.net/latest/markets/{regionId}/types/`
   - Resolves item names using `https://esi.evetech.net/latest/universe/names/`
   - Fetches market history from `https://esi.evetech.net/latest/markets/{regionId}/history/`
2. **Filtering**:
   - Excludes items with insufficient trading data
   - Ensures purchase amount doesn't exceed 10% of daily volume
   - Random sampling from all available items for analysis
3. **Analysis**: Calculates multiple metrics:
   - Overall price change over available history
   - Price volatility (standard deviation as % of mean)
   - Recent momentum (30-day vs 60-day average when sufficient data)
4. **Scoring**: Generates investment score (0-100) optimized for EVE markets:
   - **High volatility** (10%+ volatility gets max points)
   - **Strong momentum** (positive recent trends)
   - **Price movement** (recent upward trends favored)
   - **Affordability** (allows purchasing multiple units)
   - Hot item breakout bonuses
5. **Recommendations**: Shows top 3 items ranked by investment score

## Investment Strategy

Both analyzers target **high-volatility, high-ROI opportunities**:

### OSRS Strategy
- Looks for items with 40-50% return potential
- Favors volatile items (20%+ volatility)
- Prefers cheap items (can buy more units)
- Identifies momentum breakouts
- **NOT** a conservative strategy - this is for aggressive speculation

### EVE Online Strategy
- Focuses on high-volatility items (10%+ volatility threshold)
- Prioritizes positive momentum and recent price trends
- Considers market liquidity and trading volume
- Identifies breakout patterns for speculative trading
- **High-risk, high-reward** approach suitable for experienced traders

## Output Format

Both analyzers display top 3 recommendations with:
- Investment score (0-100)
- Current price (GP for OSRS, ISK for EVE)
- Units you can buy within budget
- Total investment cost
- Price change over analysis period
- Momentum score
- Volatility percentage (🔥 emoji for high-volatility items)
- Daily trading volume

## File Structure

```
├── index.js              # Main entry point - game selection menu
├── osrs.js               # OSRS analyzer (complete implementation)
├── eve.js                # EVE Online analyzer (complete implementation)  
├── package.json          # Project configuration
├── README.md             # Project documentation
├── SECURITY.md           # Security policy and vulnerability reporting
├── SUPPORT.md            # Support and troubleshooting guide
├── CONTRIBUTING.md       # Contribution guidelines
├── CODE_OF_CONDUCT.md    # Community standards and behavior expectations
├── CITATION.md           # Academic citation information
└── LICENSE               # Project license (ISC)
```

## Automated Daily Analysis (GitHub Actions)

This repository runs **automated daily market analysis** via GitHub Actions:

### Features
- **Daily Schedule**: Runs automatically at 2:00 AM UTC every day
- **Dual Analysis**: Both OSRS and EVE Online markets analyzed simultaneously
- **Email Reports**: Beautiful HTML email reports sent automatically
- **Manual Triggers**: Can run on-demand with custom parameters
- **Progress Tracking**: Detailed logging and analysis progress
- **Result Storage**: JSON results and logs stored as artifacts

### Email Reports Include
- **Top 3 recommendations** for each game
- **Investment scores** and detailed metrics
- **Analysis metadata** (items analyzed, time taken, budget used)
- **Professional formatting** with color-coded sections
- **Risk warnings** and strategy information

### Manual Execution
To trigger analysis manually:
1. Go to repository "Actions" tab
2. Select "Daily Market Analysis" 
3. Click "Run workflow"
4. Customize budgets and item limits if desired

### Email Setup
To receive email reports, add these secrets to your repository:
- `EMAIL_USERNAME`: Your Gmail address
- `EMAIL_PASSWORD`: Gmail app password (not your regular password)

## Interactive Mode (Local Use)

For local interactive analysis, the original functionality remains:

```bash
npm start
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:
- Reporting bugs and requesting features
- Code style and development setup
- Adding support for new games
- API integration best practices

## Support

Need help? Check out [SUPPORT.md](SUPPORT.md) for:
- Common issues and solutions
- Contact information
- Technical requirements

## Security

Found a security issue? Please see [SECURITY.md](SECURITY.md) for responsible disclosure guidelines.

## Citation

If you use this project in research or academic work, please see [CITATION.md](CITATION.md) for proper citation formats.
