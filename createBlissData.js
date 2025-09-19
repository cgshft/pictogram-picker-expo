const fs = require('fs');
const path = require('path');

const blissDir = path.join(__dirname, 'assets', 'bliss-png');
const outputFilePath = path.join(__dirname, 'assets', 'blissSymbols.js');

console.log(`Reading Bliss symbols from: ${blissDir}`);

try {
  const blissFiles = fs.readdirSync(blissDir).filter(file => file.endsWith('.png'));
  const blissData = [];

  for (const file of blissFiles) {
    const filename = path.basename(file, '.png');

    blissData.push({
      name: filename.replace(/-/g, ' '), // Replace hyphens with spaces for the name
      filename: filename // Filename without extension
    });
  }

  const fileContent = `export const blissData = ${JSON.stringify(blissData, null, 2)};`;
  fs.writeFileSync(outputFilePath, fileContent);

  console.log(`✅ Successfully created blissSymbols.js with ${blissData.length} symbols.`);

} catch (error) {
  console.error("❌ Error creating Bliss data file:", error);
} 