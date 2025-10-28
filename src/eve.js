/**
 * EVE Online Investment Analyzer
 * Analyzes EVE Online market data in Jita to find profitable investment opportunities
 */

import * as readline from 'readline';
import fs from 'fs';
import { createRequire } from 'module';
import yaml from 'js-yaml';

// Load package.json for app name and version
const require = createRequire(import.meta.url);
const pkg = require('../package.json');

// EVE Online constants
const JITA_REGION_ID = 10000002; // The Forge (Jita)

// Currently 50,535 items in EVE. ~18,838 are tradeable.
// We can get a full list of all items from https://esi.evetech.net/universe/types,
// but it doesn't include info like their name and if they're marketable or not.
// We'd have to call https://esi.evetech.net/universe/types/{type_id} on all 50,000+
// items. It's better to use the static download.

// sde:
//   buildNumber: 3077380
//   releaseDate: '2025-10-28T11:14:15Z'

/**
 * Loads tradeable items from EVE Online Static Data Export (SDE)
 * @returns {Array} Array of tradeable items with id and name
 */
function loadTradeableItemsFromSDE() {
  try {
    const typesFilePath = './data/types.yaml';
    
    if (!fs.existsSync(typesFilePath)) {
      console.warn('⚠️ types.yaml not found, falling back to hardcoded items');
      return FALLBACK_ITEMS;
    }
    
    console.log('📊 Loading tradeable items from EVE SDE...');
    const typesData = yaml.load(fs.readFileSync(typesFilePath, 'utf8'));
    
    const tradeableItems = [];
    
    for (const [typeId, typeData] of Object.entries(typesData)) {
      // Check if item is tradeable (has market group and is published)
      if (typeData.marketGroupID && typeData.published) {
        // Get English name from the name object
        const itemName = typeData.name?.en || typeData.name || `Item ${typeId}`;
        
        tradeableItems.push({
          id: parseInt(typeId),
          name: itemName
        });
      }
    }
    
    console.log(`✅ Loaded ${tradeableItems.length} tradeable items from SDE`);
    return tradeableItems;
    
  } catch (error) {
    console.error('❌ Error loading SDE data:', error.message);
    console.log('🔄 Falling back to hardcoded items');
    return FALLBACK_ITEMS;
  }
}

// Fallback items in case SDE loading fails
const FALLBACK_ITEMS = [
  { id: 34, name: 'Tritanium' },
  { id: 35, name: 'Pyerite' },
  { id: 36, name: 'Mexallon' },
  { id: 37, name: 'Isogen' },
  { id: 38, name: 'Nocxium' },
  { id: 39, name: 'Zydrine' },
  { id: 40, name: 'Megacyte' },
  { id: 44, name: 'Enriched Uranium' },
  { id: 11399, name: 'Morphite' },
  { id: 16275, name: 'Oxygen Isotopes' },
  { id: 16274, name: 'Nitrogen Isotopes' },
  { id: 16273, name: 'Hydrogen Isotopes' },
  { id: 16272, name: 'Helium Isotopes' },
  { id: 213, name: 'Shuttle' },
  { id: 588, name: 'Destroyer' },
  { id: 29668, name: 'PLEX' },
  { id: 44992, name: 'Skill Injector' },
  { id: 40520, name: 'Daily Alpha Injector' },
  { id: 3645, name: 'Magnetic Field Stabilizer II' },
  { id: 1952, name: 'Damage Control II' },
  { id: 5973, name: 'Heat Sink II' },
  { id: 2048, name: 'Ballistic Control System II' },
  { id: 11370, name: 'Twinkey' },
  { id: 34133, name: 'Quafe Zero' }
];

// Load all tradeable items from SDE
const TRADEABLE_ITEMS = loadTradeableItemsFromSDE();

// Dynamically construct USER_AGENT from GitHub Actions environment
const getGitHubEmail = () => {
  const actor = process.env.GITHUB_ACTOR;
  if (!actor) {
    throw new Error('GITHUB_ACTOR environment variable not set');
  }
  return `${actor}@users.noreply.github.com`;
};

const getRepoUrl = () => {
  const serverUrl = process.env.GITHUB_SERVER_URL;
  const repository = process.env.GITHUB_REPOSITORY;
  if (!serverUrl || !repository) {
    throw new Error('GitHub environment variables (GITHUB_SERVER_URL, GITHUB_REPOSITORY) not set');
  }
  return `${serverUrl}/${repository}`;
};

// USER_AGENT will be constructed when needed
let USER_AGENT = null;

const getUserAgent = () => {
  if (!USER_AGENT) {
    try {
      USER_AGENT = `${pkg.name}/${pkg.version} (${getGitHubEmail()}; +${getRepoUrl()})`;
    } catch (error) {
      // Fallback for local development
      USER_AGENT = `${pkg.name}/${pkg.version} (local-development)`;
    }
  }
  return USER_AGENT;
};

// ===== API FUNCTIONS =====

/**
 * Fetches market history for an item in a specific region
 * @param {number} regionId - EVE region ID
 * @param {number} typeId - Item type ID
 * @returns {Promise<Array>} Market history data
 */
async function fetchMarketHistory(regionId, typeId) {
  const url = `https://esi.evetech.net/latest/markets/${regionId}/history/?datasource=tranquility&type_id=${typeId}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': getUserAgent(),
        'X-Compatibility-Date': '2025-09-30'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch market data: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching market data for region ${regionId}:`, error.message);
    return null;
  }
}

/**
 * Delays execution for a specified time
 * @param {number} ms - Milliseconds to wait
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== ANALYSIS FUNCTIONS =====

/**
 * Calculates the percentage change in price over the period
 * @param {Array} history - Array of market data points
 * @returns {number} Percentage change
 */
function calculatePriceChange(history) {
  if (history.length < 2) return 0;
  
  const firstPrice = history[0].average;
  const lastPrice = history[history.length - 1].average;
  
  return ((lastPrice - firstPrice) / firstPrice) * 100;
}

/**
 * Calculates price volatility (standard deviation)
 * @param {Array} history - Array of market data points
 * @returns {number} Volatility as percentage of mean
 */
function calculateVolatility(history) {
  if (history.length < 2) return 0;
  
  const prices = history.map(day => day.average);
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  
  const squaredDiffs = prices.map(price => Math.pow(price - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / prices.length;
  const stdDev = Math.sqrt(variance);
  
  return (stdDev / mean) * 100;
}

/**
 * Calculates recent momentum (30-day vs 60-day average)
 * @param {Array} history - Array of market data points
 * @returns {number} Momentum score
 */
function calculateMomentum(history) {
  if (history.length < 60) return 0;
  
  const recent30 = history.slice(-30);
  const previous30 = history.slice(-60, -30);
  
  const recent30Avg = recent30.reduce((sum, day) => sum + day.average, 0) / recent30.length;
  const previous30Avg = previous30.reduce((sum, day) => sum + day.average, 0) / previous30.length;
  
  return ((recent30Avg - previous30Avg) / previous30Avg) * 100;
}

/**
 * Calculates an investment score based on multiple factors
 * @param {number} priceChange - Overall price change percentage
 * @param {number} volatility - Price volatility percentage
 * @param {number} momentum - Recent momentum score
 * @param {number} currentPrice - Current item price
 * @param {number} budget - Total ISK available to invest
 * @returns {number} Investment score (0-100)
 */
function calculateInvestmentScore(priceChange, volatility, momentum, currentPrice, budget) {
  // Strategy: High-volatility items with positive momentum (buy now, sell later)
  let score = 50; // Base score
  
  // High volatility is GOOD for speculation (up to +25 points)
  // Items with 10%+ volatility get max points
  if (volatility >= 10) {
    score += 25;
  } else {
    score += (volatility / 10) * 25;
  }
  
  // Strong positive momentum is critical (up to +25 points)
  // Price trending up = good time to buy and ride the wave
  if (momentum > 0) {
    score += Math.min(momentum * 2.5, 25);
  }
  
  // Recent price increase indicates active trend (up to +20 points)
  // Looking for items that are moving
  if (priceChange >= 20) {
    score += 20;
  } else if (priceChange > 0) {
    score += (priceChange / 20) * 20;
  } else if (priceChange < 0 && priceChange > -10) {
    // Small dip might be a buy opportunity
    score += 10;
  }
  
  // Affordable items get bonus (can buy more units) (up to +20 points)
  const affordability = Math.min(budget / currentPrice, 100);
  if (affordability >= 100) {
    score += 20; // Can buy 100+ units
  } else if (affordability >= 50) {
    score += 15; // Can buy 50-99 units
  } else if (affordability >= 20) {
    score += 10; // Can buy 20-49 units
  } else if (affordability >= 10) {
    score += 5; // Can buy 10-19 units
  }
  
  // Bonus for breakout items
  if (momentum > 5 && priceChange > 15 && volatility > 8) {
    score += 10; // Hot item bonus
  }
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Analyzes market data for an item
 * @param {Array} history - Market history data
 * @param {Object} itemInfo - Item name and ID
 * @param {number} budget - ISK budget
 * @returns {Object} Analysis results
 */
function analyzeItem(history, itemInfo, budget) {
  if (!history || history.length === 0) {
    return null;
  }
  
  // Sort by date
  history.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  const priceChange = calculatePriceChange(history);
  const volatility = calculateVolatility(history);
  const momentum = calculateMomentum(history);
  
  const currentPrice = history[history.length - 1].average;
  const currentVolume = history[history.length - 1].volume;
  const unitsCanBuy = Math.floor(budget / currentPrice);
  
  const investmentScore = calculateInvestmentScore(priceChange, volatility, momentum, currentPrice, budget);
  
  return {
    id: itemInfo.id,
    name: itemInfo.name,
    currentPrice: Math.round(currentPrice),
    unitsCanBuy,
    priceChange: priceChange.toFixed(2),
    volatility: volatility.toFixed(2),
    momentum: momentum.toFixed(2),
    volume: currentVolume,
    investmentScore: investmentScore.toFixed(1),
    dataPoints: history.length
  };
}

// ===== UTILITY FUNCTIONS =====

/**
 * Prompts user for input from command line
 * @param {string} question - Question to ask the user
 * @returns {Promise<string>} User's response
 */
function promptUser(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * Parses ISK amount from string (supports k, m, b suffixes)
 * @param {string} input - Input string like "2.5b", "500m", "1000k"
 * @returns {number} Parsed ISK amount
 */
function parseISKAmount(input) {
  const cleaned = input.toLowerCase().trim().replace(/,/g, '');
  
  // Check for suffixes
  if (cleaned.endsWith('k')) {
    return parseFloat(cleaned) * 1000;
  } else if (cleaned.endsWith('m')) {
    return parseFloat(cleaned) * 1000000;
  } else if (cleaned.endsWith('b')) {
    return parseFloat(cleaned) * 1000000000;
  }
  
  // No suffix, parse as regular number
  return parseFloat(cleaned);
}

// ===== MAIN APPLICATION =====

/**
 * Main application entry point for EVE Online analyzer
 */
export async function runEVE(budgetInput = null, maxItems = null, options = {}) {
  const { isGitHubActions = false, logFile = null } = options;
  
  console.log('🚀 EVE Online Investment Analyzer (Jita)');
  console.log('=====================================');
  console.log('Strategy: High-volatility, high-ROI opportunities\n');
  
  // Items are already loaded from SDE at module level
  console.log(`✅ Using ${TRADEABLE_ITEMS.length} tradeable items for analysis\n`);
  
  // Get ISK budget (from parameter or prompt)
  let budget;
  if (budgetInput) {
    budget = parseISKAmount(budgetInput);
  } else {
    const inputBudget = await promptUser('Enter your ISK budget: ');
    budget = parseISKAmount(inputBudget);
  }
  
  if (isNaN(budget) || budget <= 0) {
    if (isGitHubActions) {
      throw new Error('Invalid budget amount');
    } else {
      console.error('Invalid budget amount. Please enter a positive number.');
      process.exit(1);
    }
  }
  
  // Ask how many items to analyze (from parameter or prompt)
  let itemCount;
  if (maxItems) {
    itemCount = Math.min(maxItems, TRADEABLE_ITEMS.length);
  } else {
    const itemCountInput = await promptUser(`How many items to analyze? (max ${TRADEABLE_ITEMS.length}): `);
    itemCount = Math.min(parseInt(itemCountInput), TRADEABLE_ITEMS.length);
  }
  
  if (isNaN(itemCount) || itemCount <= 0) {
    if (isGitHubActions) {
      throw new Error('Invalid number of items');
    } else {
      console.error('Invalid number of items. Please enter a positive number.');
      process.exit(1);
    }
  }
  
  // Randomly select items to analyze
  const shuffledItems = [...TRADEABLE_ITEMS].sort(() => Math.random() - 0.5);
  
  const logMessage = (message) => {
    console.log(message);
    if (logFile) {
      const timestamp = new Date().toISOString();
      require('fs').appendFileSync(logFile, `${timestamp}: ${message}\n`);
    }
  };

  logMessage(`\nBudget: ${budget.toLocaleString()} ISK`);
  logMessage(`Market: Jita (The Forge)`);
  logMessage(`Target items: ${itemCount}`);
  logMessage(`Mode: ${isGitHubActions ? 'GitHub Actions' : 'Interactive'}`);
  logMessage(`Analyzing items...\n`);
  
  const results = [];
  let itemsChecked = 0;
  
  // Keep analyzing until we have enough valid items or run out of items
  for (let i = 0; i < shuffledItems.length && results.length < itemCount; i++) {
    const item = shuffledItems[i];
    itemsChecked++;
    process.stdout.write(`\x1b[2K\rChecking ${item.name} (${itemsChecked} checked, ${results.length}/${itemCount} found)...`);
    
    const history = await fetchMarketHistory(JITA_REGION_ID, item.id);
    
    if (history && history.length > 0) {
      const analysis = analyzeItem(history, item, budget);
      
      if (analysis) {
        // Filter out items with insufficient volume
        // Don't include if we could buy more than 10% of daily volume
        const volumeThreshold = analysis.volume * 0.1;
        
        if (analysis.unitsCanBuy <= volumeThreshold) {
          results.push(analysis);
        }
      }
    }
    
    // Rate limit: 1000ms delay between requests
    await delay(1000);
  }
  
  console.log('\n\n✅ Analysis Complete!\n');
  
  // Sort by investment score (highest first)
  results.sort((a, b) => parseFloat(b.investmentScore) - parseFloat(a.investmentScore));
  
  // Display top 3 recommendations
  console.log('� TOP 3 INVESTMENT RECOMMENDATIONS');
  console.log('=====================================\n');
  
  results.slice(0, 3).forEach((item, index) => {
    const totalCost = item.currentPrice * item.unitsCanBuy;
    
    console.log(`${index + 1}. ${item.name}`);
    console.log(`   Investment Score: ${item.investmentScore}/100`);
    console.log(`   Current Price: ${item.currentPrice.toLocaleString()} ISK`);
    console.log(`   Can Buy: ${item.unitsCanBuy.toLocaleString()} units (${totalCost.toLocaleString()} ISK)`);
    console.log(`   Price Change: ${item.priceChange > 0 ? '+' : ''}${item.priceChange}%`);
    console.log(`   Momentum: ${item.momentum > 0 ? '+' : ''}${item.momentum}%`);
    console.log(`   Volatility: ${item.volatility}% ${parseFloat(item.volatility) > 10 ? '�' : ''}`);
    console.log(`   Daily Volume: ${item.volume.toLocaleString()}`);
    console.log('');
  });
  
  console.log('\n');
}

/**
 * Automated EVE analysis for GitHub Actions
 * @param {string} budgetInput - ISK budget string
 * @param {number} maxItems - Maximum items to analyze
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Analysis results
 */
export async function runEVEAutomated(budgetInput, maxItems = null, options = {}) {
  const { isGitHubActions = false, logFile = null } = options;
  
  const logMessage = (message) => {
    console.log(message);
    if (logFile) {
      const timestamp = new Date().toISOString();
      require('fs').appendFileSync(logFile, `${timestamp}: ${message}\n`);
    }
  };

  logMessage('🚀 EVE Online Investment Analyzer (Automated)');
  logMessage('============================================');
  
  const budget = parseISKAmount(budgetInput);
  
  if (isNaN(budget) || budget <= 0) {
    throw new Error('Invalid budget amount');
  }

  logMessage(`Budget: ${budget.toLocaleString()} ISK`);
  logMessage(`Analyzing ALL available items`);
  logMessage(`Mode: ${isGitHubActions ? 'GitHub Actions' : 'Local'}`);
  logMessage('');

  // Items are already loaded from SDE at module level
  logMessage(`✅ Using ${TRADEABLE_ITEMS.length} tradeable items for analysis`);

  // Analyze ALL items (no limit when maxItems is null)
  const shuffledItems = [...TRADEABLE_ITEMS].sort(() => Math.random() - 0.5);
  const itemsToAnalyze = maxItems ? shuffledItems.slice(0, maxItems) : shuffledItems;

  logMessage(`Analyzing ALL ${itemsToAnalyze.length} items...`);
  logMessage('');

  const results = [];
  let itemsChecked = 0;
  let successfulAnalyses = 0;

  for (let i = 0; i < itemsToAnalyze.length; i++) {
    const item = itemsToAnalyze[i];
    itemsChecked++;
    
    // Progress update every 100 items
    if (itemsChecked % 100 === 0 || itemsChecked === itemsToAnalyze.length) {
      logMessage(`Progress: ${itemsChecked}/${itemsToAnalyze.length} (${successfulAnalyses} analyzed)`);
    }
    
    const history = await fetchMarketHistory(JITA_REGION_ID, item.id);
    
    if (history && history.length > 0) {
      const analysis = analyzeItem(history, item, budget);
      
      if (analysis) {
        // Volume filter
        const volumeThreshold = analysis.volume * 0.1;
        
        if (analysis.unitsCanBuy <= volumeThreshold) {
          results.push(analysis);
          successfulAnalyses++;
        }
      }
    }
    
    // Rate limiting
    await delay(1000);
  }

  logMessage('');
  logMessage(`✅ EVE Analysis Complete! Analyzed ${successfulAnalyses} items`);

  // Sort by investment score
  results.sort((a, b) => parseFloat(b.investmentScore) - parseFloat(a.investmentScore));

  return {
    recommendations: results.slice(0, 10),
    totalAnalyzed: successfulAnalyses,
    totalChecked: itemsChecked,
    budget: budget,
    budgetString: budgetInput
  };
}

// ===== EMAIL REPORT GENERATION =====

/**
 * Formats ISK amount with appropriate suffix
 * @param {number} amount - ISK amount
 * @returns {string} Formatted string
 */
function formatISK(amount) {
  if (amount >= 1000000000) {
    return `${(amount / 1000000000).toFixed(1)}B ISK`;
  } else if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M ISK`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K ISK`;
  }
  return `${amount} ISK`;
}

/**
 * Generates HTML email report from EVE analysis results
 * @param {Object} eveData - EVE analysis results
 * @returns {string} HTML email report
 */
function generateEmailReport(eveData) {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  let contentHtml = '';
  
  if (eveData.error) {
    contentHtml = `
      <div class="error">
        <p><strong>❌ Analysis Failed:</strong> ${eveData.error}</p>
      </div>
    `;
  } else {
    const { recommendations = [], metadata = {} } = eveData;
    
    let recommendationsHtml = '';
    if (recommendations.length > 0) {
      recommendationsHtml = recommendations.slice(0, 3).map((item, index) => `
        <div class="recommendation">
          <h4>${index + 1}. ${item.name}</h4>
          <div class="metrics">
            <span class="score">Score: ${item.investmentScore}/100</span>
            <span class="price">Price: ${formatISK(item.currentPrice)}</span>
            <span class="units">Can Buy: ${item.unitsCanBuy?.toLocaleString() || 'N/A'}</span>
          </div>
          <div class="details">
            <span>Change: ${item.priceChange > 0 ? '+' : ''}${item.priceChange}%</span>
            <span>Volatility: ${item.volatility}%</span>
            <span>Momentum: ${item.momentum > 0 ? '+' : ''}${item.momentum}%</span>
            <span>Volume: ${item.volume?.toLocaleString() || 'N/A'}</span>
          </div>
        </div>
      `).join('');
    } else {
      recommendationsHtml = '<p>No recommendations generated.</p>';
    }

    contentHtml = `
      <div class="metadata">
        <p><strong>Budget:</strong> ${metadata.budget || 'N/A'}</p>
        <p><strong>Market:</strong> Jita (The Forge)</p>
        <p><strong>Items Analyzed:</strong> ${metadata.itemsAnalyzed || 0}</p>
        <p><strong>Analysis Time:</strong> ${metadata.analysisTime || 'N/A'}</p>
      </div>
      <h3>Top Recommendations:</h3>
      ${recommendationsHtml}
    `;
  }

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>EVE Online Market Analysis Report</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            margin-bottom: 20px;
        }
        .content {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .recommendation {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 15px;
            border-left: 4px solid #667eea;
        }
        .recommendation h4 {
            margin: 0 0 10px 0;
            color: #333;
        }
        .metrics {
            display: flex;
            gap: 15px;
            margin-bottom: 8px;
            flex-wrap: wrap;
        }
        .metrics span {
            background: #e9ecef;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.9em;
        }
        .details {
            display: flex;
            gap: 15px;
            font-size: 0.9em;
            color: #666;
            flex-wrap: wrap;
        }
        .details span {
            background: #fff;
            padding: 4px 8px;
            border-radius: 4px;
            border: 1px solid #dee2e6;
        }
        .score {
            background: #28a745 !important;
            color: white !important;
        }
        .metadata {
            background: #f8f9fa;
            padding: 10px;
            border-radius: 5px;
            margin-bottom: 15px;
        }
        .metadata p {
            margin: 5px 0;
        }
        .error {
            background: #f8d7da;
            color: #721c24;
            padding: 10px;
            border-radius: 5px;
            border: 1px solid #f5c6cb;
        }
        .footer {
            text-align: center;
            color: #666;
            font-size: 0.9em;
            margin-top: 30px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 EVE Online</h1>
        <h2>Market Analysis Report</h2>
        <p>${currentDate}</p>
    </div>

    <div class="content">
      ${contentHtml}
    </div>

    <div class="footer">
        <p>Generated by Mythic Market Mogul GitHub Actions</p>
        <p>Strategy: High-volatility, high-ROI opportunities</p>
        <p><em>⚠️ This is speculative analysis. Trade at your own risk.</em></p>
    </div>
</body>
</html>
  `;
}

// ===== GITHUB ACTIONS RUNNER =====

/**
 * Main entry point when run directly (e.g., node eve.js or GitHub Actions)
 */
async function main() {
  const BUDGET = process.env.BUDGET || '1b';
  const IS_GITHUB_ACTIONS = process.env.GITHUB_ACTIONS === 'true';

  console.log('🚀 EVE Online GitHub Actions Analysis');
  console.log('====================================');
  console.log(`Budget: ${BUDGET}`);
  console.log(`Analyzing ALL available items`);
  console.log(`Environment: ${IS_GITHUB_ACTIONS ? 'GitHub Actions' : 'Local'}`);
  console.log('');

  const startTime = Date.now();
  
  try {
    const results = await runEVEAutomated(BUDGET, null, {
      isGitHubActions: IS_GITHUB_ACTIONS,
      logFile: 'eve-analysis.log'
    });
    
    const endTime = Date.now();
    const analysisTime = Math.round((endTime - startTime) / 1000);
    
    // Add metadata
    results.metadata = {
      budget: BUDGET,
      itemsAnalyzed: results.totalAnalyzed || 0,
      analysisTime: `${Math.floor(analysisTime / 60)}m ${analysisTime % 60}s`,
      timestamp: new Date().toISOString(),
      environment: 'GitHub Actions'
    };
    
    // Save results to JSON
    fs.writeFileSync('eve-results.json', JSON.stringify(results, null, 2));
    
    // Generate and save email report
    const emailHtml = generateEmailReport(results);
    fs.writeFileSync('email-report.html', emailHtml);
    
    console.log('\n✅ Analysis Complete!');
    console.log(`Total time: ${results.metadata.analysisTime}`);
    console.log(`Items analyzed: ${results.metadata.itemsAnalyzed}`);
    console.log('Results saved to eve-results.json');
    console.log('Email report saved to email-report.html');
    
    // Log top 3 for GitHub Actions summary
    if (results.recommendations && results.recommendations.length > 0) {
      console.log('\n🏆 TOP 3 RECOMMENDATIONS:');
      results.recommendations.slice(0, 3).forEach((item, index) => {
        console.log(`${index + 1}. ${item.name} - Score: ${item.investmentScore}/100`);
      });
    }
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    
    // Save error info
    const errorResult = {
      error: error.message,
      metadata: {
        budget: BUDGET,
        timestamp: new Date().toISOString(),
        environment: 'GitHub Actions',
        failed: true
      }
    };
    
    fs.writeFileSync('eve-results.json', JSON.stringify(errorResult, null, 2));
    
    // Generate error email report
    const emailHtml = generateEmailReport(errorResult);
    fs.writeFileSync('email-report.html', emailHtml);
    
    process.exit(1);
  }
}

// Run main function if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
