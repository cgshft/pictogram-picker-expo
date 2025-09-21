// createMulberryData.js
const fs = require('fs');
const path = require('path');

const mulberryDir = path.join(__dirname, 'assets', 'mulberry-symbols', 'EN-symbols');
const outputFilePath = path.join(__dirname, 'assets', 'mulberrySymbols.js');

console.log(`Reading Mulberry PNGs from: ${mulberryDir}`);

try {
  if (!fs.existsSync(mulberryDir)) {
    throw new Error(`Directory not found: ${mulberryDir}`);
  }

  const mulberryFiles = fs.readdirSync(mulberryDir).filter(file => file.endsWith('.png'));
  const mulberryData = [];

  for (const file of mulberryFiles) {
    const baseName = path.basename(file, '.png');
    
    // For Mulberry, the name is the filename. We create both properties for consistency.
    mulberryData.push({
      "symbol-en": baseName, // The name for searching and display
      "filename": baseName   // The key for the image map
    });
  }

  const fileContent = `export const mulberryData = ${JSON.stringify(mulberryData, null, 2)};`;
  fs.writeFileSync(outputFilePath, fileContent);

  console.log(`✅ Successfully created mulberrySymbols.js with ${mulberryData.length} symbols.`);

} catch (error) {
  console.error("❌ Error creating Mulberry data file:", error);
}