const fs = require('fs');
const path = require('path');

const imageDir = path.join(__dirname, 'assets', 'openmoji-618x618-color', 'emojis');
const outputFilePath = path.join(__dirname, 'assets', 'openmojiImages.js');

console.log(`Reading PNGs from: ${imageDir}`);

try {
  const imageFiles = fs.readdirSync(imageDir).filter(file => file.endsWith('.png'));
  let fileContent = 'export const openmojiImages = {\n';

  for (const file of imageFiles) {
    const name = path.basename(file, '.png');
    // Note: The path for require() must be relative to the file it will be used in.
    // Since we will import this into SymbolItem.tsx, the path needs to go up one level.
    const requirePath = `../assets/openmoji-618x618-color/emojis/${file}`;
    fileContent += `  '${name}': require('${requirePath}'),\n`;
  }

  fileContent += '};\n';
  fs.writeFileSync(outputFilePath, fileContent);

  console.log(`✅ Successfully created openmojiImages.js with ${imageFiles.length} images.`);
} catch (error) {
  console.error("❌ Error creating image data file:", error);
}