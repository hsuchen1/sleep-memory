import { X } from 'lucide-react';

interface RuleModalProps {
  onClose: () => void;
}

export default function RuleModal({ onClose }: RuleModalProps) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4 py-8">
        <div className="bg-[#FFFDF8] rounded-[3rem] max-w-md w-full p-6 sm:p-8 space-y-6 relative shadow-2xl border-4 border-white">
          <button 
          onClick={onClose} 
          className="absolute top-6 right-6 text-gray-400 hover:text-[#FFB4A2] transition-colors bg-white p-2 rounded-full shadow-sm"
        >
          <X className="w-6 h-6" />
        </button>
        
        <h2 className="text-2xl font-bold text-gray-800">實驗流程與規則說明</h2>
        
        <div className="space-y-4 text-left">
          <p className="text-gray-600 text-sm font-medium">
            本實驗分為多個回合，每回合包含以下完整流程。請確保在安靜、不受打擾的環境下進行。
          </p>

          <div className="space-y-4 bg-white p-6 rounded-[2rem] shadow-sm border-2 border-[#FFE4A0]/30">
            <h3 className="font-bold text-gray-800 border-b-2 border-gray-100 pb-3">單一回合步驟</h3>
            
            <div className="flex items-start space-x-3">
              <span className="text-2xl shrink-0 mt-0.5">🎯</span>
              <div>
                <div className="font-bold text-gray-800">1. 選擇任務</div>
                <div className="text-xs text-gray-500 mt-1 font-medium">根據您當下的作息，選擇「白日任務」或「睡眠任務」。</div>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <span className="text-2xl shrink-0 mt-0.5">📖</span>
              <div>
                <div className="font-bold text-gray-800">2. 單字學習 (5 分鐘)</div>
                <div className="text-xs text-gray-500 mt-1 font-medium">專注記憶 20 個英文單字與中文意思。中途離開超過 5 分鐘將作廢。</div>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <span className="text-2xl shrink-0 mt-0.5">📝</span>
              <div>
                <div className="font-bold text-gray-800">3. 立即測驗</div>
                <div className="text-xs text-gray-500 mt-1 font-medium">學習結束後，馬上進行 20 題選擇題測驗（看英文選中文）。</div>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <span className="text-2xl shrink-0 mt-0.5">⏳</span>
              <div>
                <div className="font-bold text-gray-800">4. 大腦存檔期 (11~14 小時)</div>
                <div className="text-xs text-gray-500 mt-1 font-medium">測驗後進入等待期，請依據任務類型進行日常活動或睡眠。</div>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <span className="text-2xl shrink-0 mt-0.5">🧠</span>
              <div>
                <div className="font-bold text-gray-800">5. 延遲測驗</div>
                <div className="text-xs text-gray-500 mt-1 font-medium">11 小時後開放。請務必在 <span className="text-[#FF9F8A] font-bold">14 小時內</span>完成，否則該回合數據作廢。</div>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <span className="text-2xl shrink-0 mt-0.5">📋</span>
              <div>
                <div className="font-bold text-gray-800">6. 課後問卷</div>
                <div className="text-xs text-gray-500 mt-1 font-medium">完成延遲測驗後，填寫簡短的狀態問卷，即完成該回合。</div>
              </div>
            </div>
          </div>
          
            <div className="flex items-start space-x-3 bg-[#FFF1CC] p-5 rounded-[2rem] border-2 border-[#FFE4A0]">
              <span className="text-2xl shrink-0 mt-0.5">⚠️</span>
              <div>
                <div className="font-bold text-[#D49A00] text-sm">重要提醒</div>
                <div className="text-xs text-[#B38000] mt-1 font-medium leading-relaxed">
                  請憑真實記憶作答，切勿截圖、作筆記或作弊，以確保實驗數據的準確性與科學價值。
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-3 bg-blue-50 p-5 rounded-[2rem] border-2 border-blue-100">
              <span className="text-2xl shrink-0 mt-0.5">🎁</span>
              <div>
                <div className="font-bold text-blue-800 text-sm">完賽專屬獎勵</div>
                <div className="text-xs text-blue-600 mt-1 font-medium leading-relaxed">
                  完整完成白天與睡眠累計天數任務後，系統將解鎖你的專屬【大腦記憶力診斷報告】，得知睡眠對自己的記憶提升幾%！
                </div>
              </div>
            </div>
        </div>

        <button 
          onClick={onClose} 
          className="w-full bg-[#FFB4A2] text-white py-4 rounded-full font-bold text-lg hover:bg-[#FF9F8A] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 active:scale-90"
        >
          我已了解完整流程 ✨
        </button>
      </div>
      </div>
    </div>
  );
}
