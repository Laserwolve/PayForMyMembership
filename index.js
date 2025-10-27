/**
 * PayForMyMembership - Multi-Game Investment Analyzer
 * Analyzes in-game markets to find profitable premium currency trading opportunities
 */

import { runOSRS } from './osrs.js';
import { runEVE } from './eve.js';
import * as readline from 'readline';

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
 * Main application entry point
 */
async function main() {
  console.log('💰 PayForMyMembership');
  console.log('=====================================');
  console.log('Multi-Game Investment Analyzer\n');
  console.log('Available games:');
  console.log('  1. Old School RuneScape');
  console.log('  2. EVE Online\n');
  
  const choice = await promptUser('Select a game (1-2): ');
  
  console.log('');
  
  switch (choice.trim()) {
    case '1':
    case 'osrs':
    case 'OSRS':
      await runOSRS();
      break;
    case '2':
    case 'eve':
    case 'EVE':
      await runEVE();
      break;
    default:
      console.log('Invalid choice. Please run again and select 1 or 2.');
      process.exit(1);
  }
}

// Run the application
main().catch(error => {
  console.error('Error running analyzer:', error);
  process.exit(1);
});

