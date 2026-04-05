import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { Brain, Clock, ShieldAlert } from 'lucide-react';

export default function Landing() {
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">睡眠與記憶實驗</h1>
        
        <div className="space-y-6 text-left bg-gray-50 p-8 rounded-2xl">
          <div className="flex items-center space-x-4">
            <Clock className="w-6 h-6 text-blue-500" />
            <span className="text-lg text-gray-700">每次 10 分鐘</span>
          </div>
          <div className="flex items-center space-x-4">
            <Brain className="w-6 h-6 text-purple-500" />
            <span className="text-lg text-gray-700">11~14 小時內驗收</span>
          </div>
          <div className="flex items-center space-x-4">
            <ShieldAlert className="w-6 h-6 text-red-500" />
            <span className="text-lg text-gray-700">請勿作弊</span>
          </div>
        </div>

        <div className="bg-[#FFF1CC] p-6 rounded-2xl border-2 border-[#FFE4A0] text-left space-y-2 shadow-sm">
          <div className="font-bold text-[#D49A00] text-lg flex items-center space-x-2">
            <span>🎁</span>
            <span>完賽專屬獎勵</span>
          </div>
          <p className="text-[#B38000] font-medium leading-relaxed">
            完整完成白天與睡眠累計天數任務後，系統將解鎖你的專屬<span className="font-bold text-[#D49A00]">【大腦記憶力診斷報告】</span>，得知睡眠對自己的記憶提升幾%！
          </p>
        </div>

        <button
          onClick={handleLogin}
          className="w-full bg-black text-white text-xl font-medium py-4 rounded-full hover:bg-gray-800 transition-colors active:scale-95"
        >
          Google 一鍵登入並開始
        </button>
      </div>
    </div>
  );
}
