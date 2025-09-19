const fs = require('fs');
const path = require('path');

const sources = [
  {
    name: 'OpenMoji',
    imageDir: path.join(__dirname, 'assets', 'openmoji-618x618-color', 'emojis'),
    outputFile: path.join(__dirname, 'assets', 'openmojiImages.js'),
    requirePathPrefix: '../assets/openmoji-618x618-color/emojis/',
    outputVarName: 'openmojiImages',
  },
  {
    name: 'Picom',
    imageDir: path.join(__dirname, 'assets', 'picom-symbols', 'picom-og-symbols'),
    outputFile: path.join(__dirname, 'assets', 'picomImages.js'),
    requirePathPrefix: '../assets/picom-symbols/picom-og-symbols/',
    outputVarName: 'picomImages',
  },
  {
    name: 'Sclera',
    imageDir: path.join(__dirname, 'assets', 'sclera-symbols'),
    outputFile: path.join(__dirname, 'assets', 'scleraImages.js'),
    requirePathPrefix: '../assets/sclera-symbols/',
    outputVarName: 'scleraImages',
  },
  {
    name: 'Bliss',
    imageDir: path.join(__dirname, 'assets', 'bliss-png'),
    outputFile: path.join(__dirname, 'assets', 'blissImages.js'),
    requirePathPrefix: '../assets/bliss-png/',
    outputVarName: 'blissImages',
  },
  {
    name: 'Noto Emoji',
    imageDir: path.join(__dirname, 'assets', 'noto-emoji'),
    outputFile: path.join(__dirname, 'assets', 'notoEmojiImages.js'),
    requirePathPrefix: '../assets/noto-emoji/',
    outputVarName: 'notoEmojiImages',
  }
];

sources.forEach(source => {
  console.log(`\nProcessing source: ${source.name}`);
  try {
    const imageFiles = fs.readdirSync(source.imageDir).filter(file => file.endsWith('.png'));
    let fileContent = `export const ${source.outputVarName} = {\n`;
    
    for (const file of imageFiles) {
      const name = path.basename(file, '.png');
      const requirePath = `${source.requirePathPrefix}${file}`;
      
      // --- THIS IS THE FIX ---
      // Use JSON.stringify on BOTH the key and the require path
      fileContent += `  ${JSON.stringify(name)}: require(${JSON.stringify(requirePath)}),\n`;
    }

    fileContent += '};\n';
    fs.writeFileSync(source.outputFile, fileContent);
    console.log(`✅ Successfully created ${path.basename(source.outputFile)} with ${imageFiles.length} images.`);
  } catch (error) {
    console.error(`❌ Error creating image data file for ${source.name}:`, error.message);
  }
});