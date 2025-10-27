/**
 * EVE Online Investment Analyzer
 * Analyzes EVE Online market data in Jita to find profitable investment opportunities
 */

import * as readline from 'readline';

// EVE Online constants
const JITA_REGION_ID = 10000002; // The Forge (Jita)
const USER_AGENT = 'PayForMyMembership/1.0.0 (laserwolve@gmail.com; EVE: Foggle Lopperbottom; +https://github.com/Laserwolve/PayForMyMembership)';

// ===== API FUNCTIONS =====

/**
 * Fetches all type IDs that are traded in a specific region
 * @param {number} regionId - EVE region ID
 * @returns {Promise<Array>} Array of type IDs
 */
async function fetchRegionTypes(regionId) {
  const allTypes = [];
  let page = 1;
  let hasMorePages = true;
  
  while (hasMorePages) {
    const url = `https://esi.evetech.net/latest/markets/${regionId}/types/?datasource=tranquility&page=${page}`;
    
    try {
      process.stdout.write(`Fetching page ${page}...\r`);
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': USER_AGENT
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch region types: ${response.status}`);
      }
      
      const types = await response.json();
      allTypes.push(...types);
      
      // Check if there are more pages
      const xPages = response.headers.get('X-Pages');
      if (xPages && page < parseInt(xPages)) {
        page++;
        await delay(1000); // 1 second delay between page requests
      } else {
        hasMorePages = false;
      }
    } catch (error) {
      console.error('Error fetching region types:', error.message);
      hasMorePages = false;
    }
  }
  
  return allTypes;
}

/**
 * Fetches names for a batch of type IDs
 * @param {Array<number>} typeIds - Array of type IDs to resolve
 * @returns {Promise<Array>} Array of {id, name, category} objects
 */
async function fetchNames(typeIds) {
  const url = 'https://esi.evetech.net/latest/universe/names/?datasource=tranquility';
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': USER_AGENT,
        'X-Compatibility-Date': '2025-09-30'
      },
      body: JSON.stringify(typeIds)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch names: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching names:', error.message);
    return [];
  }
}

/**
 * Fetches all tradeable items in Jita with names
 * @returns {Promise<Array>} Array of {id, name} objects
 */
async function fetchJitaItems() {
  console.log('Fetching items traded in Jita...');
  
  // Get all type IDs traded in Jita
  const typeIds = await fetchRegionTypes(JITA_REGION_ID);
  
  if (typeIds.length === 0) {
    console.error('Failed to fetch Jita market items');
    return [];
  }
  
  console.log(`Found ${typeIds.length} items traded in Jita`);
  console.log('Resolving item names (this may take a moment)...');
  
  // Fetch names in batches of 1000 (ESI limit)
  const allNames = [];
  const batchSize = 1000;
  
  for (let i = 0; i < typeIds.length; i += batchSize) {
    const batch = typeIds.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(typeIds.length / batchSize);
    
    process.stdout.write(`Resolving names batch ${batchNum}/${totalBatches}...\r`);
    const names = await fetchNames(batch);
    allNames.push(...names);
    
    // 1 second delay between batches
    if (i + batchSize < typeIds.length) {
      await delay(1000);
    }
  }
  
  console.log(''); // Clear the progress line
  
  // Combine into tradeable items array
  const items = allNames.map(nameData => ({
    id: nameData.id,
    name: nameData.name
  }));
  
  console.log(`✅ Loaded ${items.length} tradeable items\n`);
  
  return items;
}

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
        'User-Agent': USER_AGENT,
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
export async function runEVE() {
  console.log('🚀 EVE Online Investment Analyzer (Jita)');
  console.log('=====================================');
  console.log('Strategy: High-volatility, high-ROI opportunities\n');
  
  // Fetch all tradeable items in Jita dynamically
  const TRADEABLE_ITEMS = await fetchJitaItems();
  
  if (TRADEABLE_ITEMS.length === 0) {
    console.error('Failed to load tradeable items. Please try again.');
    process.exit(1);
  }
  
  // Get ISK budget
  const budgetInput = await promptUser('Enter your ISK budget: ');
  const budget = parseISKAmount(budgetInput);
  
  if (isNaN(budget) || budget <= 0) {
    console.error('Invalid budget amount. Please enter a positive number.');
    process.exit(1);
  }
  
  // Ask how many items to analyze
  const itemCountInput = await promptUser(`How many items to analyze? (max ${TRADEABLE_ITEMS.length}): `);
  const itemCount = Math.min(parseInt(itemCountInput), TRADEABLE_ITEMS.length);
  
  if (isNaN(itemCount) || itemCount <= 0) {
    console.error('Invalid number of items. Please enter a positive number.');
    process.exit(1);
  }
  
  // Randomly select items to analyze
  const shuffledItems = [...TRADEABLE_ITEMS].sort(() => Math.random() - 0.5);
  
  console.log(`\nBudget: ${budget.toLocaleString()} ISK`);
  console.log(`Market: Jita (The Forge)`);
  console.log(`Target items: ${itemCount}`);
  console.log(`Analyzing items...\n`);
  
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
