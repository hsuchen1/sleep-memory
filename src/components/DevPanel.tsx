import { useState } from 'react';
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc, deleteField, addDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile, TestRecord } from '../types';
import { handleFirestoreError, OperationType } from '../utils';
import { Settings, Trash2, FastForward, SkipForward } from 'lucide-react';

interface DevPanelProps {
  userProfile: UserProfile | null;
  activeRecord: TestRecord | null;
  onDataCleared: () => void;
  onFastForwarded: () => void;
}

export default function DevPanel({ userProfile, activeRecord, onDataCleared, onFastForwarded }: DevPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  if (!userProfile || auth.currentUser?.email !== 'dyes101184@gmail.com') return null;

  const handleClearData = async () => {
    if (!auth.currentUser) return;
    
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    
    setLoading(true);
    try {
      // 1. Delete all TestRecords for this user
      const q = query(collection(db, 'TestRecords'), where('user_id', '==', auth.currentUser.uid));
      const snapshot = await getDocs(q);
      
      const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);

      // 2. Reset UserProfile
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        current_round: 1,
        learning_start_time: deleteField(),
        learning_task_type: deleteField()
      });

      onDataCleared();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'TestRecords/users');
    } finally {
      setLoading(false);
      setConfirmClear(false);
    }
  };

  const handleFastForward = async () => {
    if (!activeRecord) {
      return;
    }
    
    setLoading(true);
    try {
      // Subtract 12 hours from immediate_timestamp
      const newTime = new Date(activeRecord.immediate_timestamp).getTime() - (12 * 60 * 60 * 1000);
      
      await updateDoc(doc(db, 'TestRecords', activeRecord.id!), {
        immediate_timestamp: new Date(newTime).toISOString()
      });
      
      onFastForwarded();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'TestRecords');
    } finally {
      setLoading(false);
    }
  };

  const handleSkipToReport = async () => {
    if (!auth.currentUser || !userProfile) return;
    
    setLoading(true);
    try {
      // 1. Set current round to 41
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        current_round: 41
      });

      // 2. Add dummy data to show a positive sleep bonus
      const dummySleepRecord: TestRecord = {
        user_id: auth.currentUser.uid,
        user_name: userProfile.name,
        round_number: 1,
        task_type: 'sleep',
        immediate_score: 20,
        delayed_score: 18, // 90% retention
        immediate_timestamp: new Date().toISOString(),
        is_valid: true,
        status: 'completed'
      };

      const dummyDaytimeRecord: TestRecord = {
        user_id: auth.currentUser.uid,
        user_name: userProfile.name,
        round_number: 2,
        task_type: 'daytime',
        immediate_score: 20,
        delayed_score: 15, // 75% retention
        immediate_timestamp: new Date().toISOString(),
        is_valid: true,
        status: 'completed'
      };

      await addDoc(collection(db, 'TestRecords'), dummySleepRecord);
      await addDoc(collection(db, 'TestRecords'), dummyDaytimeRecord);

      // Force a reload to fetch the new round and report
      window.location.reload();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'TestRecords/users');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 left-6 z-50">
      {isOpen ? (
        <div className="bg-white border border-gray-200 shadow-2xl rounded-2xl p-4 w-72 space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <Settings className="w-5 h-5 text-gray-500" />
              開發者測試面板
            </h3>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-700">
              ✕
            </button>
          </div>
          
          <div className="space-y-2">
            <button 
              onClick={handleClearData}
              disabled={loading}
              className={`w-full flex items-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                confirmClear 
                  ? 'bg-red-600 text-white hover:bg-red-700' 
                  : 'bg-red-50 text-red-600 hover:bg-red-100'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              {confirmClear ? '確定刪除？(再次點擊)' : '清除所有紀錄與進度'}
            </button>
            
            <button 
              onClick={handleFastForward}
              disabled={loading || !activeRecord}
              className="w-full flex items-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 py-2 px-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              <FastForward className="w-4 h-4" />
              快轉 12 小時 (延遲測驗)
            </button>

            <button 
              onClick={handleSkipToReport}
              disabled={loading}
              className="w-full flex items-center gap-2 bg-purple-50 text-purple-600 hover:bg-purple-100 py-2 px-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              <SkipForward className="w-4 h-4" />
              跳至第 41 回合 (測試完賽報告)
            </button>
          </div>
          
          <div className="text-xs text-gray-400 mt-2">
            * 僅供測試使用，正式上線前請移除
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-gray-800 text-white shadow-lg rounded-full p-3 hover:bg-gray-700 transition-colors active:scale-95"
          title="開發者面板"
        >
          <Settings className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
