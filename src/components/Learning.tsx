import { useState, useEffect } from 'react';
import { Word } from '../wordSets';
import { auth } from '../firebase';

interface LearningProps {
  words: Word[];
  initialTimeLeft: number;
  onComplete: () => void;
}

export default function Learning({ words, initialTimeLeft, onComplete }: LearningProps) {
  const [timeLeft, setTimeLeft] = useState(initialTimeLeft);

  useEffect(() => {
    if (timeLeft <= 0) {
      onComplete();
      return;
    }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, onComplete]);

  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;
  const isUrgent = timeLeft < 60;

  return (
    <div className="min-h-screen flex flex-col p-4">
      <div className="text-center py-6 sticky top-0 bg-[#FFFDF8]/90 backdrop-blur-md border-b-4 border-[#FFE4A0]/30 z-10 flex flex-col items-center rounded-b-[2rem]">
        <div className={`text-5xl font-mono font-bold tracking-tighter transition-colors duration-500 ${isUrgent ? 'text-red-500 animate-pulse' : 'text-[#FFB4A2]'}`}>
          {m.toString().padStart(2, '0')}:{s.toString().padStart(2, '0')}
        </div>
        {isUrgent && (
          <div className="text-red-500 font-bold text-xs mt-1">快要結束囉！加油！</div>
        )}
        {auth.currentUser?.email === 'dyes101184@gmail.com' && (
          <button 
            onClick={onComplete}
            className="mt-4 text-xs bg-[#B5E2FA] hover:bg-[#9ACCE6] text-gray-800 px-4 py-2 rounded-full transition-all duration-300 hover:-translate-y-1 active:scale-90 font-bold"
          >
            [開發測試] 跳過學習時間
          </button>
        )}
      </div>

      <div className="flex-1 max-w-2xl w-full mx-auto py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {words.map((w, i) => (
            <div key={i} className="p-8 bg-white border-4 border-[#E5E0FF] rounded-[3rem] shadow-xl flex flex-col items-center justify-center text-center space-y-3 hover:-translate-y-1 transition-transform duration-300">
              <div className="text-4xl font-bold text-gray-800">{w.word}</div>
              <div className="text-2xl text-gray-600 font-medium">{w.meaning} <span className="text-sm text-[#B5E2FA] font-bold">({w.pos})</span></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
