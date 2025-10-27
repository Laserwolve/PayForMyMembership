/**
 * OSRS Investment Analyzer
 * Analyzes Old School RuneScape item prices to find high-ROI investment opportunities
 */

import * as readline from 'readline';

// OSRS constants
const USER_AGENT = 'PayForMyMembership/1.0.0 (laserwolve@gmail.com; +https://github.com/Laserwolve/PayForMyMembership)';

// ===== API FUNCTIONS =====

/**
 * Fetches price history for an item from the OSRS API
 * @param {number} itemId - The OSRS item ID
 * @returns {Promise<Object>} Price data with timestamps and values
 */
async function fetchPriceHistory(itemId) {
  const url = `https://secure.runescape.com/m=itemdb_oldschool/api/graph/${itemId}.json`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': USER_AGENT
      }
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch item ${itemId}: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching data for item ${itemId}:`, error.message);
    return null;
  }
}

/**
 * Fetches item data from the OSRS item database
 * @returns {Promise<Object>} Item data
 */
async function fetchItemDatabase() {
  const url = 'https://chisel.weirdgloop.org/gazproj/gazbot/os_dump.json';
  console.log('Fetching item database...');
  
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': USER_AGENT
      }
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch item database: ${response.status}`);
    }
    const data = await response.json();
    console.log('✅ Item database loaded\n');
    return data;
  } catch (error) {
    console.error('Error fetching item database:', error.message);
    process.exit(1);
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
 * Converts price history object to sorted array of price points
 * @param {Object} priceData - Raw price data from API (timestamp: price)
 * @returns {Array} Sorted array of {timestamp, price} objects
 */
function convertToArray(priceData) {
  return Object.entries(priceData)
    .map(([timestamp, price]) => ({
      timestamp: parseInt(timestamp),
      price: price
    }))
    .sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Calculates the percentage change in price over the period
 * @param {Array} prices - Array of price points
 * @returns {number} Percentage change
 */
function calculatePriceChange(prices) {
  if (prices.length < 2) return 0;
  
  const firstPrice = prices[0].price;
  const lastPrice = prices[prices.length - 1].price;
  
  return ((lastPrice - firstPrice) / firstPrice) * 100;
}

/**
 * Calculates price volatility (standard deviation)
 * @param {Array} prices - Array of price points
 * @returns {number} Volatility as percentage of mean
 */
function calculateVolatility(prices) {
  if (prices.length < 2) return 0;
  
  const priceValues = prices.map(p => p.price);
  const mean = priceValues.reduce((a, b) => a + b, 0) / priceValues.length;
  
  const squaredDiffs = priceValues.map(price => Math.pow(price - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / priceValues.length;
  const stdDev = Math.sqrt(variance);
  
  return (stdDev / mean) * 100;
}

/**
 * Calculates recent momentum (30-day vs 60-day average)
 * @param {Array} prices - Array of price points
 * @returns {number} Momentum score
 */
function calculateMomentum(prices) {
  if (prices.length < 60) return 0;
  
  const recent30 = prices.slice(-30);
  const previous30 = prices.slice(-60, -30);
  
  const recent30Avg = recent30.reduce((sum, p) => sum + p.price, 0) / recent30.length;
  const previous30Avg = previous30.reduce((sum, p) => sum + p.price, 0) / previous30.length;
  
  return ((recent30Avg - previous30Avg) / previous30Avg) * 100;
}

/**
 * Calculates an investment score based on multiple factors
 * @param {number} priceChange - Overall price change percentage
 * @param {number} volatility - Price volatility percentage
 * @param {number} momentum - Recent momentum score
 * @param {number} currentPrice - Current item price
 * @param {number} budget - Total gold available to invest
 * @returns {number} Investment score (0-100)
 */
function calculateInvestmentScore(priceChange, volatility, momentum, currentPrice, budget) {
  // Strategy: High-volatility, cheap items for 40-50% ROI potential
  let score = 50; // Base score
  
  // High volatility is GOOD for this strategy (up to +25 points)
  // Items with 20%+ volatility get max points
  if (volatility >= 20) {
    score += 25;
  } else {
    score += (volatility / 20) * 25;
  }
  
  // Strong positive momentum is critical (up to +25 points)
  score += Math.min(momentum * 2.5, 25);
  
  // Recent strong price change indicates potential (up to +20 points)
  // Looking for items that have moved 40%+ already
  if (priceChange >= 40) {
    score += 20;
  } else if (priceChange > 0) {
    score += (priceChange / 40) * 20;
  }
  
  // Cheap items are preferred - can buy more units (up to +20 points)
  // Items under 50k get bonus points
  const affordability = Math.min(budget / currentPrice, 50);
  if (affordability >= 50) {
    score += 20; // Can buy 50+ units
  } else if (affordability >= 20) {
    score += 15; // Can buy 20-49 units
  } else if (affordability >= 10) {
    score += 10; // Can buy 10-19 units
  } else if (affordability >= 5) {
    score += 5; // Can buy 5-9 units
  }
  
  // Bonus for items showing breakout potential
  if (momentum > 10 && priceChange > 30 && volatility > 15) {
    score += 10; // Hot item bonus
  }
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Analyzes an item's price history
 * @param {Object} priceData - Raw price data from API
 * @param {Object} itemInfo - Item name and ID
 * @param {number} budget - Total gold available to invest
 * @returns {Object} Analysis results
 */
function analyzeItem(priceData, itemInfo, budget = 2500000) {
  if (!priceData || !priceData.daily) {
    return null;
  }
  
  const prices = convertToArray(priceData.daily);
  
  if (prices.length === 0) {
    return null;
  }
  
  const priceChange = calculatePriceChange(prices);
  const volatility = calculateVolatility(prices);
  const momentum = calculateMomentum(prices);
  
  const currentPrice = prices[prices.length - 1].price;
  const startPrice = prices[0].price;
  const unitsCanBuy = Math.floor(budget / currentPrice);
  
  const investmentScore = calculateInvestmentScore(priceChange, volatility, momentum, currentPrice, budget);
  
  return {
    id: itemInfo.id,
    name: itemInfo.name,
    currentPrice,
    startPrice,
    unitsCanBuy,
    priceChange: priceChange.toFixed(2),
    volatility: volatility.toFixed(2),
    momentum: momentum.toFixed(2),
    investmentScore: investmentScore.toFixed(1),
    dataPoints: prices.length
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
 * Parses gold amount from string (supports k, m, b suffixes)
 * @param {string} input - Input string like "2.5m", "500k", "1b"
 * @returns {number} Parsed gold amount
 */
function parseGoldAmount(input) {
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
 * Main application entry point
 */
export async function runOSRS() {
  console.log('🎮 OSRS Investment Analyzer');
  console.log('=====================================');
  console.log('Strategy: High-volatility, high-ROI opportunities\n');
  
  // Fetch item database
  const itemsData = await fetchItemDatabase();
  
  // Ask if user wants to include member items
  const includeMembersInput = await promptUser('Include member items? (y/n): ');
  const includeMembers = includeMembersInput.toLowerCase().trim() === 'y';
  
  // Get investment budget from user first (needed for volume filtering)
  const budgetInput = await promptUser('Enter your investment budget (gp): ');
  const INVESTMENT_BUDGET = parseGoldAmount(budgetInput);
  
  if (isNaN(INVESTMENT_BUDGET) || INVESTMENT_BUDGET <= 0) {
    console.error('Invalid budget amount. Please enter a positive number.');
    process.exit(1);
  }
  
  // Filter items based on member preference and sufficient volume
  const allItems = Object.entries(itemsData)
    .filter(([id, item]) => {
      // Skip items without required data
      if (!item.name || item.price === undefined || item.volume === undefined || item.limit === undefined) {
        return false;
      }
      
      // Filter by membership status
      if (!includeMembers && item.members !== false) {
        return false;
      }
      
      const unitsCanBuy = Math.floor(INVESTMENT_BUDGET / item.price);
      
      // Filter out items where we'd hit the buy limit
      if (unitsCanBuy > item.limit) {
        return false;
      }
      
      // Filter out items with insufficient volume
      // Don't include if we could buy more than 10% of daily volume
      const volumeThreshold = item.volume * 0.1;
      
      if (unitsCanBuy > volumeThreshold) {
        return false;
      }
      
      return true;
    })
    .map(([id, item]) => ({
      id: parseInt(id),
      name: item.name
    }));
  
  // Ask how many items to analyze
  const itemCountInput = await promptUser(`How many items to analyze? (max ${allItems.length}): `);
  const itemCount = Math.min(parseInt(itemCountInput), allItems.length);
  
  if (isNaN(itemCount) || itemCount <= 0) {
    console.error('Invalid number of items. Please enter a positive number.');
    process.exit(1);
  }
  
  // Randomly select items to analyze
  const itemsToAnalyze = allItems
    .sort(() => Math.random() - 0.5)
    .slice(0, itemCount);
  
  console.log(`\nBudget: ${INVESTMENT_BUDGET.toLocaleString()} gp`);
  console.log(`Items to analyze: ${itemsToAnalyze.length} (${includeMembers ? 'F2P + Members' : 'F2P only'})`);
  console.log(`Analyzing items...\n`);
  
  const results = [];
  
  // Fetch and analyze each item with proper rate limiting
  for (let i = 0; i < itemsToAnalyze.length; i++) {
    const item = itemsToAnalyze[i];
    process.stdout.write(`\x1b[2K\rFetching ${item.name} (${i + 1}/${itemsToAnalyze.length})...`);
    
    const priceData = await fetchPriceHistory(item.id);
    
    if (priceData) {
      const analysis = analyzeItem(priceData, item, INVESTMENT_BUDGET);
      if (analysis) {
        results.push(analysis);
      }
    }
    
    // Rate limit: 1000ms delay between requests to avoid rate limiting
    await delay(1000);
  }
  
  console.log('\n\n✅ Analysis Complete!\n');
  
  // Sort by investment score (highest first)
  results.sort((a, b) => parseFloat(b.investmentScore) - parseFloat(a.investmentScore));
  
  // Display top 3 recommendations
  console.log('📊 TOP 3 INVESTMENT RECOMMENDATIONS');
  console.log('=====================================\n');
  
  results.slice(0, 3).forEach((item, index) => {
    const totalCost = item.currentPrice * item.unitsCanBuy;
    
    console.log(`${index + 1}. ${item.name}`);
    console.log(`   Investment Score: ${item.investmentScore}/100`);
    console.log(`   Current Price: ${item.currentPrice.toLocaleString()} gp`);
    console.log(`   Can Buy: ${item.unitsCanBuy.toLocaleString()} units (${totalCost.toLocaleString()} gp)`);
    console.log(`   Price Change: ${item.priceChange > 0 ? '+' : ''}${item.priceChange}%`);
    console.log(`   Momentum: ${item.momentum > 0 ? '+' : ''}${item.momentum}%`);
    console.log(`   Volatility: ${item.volatility}% ${parseFloat(item.volatility) > 20 ? '🔥' : ''}`);
    console.log('');
  });
  
  console.log('\n');
}
