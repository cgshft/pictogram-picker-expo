const fs = require('fs');
const path = require('path');

const svgDir = path.join(__dirname, 'assets', 'mulberry-symbols', 'EN-symbols');
const outputFilePath = path.join(__dirname, 'assets', 'mulberrySvgData.js');

console.log(`Reading SVGs from: ${svgDir}`);

try {
  const svgFiles = fs.readdirSync(svgDir).filter(file => file.endsWith('.svg'));
  const svgData = {};

  for (const file of svgFiles) {
    const filePath = path.join(svgDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const name = path.basename(file, '.svg');
    svgData[name] = content;
  }

  const fileContent = `export const mulberrySvgData = ${JSON.stringify(svgData, null, 2)};`;
  fs.writeFileSync(outputFilePath, fileContent);

  console.log(`✅ Successfully created mulberrySvgData.js with ${Object.keys(svgData).length} symbols.`);

} catch (error) {
  console.error("❌ Error creating SVG data file:", error);
}