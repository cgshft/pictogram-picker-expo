// createPicomData.js

const fs = require('fs');
const path = require('path');

// --- FIX #1: Create a standalone helper function ---
function rsplit(str, sep, maxsplit) {
  const split = str.split(sep);
  return maxsplit ? [split.slice(0, -maxsplit).join(sep)].concat(split.slice(-maxsplit)) : split;
}

const picomDir = path.join(__dirname, 'assets', 'picom-symbols', 'picom-og-symbols');
const outputFilePath = path.join(__dirname, 'assets', 'picomSymbols.js');

console.log(`Reading Picom symbols from: ${picomDir}`);

try {
  const picomFiles = fs.readdirSync(picomDir).filter(file => file.endsWith('.png'));
  const picomData = [];

  for (const file of picomFiles) {
    const baseName = path.basename(file, '.png');
    
    // --- FIX #2: Call the new helper function ---
    const parts = rsplit(baseName, '_', 1);
    const name = (parts.length === 2) ? parts[0] : baseName;

    picomData.push({
      name: name.replace(/_/g, ' '), // a user-friendly name for searching
      filename: baseName // the original filename without extension
    });
  }

  const fileContent = `export const picomData = ${JSON.stringify(picomData, null, 2)};`;
  fs.writeFileSync(outputFilePath, fileContent);

  console.log(`✅ Successfully created picomSymbols.js with ${picomData.length} symbols.`);

} catch (error) {
  console.error("❌ Error creating Picom data file:", error);
}

// --- FIX #3: The bad String.prototype code has been removed ---