import { useState } from 'react';
import { TaskType } from '../types';

interface SurveyProps {
  taskType: TaskType;
  onComplete: (extraVariable: number) => void;
}

export default function Survey({ taskType, onComplete }: SurveyProps) {
  const [value, setValue] = useState<number>(taskType === 'sleep' ? 7 : 3);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    onComplete(value);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-10 bg-white/60 backdrop-blur-md p-10 rounded-[3rem] shadow-xl border-4 border-white">
        <div className="text-6xl mb-2">📋</div>
        <h2 className="text-3xl font-bold text-gray-800 leading-relaxed">
          {taskType === 'sleep' ? '您昨晚睡了幾小時？' : '您這 12 小時有多累/忙碌？'}
        </h2>

        {taskType === 'sleep' ? (
          <div className="space-y-6 bg-white p-6 rounded-[2rem] shadow-sm border-2 border-[#E5E0FF]/50">
            <div className="text-5xl font-bold text-[#6B5B95]">{value} <span className="text-2xl text-gray-400">小時</span></div>
            <input 
              type="range" 
              min="0" 
              max="14" 
              step="0.5" 
              value={value} 
              onChange={(e) => setValue(parseFloat(e.target.value))}
              className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#6B5B95]"
            />
          </div>
        ) : (
          <div className="space-y-6 bg-white p-6 rounded-[2rem] shadow-sm border-2 border-[#FFE4A0]/50">
            <div className="flex justify-center space-x-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setValue(star)}
                  className={`w-14 h-14 rounded-full text-2xl flex items-center justify-center transition-all duration-300 hover:-translate-y-1 active:scale-90 ${
                    value >= star ? 'bg-[#FFB4A2] text-white shadow-md' : 'bg-gray-100 text-gray-300'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
            <div className="flex justify-between text-gray-400 font-bold px-2 text-sm">
              <span>很輕鬆</span>
              <span>極度疲勞</span>
            </div>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={`w-full text-white text-xl font-bold py-4 rounded-full transition-all duration-300 shadow-md ${
            isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#FFB4A2] hover:bg-[#FF9F8A] hover:-translate-y-1 hover:shadow-lg active:scale-90'
          }`}
        >
          {isSubmitting ? '處理中...' : '完成本回合 ✨'}
        </button>
      </div>
    </div>
  );
}
