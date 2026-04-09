import * as fs from 'fs';

const wordsToRemove = [
  "incidence", "ingenuous", "multifarious", "innocuous", "impromptu", 
  "subsequent", "derivative", "inopportune", "inflammable", "nocturnal", 
  "diligent", "mediocre", "efficacious", "confidential", "disdain", "debunk",
  "circumlocution", "mollycoddle", "odoriferous", "lugubrious", "mendacious", 
  "duplicity", "eloquence", "penurious", "plaintive", "gossamer", "harangue", 
  "boorish", "burnish", "plaudit", "presage", "fetter", "flaunt", "demur", 
  "elegy", "yoke"
];

let content = fs.readFileSync('src/wordSets.ts', 'utf8');

const lines = content.split('\n');
const newLines = lines.filter(line => {
  for (const word of wordsToRemove) {
    if (line.includes(`word: "${word}"`)) {
      return false;
    }
  }
  return true;
});

// Fix trailing commas for the last item in each array if needed
// Actually, JS/TS allows trailing commas, so it's fine if the last item has a comma.
// But wait, what if the removed item was the last one without a comma, and the new last item has a comma? That's also fine in TS.

fs.writeFileSync('src/wordSets.ts', newLines.join('\n'));
console.log("Removed " + (lines.length - newLines.length) + " lines.");
