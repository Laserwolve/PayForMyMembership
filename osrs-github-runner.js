/**
 * OSRS GitHub Actions Runner
 * Automated OSRS market analysis for GitHub Actions
 */

import { runOSRSAutomated } from './osrs.js';
import fs from 'fs';

const BUDGET = process.env.BUDGET || '50m';
const MAX_ITEMS = parseInt(process.env.MAX_ITEMS) || 500;
const IS_GITHUB_ACTIONS = process.env.GITHUB_ACTIONS === 'true';

async function main() {
  console.log('🚀 OSRS GitHub Actions Analysis');
  console.log('===============================');
  console.log(`Budget: ${BUDGET}`);
  console.log(`Max Items: ${MAX_ITEMS}`);
  console.log(`Environment: ${IS_GITHUB_ACTIONS ? 'GitHub Actions' : 'Local'}`);
  console.log('');

  const startTime = Date.now();
  
  try {
    const results = await runOSRSAutomated(BUDGET, MAX_ITEMS, {
      isGitHubActions: IS_GITHUB_ACTIONS,
      logFile: 'osrs-analysis.log'
    });
    
    const endTime = Date.now();
    const analysisTime = Math.round((endTime - startTime) / 1000);
    
    // Add metadata
    results.metadata = {
      budget: BUDGET,
      maxItems: MAX_ITEMS,
      itemsAnalyzed: results.totalAnalyzed || 0,
      analysisTime: `${Math.floor(analysisTime / 60)}m ${analysisTime % 60}s`,
      timestamp: new Date().toISOString(),
      environment: 'GitHub Actions'
    };
    
    // Save results to JSON
    fs.writeFileSync('osrs-results.json', JSON.stringify(results, null, 2));
    
    console.log('\n✅ OSRS Analysis Complete!');
    console.log(`Total time: ${results.metadata.analysisTime}`);
    console.log(`Items analyzed: ${results.metadata.itemsAnalyzed}`);
    console.log('Results saved to osrs-results.json');
    
    // Log top 3 for GitHub Actions summary
    if (results.recommendations && results.recommendations.length > 0) {
      console.log('\n🏆 TOP 3 OSRS RECOMMENDATIONS:');
      results.recommendations.slice(0, 3).forEach((item, index) => {
        console.log(`${index + 1}. ${item.name} - Score: ${item.investmentScore}/100`);
      });
    }
    
  } catch (error) {
    console.error('❌ OSRS Analysis failed:', error.message);
    
    // Save error info
    const errorResult = {
      error: error.message,
      metadata: {
        budget: BUDGET,
        maxItems: MAX_ITEMS,
        timestamp: new Date().toISOString(),
        environment: 'GitHub Actions',
        failed: true
      }
    };
    
    fs.writeFileSync('osrs-results.json', JSON.stringify(errorResult, null, 2));
    process.exit(1);
  }
}

main();