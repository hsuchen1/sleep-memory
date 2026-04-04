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
