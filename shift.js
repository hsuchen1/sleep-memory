const fs = require('fs');

const content = fs.readFileSync('src/wordSets.ts', 'utf-8');

const code = content.replace('export interface Word {\n  word: string;\n  meaning: string;\n  pos: string; // Part of speech\n}\n\nexport const wordSets: Record<number, Word[]> = ', 'const wordSets = ');
const codeToEval = code.split('\nexport function getWordSet')[0];

eval(codeToEval);

const newWordSets = {};
for (let i = 2; i <= 40; i++) {
  newWordSets[i - 1] = wordSets[i];
}

newWordSets[40] = [
  { word: "verisimilitude", meaning: "逼真 / 貌似真實", pos: "n" },
  { word: "procrastinate", meaning: "拖延", pos: "v" },
  { word: "serendipitous", meaning: "機緣巧合的", pos: "adj" },
  { word: "recapitulate", meaning: "概括 / 重述", pos: "v" },
  { word: "effervescent", meaning: "歡騰的 / 冒泡的", pos: "adj" },
  { word: "intractable", meaning: "難駕馭的 / 棘手的", pos: "adj" },
  { word: "subservient", meaning: "屈從的 / 奉承的", pos: "adj" },
  { word: "scrupulous", meaning: "一絲不苟的 / 嚴謹的", pos: "adj" },
  { word: "ephemeral", meaning: "短暫的", pos: "adj" },
  { word: "ubiquitous", meaning: "無所不在的", pos: "adj" },
  { word: "sagacious", meaning: "睿智的 / 聰明的", pos: "adj" },
  { word: "tenacious", meaning: "頑強的 / 固執的", pos: "adj" },
  { word: "pragmatic", meaning: "務實的", pos: "adj" },
  { word: "alleviate", meaning: "減輕 / 緩和", pos: "v" },
  { word: "ameliorate", meaning: "改善 / 改良", pos: "v" },
  { word: "exacerbate", meaning: "惡化 / 加劇", pos: "v" },
  { word: "apex", meaning: "頂點 / 巔峰", pos: "n" },
  { word: "balk", meaning: "猶豫 / 阻礙", pos: "v" },
  { word: "coax", meaning: "哄勸 / 誘騙", pos: "v" },
  { word: "dirk", meaning: "匕首 / 短劍", pos: "n" }
];

let newContent = `export interface Word {
  word: string;
  meaning: string;
  pos: string; // Part of speech
}

export const wordSets: Record<number, Word[]> = {\n`;

for (let i = 1; i <= 40; i++) {
  newContent += `  ${i}: [\n`;
  const words = newWordSets[i];
  for (let j = 0; j < words.length; j++) {
    const w = words[j];
    newContent += `    { word: "${w.word}", meaning: "${w.meaning}", pos: "${w.pos}" }${j === words.length - 1 ? '' : ','}\n`;
  }
  newContent += `  ]${i === 40 ? '' : ','}\n`;
}

newContent += `};

export function getWordSet(round: number): Word[] {
  // If we run out of sets, loop back
  const setKeys = Object.keys(wordSets).map(Number).sort((a, b) => a - b);
  const maxSet = setKeys[setKeys.length - 1];
  const actualRound = ((round - 1) % maxSet) + 1;
  return wordSets[actualRound];
}
`;

fs.writeFileSync('src/wordSets.ts', newContent);
console.log('Done');
