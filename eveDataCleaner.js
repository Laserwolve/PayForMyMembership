#!/usr/bin/env node

/**
 * EVE Online Data Cleaner
 * Cleans types.yaml to only include tradeable items with minimal data
 * 
 * This script:
 * 1. Filters out entries without marketGroupID or not published
 * 2. Keeps only typeID and English name for remaining entries
 * 3. Significantly reduces file size for faster loading
 */

// We have to do this as the original provided as provided by CCP
// is over 100 MBs, which means we can't upload it to GitHub,
// which means it can't be used in GitHub Actions.

import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';

const INPUT_FILE = './data/types.yaml';
const OUTPUT_FILE = './data/types_cleaned.yaml';

console.log('🧹 EVE Online Data Cleaner');
console.log('===========================');

async function cleanEVEData() {
  try {
    // Check if input file exists
    if (!fs.existsSync(INPUT_FILE)) {
      console.error(`❌ Input file not found: ${INPUT_FILE}`);
      process.exit(1);
    }

    // Get file size before cleaning
    const originalSize = fs.statSync(INPUT_FILE).size;
    console.log(`📁 Original file size: ${(originalSize / (1024 * 1024)).toFixed(2)} MB`);

    console.log('📖 Loading types.yaml...');
    const typesData = yaml.load(fs.readFileSync(INPUT_FILE, 'utf8'));
    
    console.log('🔍 Filtering and cleaning data...');
    const cleanedData = {};
    let totalEntries = 0;
    let keptEntries = 0;
    let progressCounter = 0;

    // Process each entry
    for (const [typeId, typeData] of Object.entries(typesData)) {
      totalEntries++;
      progressCounter++;

      // Progress update every 1000 entries
      if (progressCounter % 1000 === 0) {
        process.stdout.write(`\r   Processing: ${progressCounter.toLocaleString()} entries...`);
      }

      // Filter: Only keep items with marketGroupID and published
      if (typeData.marketGroupID && typeData.published) {
        // Get English name
        let itemName;
        if (typeData.name && typeof typeData.name === 'object') {
          // Multi-language name object
          itemName = typeData.name.en || Object.values(typeData.name)[0] || `Item ${typeId}`;
        } else if (typeof typeData.name === 'string') {
          // Simple string name
          itemName = typeData.name;
        } else {
          // Fallback
          itemName = `Item ${typeId}`;
        }

        // Keep only essential data
        cleanedData[typeId] = {
          name: itemName
        };

        keptEntries++;
      }
    }

    console.log(`\n✅ Processing complete!`);
    console.log(`   Total entries processed: ${totalEntries.toLocaleString()}`);
    console.log(`   Entries kept: ${keptEntries.toLocaleString()}`);
    console.log(`   Entries removed: ${(totalEntries - keptEntries).toLocaleString()}`);
    console.log(`   Reduction: ${((totalEntries - keptEntries) / totalEntries * 100).toFixed(1)}%`);

    // Write cleaned data
    console.log('💾 Writing cleaned data...');
    const cleanedYaml = yaml.dump(cleanedData, {
      indent: 2,
      lineWidth: -1, // No line wrapping
      noRefs: true,
      sortKeys: true // Sort by typeID for consistent output
    });

    fs.writeFileSync(OUTPUT_FILE, cleanedYaml, 'utf8');

    // Get file sizes for comparison
    const cleanedSize = fs.statSync(OUTPUT_FILE).size;
    const sizeReduction = ((originalSize - cleanedSize) / originalSize * 100);

    console.log('\n📊 File Size Comparison:');
    console.log(`   Original: ${(originalSize / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`   Cleaned:  ${(cleanedSize / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`   Reduction: ${sizeReduction.toFixed(1)}% smaller`);

    console.log('\n🔄 Replacing original file...');
    fs.renameSync(OUTPUT_FILE, INPUT_FILE);

    console.log('\n✅ EVE data cleaning complete!');
    console.log(`   Cleaned file saved as: ${INPUT_FILE}`);
    console.log(`   Ready for use with ${keptEntries.toLocaleString()} tradeable items!`);

  } catch (error) {
    console.error('\n❌ Error cleaning EVE data:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run the cleaner
cleanEVEData();

export { cleanEVEData };