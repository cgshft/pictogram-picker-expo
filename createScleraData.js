const fs = require('fs');
const path = require('path');

const scleraDir = path.join(__dirname, 'assets', 'sclera-symbols');
const outputFilePath = path.join(__dirname, 'assets', 'scleraSymbols.js');

console.log(`Reading Sclera symbols from: ${scleraDir}`);

try {
  const scleraFiles = fs.readdirSync(scleraDir).filter(file => file.endsWith('.png'));
  const scleraData = [];

  for (const file of scleraFiles) {
    const filename = path.basename(file, '.png');
    const searchTerm = filename.replace(/-\d*$/, '').replace(/-/g, ' ');

    scleraData.push({
      name: filename.replace(/-/g, ' '), // Display name
      search_term: searchTerm, // Search term
      filename: filename // Filename without extension
    });
  }

  const fileContent = `export const scleraData = ${JSON.stringify(scleraData, null, 2)};`;
  fs.writeFileSync(outputFilePath, fileContent);

  console.log(`✅ Successfully created scleraSymbols.js with ${scleraData.length} symbols.`);

} catch (error) {
  console.error("❌ Error creating Sclera data file:", error);
}