/**
 * Email Report Generator
 * Generates HTML email reports from OSRS and EVE analysis results
 */

import fs from 'fs';

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

function formatGP(amount) {
  if (amount >= 1000000000) {
    return `${(amount / 1000000000).toFixed(1)}B GP`;
  } else if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M GP`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K GP`;
  }
  return `${amount} GP`;
}

function generateOSRSSection(osrsData) {
  if (!osrsData || osrsData.error) {
    return `
      <div class="game-section">
        <h2>🗡️ Old School RuneScape Analysis</h2>
        <div class="error">
          <p><strong>❌ Analysis Failed:</strong> ${osrsData?.error || 'No data available'}</p>
        </div>
      </div>
    `;
  }

  const { recommendations = [], metadata = {} } = osrsData;
  
  let recommendationsHtml = '';
  if (recommendations.length > 0) {
    recommendationsHtml = recommendations.slice(0, 3).map((item, index) => `
      <div class="recommendation">
        <h4>${index + 1}. ${item.name}</h4>
        <div class="metrics">
          <span class="score">Score: ${item.investmentScore}/100</span>
          <span class="price">Price: ${formatGP(item.currentPrice)}</span>
          <span class="units">Can Buy: ${item.unitsCanBuy?.toLocaleString() || 'N/A'}</span>
        </div>
        <div class="details">
          <span>Change: ${item.priceChange > 0 ? '+' : ''}${item.priceChange}%</span>
          <span>Volatility: ${item.volatility}%</span>
          <span>Momentum: ${item.momentum > 0 ? '+' : ''}${item.momentum}%</span>
        </div>
      </div>
    `).join('');
  } else {
    recommendationsHtml = '<p>No recommendations generated.</p>';
  }

  return `
    <div class="game-section">
      <h2>🗡️ Old School RuneScape Analysis</h2>
      <div class="metadata">
        <p><strong>Budget:</strong> ${metadata.budget || 'N/A'}</p>
        <p><strong>Items Analyzed:</strong> ${metadata.itemsAnalyzed || 0}</p>
        <p><strong>Analysis Time:</strong> ${metadata.analysisTime || 'N/A'}</p>
      </div>
      <h3>Top Recommendations:</h3>
      ${recommendationsHtml}
    </div>
  `;
}

function generateEVESection(eveData) {
  if (!eveData || eveData.error) {
    return `
      <div class="game-section">
        <h2>🚀 EVE Online Analysis</h2>
        <div class="error">
          <p><strong>❌ Analysis Failed:</strong> ${eveData?.error || 'No data available'}</p>
        </div>
      </div>
    `;
  }

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
        </div>
      </div>
    `).join('');
  } else {
    recommendationsHtml = '<p>No recommendations generated.</p>';
  }

  return `
    <div class="game-section">
      <h2>🚀 EVE Online Analysis</h2>
      <div class="metadata">
        <p><strong>Budget:</strong> ${metadata.budget || 'N/A'}</p>
        <p><strong>Items Analyzed:</strong> ${metadata.itemsAnalyzed || 0}</p>
        <p><strong>Analysis Time:</strong> ${metadata.analysisTime || 'N/A'}</p>
      </div>
      <h3>Top Recommendations:</h3>
      ${recommendationsHtml}
    </div>
  `;
}

async function main() {
  console.log('📧 Generating email report...');

  // Load results
  let osrsData = null;
  let eveData = null;

  try {
    if (fs.existsSync('./results/osrs/osrs-results.json')) {
      osrsData = JSON.parse(fs.readFileSync('./results/osrs/osrs-results.json', 'utf8'));
    }
  } catch (error) {
    console.log('Could not load OSRS results:', error.message);
  }

  try {
    if (fs.existsSync('./results/eve/eve-results.json')) {
      eveData = JSON.parse(fs.readFileSync('./results/eve/eve-results.json', 'utf8'));
    }
  } catch (error) {
    console.log('Could not load EVE results:', error.message);
  }

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const htmlReport = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Daily Market Analysis Report</title>
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
        .game-section {
            background: white;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 20px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .recommendation {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 15px;
            border-left: 4px solid #007bff;
        }
        .recommendation h4 {
            margin: 0 0 10px 0;
            color: #333;
        }
        .metrics {
            display: flex;
            gap: 15px;
            margin-bottom: 8px;
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
        <h1>💰 PayForMyMembership</h1>
        <h2>Daily Market Analysis Report</h2>
        <p>${currentDate}</p>
    </div>

    ${generateOSRSSection(osrsData)}
    ${generateEVESection(eveData)}

    <div class="footer">
        <p>Generated by PayForMyMembership GitHub Actions</p>
        <p>Strategy: High-volatility, high-ROI opportunities</p>
        <p><em>⚠️ This is speculative analysis. Trade at your own risk.</em></p>
    </div>
</body>
</html>
  `;

  fs.writeFileSync('email-report.html', htmlReport);
  console.log('✅ Email report generated: email-report.html');
}

main().catch(error => {
  console.error('❌ Failed to generate email report:', error);
  process.exit(1);
});