import { useState, useMemo } from 'react';
import { Word } from '../wordSets';

interface TestingProps {
  words: Word[];
  onComplete: (score: number) => void;
}

export default function Testing({ words, onComplete }: TestingProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);

  // Generate options for the current word
  const currentWord = words[currentIndex];
  
  const options = useMemo(() => {
    if (!currentWord) return [];
    
    // Get 3 random wrong meanings with the same POS if possible
    const wrongOptions = words
      .filter(w => w.word !== currentWord.word)
      // Try to match POS, but if not enough, just take any
      .sort(() => 0.5 - Math.random())
      .slice(0, 3)
      .map(w => w.meaning);
      
    const allOptions = [...wrongOptions, currentWord.meaning];
    // Shuffle
    allOptions.sort(() => 0.5 - Math.random());
    
    return allOptions;
  }, [currentWord, words]);

  const handleSelect = (selectedMeaning: string | null) => {
    if (selectedMeaning === currentWord.meaning) {
      setScore(prev => prev + 1);
    }

    if (currentIndex < words.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Pass score to parent, but add 1 if this last one was correct
      const finalScore = score + (selectedMeaning === currentWord.meaning ? 1 : 0);
      onComplete(finalScore);
    }
  };

  if (!currentWord) return null;

  return (
    <div className="min-h-screen flex flex-col p-4">
      <div className="w-full max-w-md mx-auto pt-8 pb-4">
        <div className="h-4 bg-white border-2 border-[#B5E2FA]/30 rounded-full overflow-hidden">
          <div 
            className="h-full bg-[#B5E2FA] transition-all duration-500 ease-out"
            style={{ width: `${((currentIndex) / words.length) * 100}%` }}
          />
        </div>
        <div className="text-center mt-3 text-[#B5E2FA] font-bold text-lg">
          {currentIndex + 1} / {words.length}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center max-w-md w-full mx-auto space-y-8">
        <div className="text-5xl md:text-6xl font-bold tracking-tight text-gray-800 text-center bg-white/60 backdrop-blur-md px-8 py-10 rounded-[3rem] shadow-lg border-4 border-white w-full">
          {currentWord.word}
        </div>

        <div className="text-center text-[#D49A00] font-bold text-sm bg-[#FFF1CC] py-3 px-6 rounded-full animate-pulse border-2 border-[#FFE4A0] shadow-sm">
          💡 提醒：請憑真實記憶作答，如果不記得請務必選擇「我真的忘記了」
        </div>

        <div className="w-full space-y-4 pt-4">
          {options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleSelect(opt)}
              className="w-full bg-white text-gray-800 text-xl font-bold py-6 rounded-[2rem] border-4 border-[#E5E0FF] shadow-md hover:border-[#B5E2FA] hover:bg-[#F4FAFF] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 active:scale-90"
            >
              {opt}
            </button>
          ))}
          
          <button
            onClick={() => handleSelect(null)}
            className="w-full bg-gray-100 text-gray-500 text-xl font-bold py-6 rounded-[2rem] border-4 border-transparent hover:bg-gray-200 hover:-translate-y-1 transition-all duration-300 active:scale-90 mt-8"
          >
            🤷 我真的忘記了
          </button>
        </div>
      </div>
    </div>
  );
}
