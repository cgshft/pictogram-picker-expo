// createMulberryData.js
const fs = require('fs');
const path = require('path');

const mulberryDir = path.join(__dirname, 'assets', 'mulberry-symbols', 'EN-symbols');
const outputFilePath = path.join(__dirname, 'assets', 'mulberrySymbols.js');

console.log(`Reading Mulberry PNGs from: ${mulberryDir}`);

try {
  const mulberryFiles = fs.readdirSync(mulberryDir).filter(file => file.endsWith('.png'));
  const mulberryData = [];

  for (const file of mulberryFiles) {
    const name = path.basename(file, '.png');
    mulberryData.push({
      "symbol-en": name, // For searching with Fuse.js
      "filename": name   // For looking up the image in mulberryImages.js
    });
  }

  const fileContent = `export const mulberryData = ${JSON.stringify(mulberryData, null, 2)};`;
  fs.writeFileSync(outputFilePath, fileContent);

  console.log(`✅ Successfully created mulberrySymbols.js with ${mulberryData.length} symbols.`);

} catch (error) {
  console.error("❌ Error creating Mulberry data file:", error);
}