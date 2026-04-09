import fs from 'fs';

const filePath = './src/wordSets.ts';
let content = fs.readFileSync(filePath, 'utf-8');

const simpleWords = [
  "incidence", "ingenuous", "multifarious", "innocuous", "impromptu", 
  "subsequent", "derivative", "inopportune", "inflammable", "nocturnal", 
  "diligent", "mediocre", "efficacious", "confidential", "disdain", "debunk"
];

const first20Words = [
  "circumlocution", "mollycoddle", "odoriferous", "lugubrious", "mendacious",
  "duplicity", "eloquence", "penurious", "plaintive", "gossamer",
  "harangue", "boorish", "burnish", "plaudit", "presage",
  "fetter", "flaunt", "demur", "elegy", "yoke"
];

const allToRemove = [...simpleWords, ...first20Words];

// Regex to match the entire line containing the word
allToRemove.forEach(word => {
  const regex = new RegExp(`^\\s*\\{ word: "${word}",.*\\n?`, 'gm');
  content = content.replace(regex, '');
});

// Clean up empty arrays if any
content = content.replace(/\[\s*\]/g, '[]');

fs.writeFileSync(filePath, content);
console.log('Cleanup complete');
