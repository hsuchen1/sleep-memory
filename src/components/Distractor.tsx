import { useState, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'motion/react';

interface DistractorProps {
  onComplete: () => void;
}

interface MathCard {
  id: number;
  num1: number;
  num2: number;
  operator: '+' | '-';
  displayedAnswer: number;
  isCorrect: boolean;
}

function generateCard(id: number): MathCard {
  const num1 = Math.floor(Math.random() * 90) + 10; // 10-99
  const num2 = Math.floor(Math.random() * 90) + 10; // 10-99
  const operator = Math.random() > 0.5 ? '+' : '-';
  
  let actualAnswer = operator === '+' ? num1 + num2 : num1 - num2;
  
  // 50% chance to be correct
  const isCorrect = Math.random() > 0.5;
  let displayedAnswer = actualAnswer;
  
  if (!isCorrect) {
    // 針對「尾數漏洞」改進：保持個位數正確，只改變十位數 (±10 或 ±20)
    // 這樣使用者必須計算十位數才能判斷對錯
    const offset = (Math.floor(Math.random() * 2) + 1) * 10;
    displayedAnswer = actualAnswer + (Math.random() > 0.5 ? offset : -offset);
    if (displayedAnswer < 0) displayedAnswer = actualAnswer + offset; // 避免出現負數答案
  }

  return {
    id,
    num1,
    num2,
    operator,
    displayedAnswer,
    isCorrect
  };
}

export default function Distractor({ onComplete }: DistractorProps) {
  const [correctCount, setCorrectCount] = useState(0);
  const [consecutiveWrong, setConsecutiveWrong] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [cards, setCards] = useState<MathCard[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [cardIdCounter, setCardIdCounter] = useState(0);
  
  const TARGET_CORRECT = 15;

  // Initialize cards
  useEffect(() => {
    const initialCards = Array.from({ length: 3 }, (_, i) => generateCard(i));
    setCards(initialCards);
    setCardIdCounter(3);
  }, []);

  const handleDragEnd = (event: any, info: PanInfo, card: MathCard) => {
    if (isLocked) return;
    const threshold = 100;
    if (info.offset.x > threshold) {
      // Swiped Right (True)
      handleAnswer(true, card.isCorrect);
    } else if (info.offset.x < -threshold) {
      // Swiped Left (False)
      handleAnswer(false, card.isCorrect);
    }
  };

  const handleAnswer = (userAnswer: boolean, actualIsCorrect: boolean) => {
    if (isLocked) return;

    const isCorrect = userAnswer === actualIsCorrect;
    setFeedback(isCorrect ? 'correct' : 'wrong');
    
    if (isCorrect) {
      const newCount = correctCount + 1;
      setCorrectCount(newCount);
      setConsecutiveWrong(0);
      if (newCount >= TARGET_CORRECT) {
        setTimeout(() => onComplete(), 500);
      }
    } else {
      const newWrong = consecutiveWrong + 1;
      setConsecutiveWrong(newWrong);
      if (newWrong >= 2) {
        setIsLocked(true);
        setConsecutiveWrong(0);
        setTimeout(() => {
          setIsLocked(false);
        }, 2000);
      }
    }

    setTimeout(() => {
      setFeedback(null);
    }, 400);

    setCards(prev => {
      const newCards = [...prev.slice(1), generateCard(cardIdCounter)];
      setCardIdCounter(c => c + 1);
      return newCards;
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden bg-gray-50">
      <div className="absolute top-8 left-0 right-0 px-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-500 font-bold">干擾任務：數學判斷</span>
          <span className="text-2xl font-bold text-[#D49A00]">{correctCount} / {TARGET_CORRECT}</span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-[#D49A00] transition-all duration-300 ease-out"
            style={{ width: `${(correctCount / TARGET_CORRECT) * 100}%` }}
          />
        </div>
        <p className="text-center text-sm text-gray-400 mt-4">
          向右滑動 = 正確 ⭕ <br/> 向左滑動 = 錯誤 ❌
        </p>
      </div>

      <div className="relative w-full max-w-sm aspect-[3/4] mt-16">
        <AnimatePresence>
          {cards.map((card, index) => {
            // Only render the top two cards for performance and visual stacking
            if (index > 1) return null;
            
            const isTop = index === 0;

            return (
              <motion.div
                key={card.id}
                className={`absolute inset-0 bg-white rounded-[3rem] shadow-xl border-4 border-gray-100 flex flex-col items-center justify-center p-8 ${!isTop ? 'pointer-events-none' : ''}`}
                style={{
                  zIndex: cards.length - index,
                }}
                initial={isTop ? { scale: 1, y: 0 } : { scale: 0.95, y: 20 }}
                animate={{ scale: isTop ? 1 : 0.95, y: isTop ? 0 : 20 }}
                exit={{ x: feedback === 'correct' ? 300 : -300, opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.2 }}
                drag={isTop ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={(e, info) => isTop && handleDragEnd(e, info, card)}
                whileDrag={{ scale: 1.05, rotate: 5 }}
              >
                <div className="text-6xl font-bold text-gray-800 tracking-wider">
                  {card.num1}
                </div>
                <div className="text-5xl font-bold text-gray-400 my-4">
                  {card.operator}
                </div>
                <div className="text-6xl font-bold text-gray-800 tracking-wider">
                  {card.num2}
                </div>
                <div className="w-full h-1 bg-gray-200 my-6 rounded-full" />
                <div className="text-7xl font-black text-blue-500">
                  {card.displayedAnswer}
                </div>

                {isTop && feedback && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-[3rem] backdrop-blur-sm z-10"
                  >
                    {feedback === 'correct' ? (
                      <div className="text-8xl">✅</div>
                    ) : (
                      <div className="text-8xl">❌</div>
                    )}
                  </motion.div>
                )}
                
                {isTop && isLocked && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-red-500/10 backdrop-blur-md rounded-[3rem] z-20"
                  >
                    <div className="text-6xl mb-4 animate-bounce">🔒</div>
                    <div className="text-red-600 font-bold text-lg bg-white px-6 py-2 rounded-full shadow-lg">
                      連續錯誤！鎖定 2 秒
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      
      <div className="flex justify-between w-full max-w-sm mt-12 px-8">
        <button 
          onClick={() => handleAnswer(false, cards[0].isCorrect)}
          disabled={isLocked}
          className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-md transition-all ${isLocked ? 'bg-gray-200 text-gray-400 opacity-50 cursor-not-allowed' : 'bg-red-100 text-red-500 active:scale-90'}`}
        >
          ❌
        </button>
        <button 
          onClick={() => handleAnswer(true, cards[0].isCorrect)}
          disabled={isLocked}
          className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-md transition-all ${isLocked ? 'bg-gray-200 text-gray-400 opacity-50 cursor-not-allowed' : 'bg-green-100 text-green-500 active:scale-90'}`}
        >
          ⭕
        </button>
      </div>
    </div>
  );
}
