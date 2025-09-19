const fs = require('fs');
const path = require('path');

const notoJsonPath = path.join(__dirname, 'assets', 'noto-emoji', 'emoji_17_0_ordering.json');
const outputFilePath = path.join(__dirname, 'assets', 'notoEmojiSymbols.js');

console.log(`Reading Noto Emoji data from: ${notoJsonPath}`);

try {
  const rawData = fs.readFileSync(notoJsonPath, 'utf-8');
  const jsonData = JSON.parse(rawData);
  const notoEmojiData = [];

  for (const group of jsonData) {
    for (const emoji of group.emoji || []) {
      const shortcodes = emoji.shortcodes || [];
      if (shortcodes.length === 0) continue;

      // Replicate the filename logic from the Python script
      const hexParts = (emoji.base || [])
        .map(cp => cp.toString(16))
        .filter(hex => hex !== 'fe0f'); // Filter out variation selector

      if (hexParts.length === 0) continue;

      const filename = `emoji_u${hexParts.join('_')}`;

      notoEmojiData.push({
        name: shortcodes[0].replace(/:/g, ''), // Clean name, e.g., "grinning_face"
        search_terms: shortcodes.join(' '), // Search terms, e.g., ":grinning_face: :grinning:"
        filename: filename
      });
    }
  }

  const fileContent = `export const notoEmojiData = ${JSON.stringify(notoEmojiData, null, 2)};`;
  fs.writeFileSync(outputFilePath, fileContent);

  console.log(`✅ Successfully created notoEmojiSymbols.js with ${notoEmojiData.length} symbols.`);

} catch (error) {
  console.error("❌ Error creating Noto Emoji data file:", error);
}