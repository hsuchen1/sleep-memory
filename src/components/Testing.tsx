import { useState, useMemo, useEffect } from 'react';
import { Word } from '../wordSets';
import { shuffleArray } from '../utils';

interface TestingProps {
  words: Word[];
  onComplete: (score: number) => void;
}

export default function Testing({ words, onComplete }: TestingProps) {
  const [currentIndex, setCurrentIndex] = useState(() => {
    const saved = sessionStorage.getItem('testing_currentIndex');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [score, setScore] = useState(() => {
    const saved = sessionStorage.getItem('testing_score');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    sessionStorage.setItem('testing_currentIndex', currentIndex.toString());
    sessionStorage.setItem('testing_score', score.toString());
  }, [currentIndex, score]);

  // Generate options for the current word
  const currentWord = words[currentIndex];
  
  const options = useMemo(() => {
    if (!currentWord) return [];
    
    // 1. Find other words with the same POS
    let samePosWords = words.filter(w => w.word !== currentWord.word && w.pos === currentWord.pos);
    
    // 2. If not enough, fill with other POS
    if (samePosWords.length < 3) {
      const otherPosWords = words.filter(w => w.word !== currentWord.word && w.pos !== currentWord.pos);
      samePosWords = [...samePosWords, ...otherPosWords];
    }

    // 3. Use Fisher-Yates shuffle to pick 3 wrong options
    const wrongOptions = shuffleArray(samePosWords).slice(0, 3).map(w => w.meaning);
      
    const allOptions = [...wrongOptions, currentWord.meaning];
    // Shuffle all options
    return shuffleArray(allOptions);
  }, [currentWord, words]);

  const handleSelect = (selectedMeaning: string | null) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setSelectedOption(selectedMeaning);

    const isCorrect = selectedMeaning === currentWord.meaning;
    if (isCorrect) {
      setScore(prev => prev + 1);
    }

    setTimeout(() => {
      if (currentIndex < words.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setSelectedOption(undefined);
        setIsTransitioning(false);
      } else {
        sessionStorage.removeItem('testing_currentIndex');
        sessionStorage.removeItem('testing_score');
        const finalScore = score + (isCorrect ? 1 : 0);
        onComplete(finalScore);
      }
    }, 150);
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
        <div 
          className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-gray-800 text-center bg-white/60 backdrop-blur-md px-4 sm:px-8 py-10 rounded-[3rem] shadow-lg border-4 border-white w-full break-words hyphens-auto"
          lang="en"
        >
          {currentWord.word}
        </div>

        <div className="text-center text-[#D49A00] font-bold text-sm bg-[#FFF1CC] py-3 px-6 rounded-full animate-pulse border-2 border-[#FFE4A0] shadow-sm">
          💡 提醒：請憑真實記憶作答，如果不記得請務必選擇「我真的忘記了」
        </div>

        <div className="w-full space-y-4 pt-4">
          {options.map((opt, i) => {
            const isSelected = selectedOption === opt;
            const isOtherSelected = selectedOption !== undefined && selectedOption !== opt;
            
            return (
              <button
                key={`${currentIndex}-${i}`}
                onClick={() => handleSelect(opt)}
                disabled={isTransitioning}
                className={`w-full text-xl font-bold py-6 rounded-[2rem] border-4 shadow-md transition-all duration-300 active:scale-90 disabled:cursor-not-allowed disabled:hover:translate-y-0 ${
                  isSelected 
                    ? 'bg-[#F4FAFF] text-[#B5E2FA] border-[#B5E2FA] opacity-100' 
                    : isOtherSelected
                      ? 'bg-white text-gray-800 border-[#E5E0FF] opacity-50'
                      : 'bg-white text-gray-800 border-[#E5E0FF] hover:border-[#B5E2FA] hover:bg-[#F4FAFF] hover:-translate-y-1 hover:shadow-lg'
                }`}
              >
                {opt}
              </button>
            );
          })}
          
          <button
            key={`forgot-${currentIndex}`}
            onClick={() => handleSelect(null)}
            disabled={isTransitioning}
            className={`w-full text-xl font-bold py-6 rounded-[2rem] border-4 transition-all duration-300 active:scale-90 mt-8 disabled:cursor-not-allowed disabled:hover:translate-y-0 ${
              selectedOption === null
                ? 'bg-gray-200 text-gray-600 border-gray-400 opacity-100'
                : selectedOption !== undefined
                  ? 'bg-gray-100 text-gray-500 border-transparent opacity-50'
                  : 'bg-gray-100 text-gray-500 border-transparent hover:bg-gray-200 hover:-translate-y-1'
            }`}
          >
            🤷 我真的忘記了
          </button>
        </div>
      </div>
    </div>
  );
}
