import { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils';

export default function Setup({ onComplete }: { onComplete: () => void }) {
  const [name, setName] = useState(auth.currentUser?.displayName || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !auth.currentUser) return;
    setLoading(true);
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const adminEmails = ['dyes101184@gmail.com', 'hsuchen1@g.ncu.edu.tw'];
      const role = adminEmails.includes(auth.currentUser.email || '') ? 'admin' : 'user';
      await setDoc(userRef, {
        name: name.trim(),
        current_round: 1,
        role: role
      });
      onComplete();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'users');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8 bg-white/60 backdrop-blur-md p-10 rounded-[3rem] shadow-xl border-4 border-white">
        <div className="text-6xl mb-4">👋</div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-800">歡迎加入實驗</h2>
        <p className="text-gray-500 font-medium">請確認或修改您的實驗代號/姓名</p>
        
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full text-center text-2xl p-4 rounded-full border-4 border-[#FFE4A0] bg-white focus:border-[#FFB4A2] focus:ring-4 focus:ring-[#FFE4A0]/50 outline-none transition-all duration-300"
          placeholder="輸入姓名"
        />

        <button
          onClick={handleSave}
          disabled={loading || !name.trim()}
          className="w-full bg-[#FFB4A2] text-white text-xl font-bold py-4 rounded-full hover:bg-[#FF9F8A] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none active:scale-90"
        >
          {loading ? '儲存中...' : '開始吧！ ✨'}
        </button>
      </div>
    </div>
  );
}
