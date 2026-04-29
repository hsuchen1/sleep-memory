import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc, deleteField, addDoc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile, TestRecord } from '../types';
import { handleFirestoreError, OperationType } from '../utils';
import { Settings, Trash2, FastForward, SkipForward, Users, Activity, Megaphone, Wrench, X } from 'lucide-react';
import { getTotalRounds } from '../wordSets';

interface DevPanelProps {
  userProfile: UserProfile | null;
  activeRecord: TestRecord | null;
  onDataCleared: () => void;
  onFastForwarded: () => void;
}

type Tab = 'overview' | 'users' | 'announcement' | 'tools';

export default function DevPanel({ userProfile, activeRecord, onDataCleared, onFastForwarded }: DevPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  
  // Data states
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allRecords, setAllRecords] = useState<TestRecord[]>([]);
  const [announcementMsg, setAnnouncementMsg] = useState('');
  const [isAnnouncementActive, setIsAnnouncementActive] = useState(false);

  // Fetch data when panel opens
  useEffect(() => {
    if (isOpen && auth.currentUser?.email === 'dyes101184@gmail.com') {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch users
      const usersSnap = await getDocs(collection(db, 'users'));
      const usersData = usersSnap.docs.map(d => ({ ...d.data(), uid: d.id } as UserProfile & { uid: string }));
      setAllUsers(usersData);

      // Fetch records
      const recordsSnap = await getDocs(collection(db, 'TestRecords'));
      const recordsData = recordsSnap.docs.map(d => ({ id: d.id, ...d.data() } as TestRecord));
      setAllRecords(recordsData);

      // Fetch announcement
      const configSnap = await getDoc(doc(db, 'system', 'config'));
      if (configSnap.exists()) {
        setAnnouncementMsg(configSnap.data().message || '');
        setIsAnnouncementActive(configSnap.data().isActive || false);
      }
    } catch (error) {
      console.error("Error fetching dev data", error);
    } finally {
      setLoading(false);
    }
  };

  if (!userProfile || auth.currentUser?.email !== 'dyes101184@gmail.com') return null;

  // Calculate Overview Stats
  const totalUsers = allUsers.length;
  const activeUsers24h = allRecords.filter(r => {
    const time = r.delayed_timestamp || r.immediate_timestamp;
    if (!time) return false;
    return (Date.now() - new Date(time).getTime()) < 24 * 60 * 60 * 1000;
  }).map(r => r.user_id).filter((v, i, a) => a.indexOf(v) === i).length;
  
  const avgRound = totalUsers > 0 
    ? (allUsers.reduce((sum, u) => sum + (u.current_round || 1), 0) / totalUsers).toFixed(1) 
    : '0';
    
  const invalidRecords = allRecords.filter(r => r.is_valid === false).length;

  // Actions
  const handleSaveAnnouncement = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, 'system', 'config'), {
        message: announcementMsg,
        isActive: isAnnouncementActive
      }, { merge: true });
      alert('公告已更新');
    } catch (error) {
      console.error(error);
      alert('更新失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleClearData = async () => {
    if (!auth.currentUser) return;
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    setLoading(true);
    try {
      const q = query(collection(db, 'TestRecords'), where('user_id', '==', auth.currentUser.uid));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);

      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        current_round: 1,
        learning_start_time: deleteField(),
        learning_task_type: deleteField()
      });
      
      // 清除本地暫存，避免重整後又恢復到剛才的任務狀態
      sessionStorage.removeItem('experiment_progress');
      sessionStorage.removeItem('testing_shuffledWords');
      sessionStorage.removeItem('testing_currentIndex');
      sessionStorage.removeItem('testing_score');
      
      onDataCleared();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'TestRecords/users');
    } finally {
      setLoading(false);
      setConfirmClear(false);
    }
  };

  const handleClearAllData = async () => {
    if (!auth.currentUser) return;
    
    const password = window.prompt('警告：這將刪除所有使用者的資料！\n請輸入密碼以確認執行：');
    if (password !== 'delete') {
      if (password !== null) {
        alert('密碼錯誤，操作已取消。');
      }
      return;
    }

    setLoading(true);
    try {
      // 1. 刪除所有 TestRecords
      const recordsSnapshot = await getDocs(collection(db, 'TestRecords'));
      const deletePromises = recordsSnapshot.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);

      // 2. 重置所有 users 的進度
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const updatePromises = usersSnapshot.docs.map(d => 
        updateDoc(d.ref, {
          current_round: 1,
          learning_start_time: deleteField(),
          learning_task_type: deleteField()
        })
      );
      await Promise.all(updatePromises);

      // 清除本地暫存
      sessionStorage.removeItem('experiment_progress');
      sessionStorage.removeItem('testing_shuffledWords');
      sessionStorage.removeItem('testing_currentIndex');
      sessionStorage.removeItem('testing_score');

      alert('已成功清除「所有使用者」的紀錄並重置進度！');
      window.location.reload();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'TestRecords/users (ALL)');
    } finally {
      setLoading(false);
    }
  };

  const handleFastForward = async () => {
    if (!activeRecord) return;
    setLoading(true);
    try {
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
      const totalRounds = getTotalRounds();
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { current_round: totalRounds + 1 });
      const dummySleepRecord: TestRecord = {
        user_id: auth.currentUser.uid, user_name: userProfile.name, round_number: 1,
        task_type: 'sleep', immediate_score: 15, delayed_score: 14,
        immediate_timestamp: new Date().toISOString(), is_valid: true, status: 'completed'
      };
      const dummyDaytimeRecord: TestRecord = {
        user_id: auth.currentUser.uid, user_name: userProfile.name, round_number: 2,
        task_type: 'daytime', immediate_score: 15, delayed_score: 10,
        immediate_timestamp: new Date().toISOString(), is_valid: true, status: 'completed'
      };
      await addDoc(collection(db, 'TestRecords'), dummySleepRecord);
      await addDoc(collection(db, 'TestRecords'), dummyDaytimeRecord);
      window.location.reload();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'TestRecords/users');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 left-6 z-[150]">
      {isOpen ? (
        <div className="bg-white border border-gray-200 shadow-2xl rounded-2xl w-[360px] max-h-[80vh] flex flex-col overflow-hidden">
          <div className="flex justify-between items-center bg-gray-800 text-white p-4">
            <h3 className="font-bold flex items-center gap-2">
              <Settings className="w-5 h-5" />
              實驗戰情室
            </h3>
            <button onClick={() => setIsOpen(false)} className="text-gray-300 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex border-b bg-gray-50">
            <button onClick={() => setActiveTab('overview')} className={`flex-1 py-2 text-xs font-bold flex flex-col items-center gap-1 ${activeTab === 'overview' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}><Activity className="w-4 h-4"/>總覽</button>
            <button onClick={() => setActiveTab('users')} className={`flex-1 py-2 text-xs font-bold flex flex-col items-center gap-1 ${activeTab === 'users' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}><Users className="w-4 h-4"/>受試者</button>
            <button onClick={() => setActiveTab('announcement')} className={`flex-1 py-2 text-xs font-bold flex flex-col items-center gap-1 ${activeTab === 'announcement' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}><Megaphone className="w-4 h-4"/>公告</button>
            <button onClick={() => setActiveTab('tools')} className={`flex-1 py-2 text-xs font-bold flex flex-col items-center gap-1 ${activeTab === 'tools' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}><Wrench className="w-4 h-4"/>工具</button>
          </div>

          <div className="p-4 overflow-y-auto flex-1 bg-gray-50/50">
            {loading && <div className="text-center text-sm text-gray-500 py-4">載入中...</div>}
            
            {!loading && activeTab === 'overview' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded-xl shadow-sm border">
                  <div className="text-xs text-gray-500">總註冊人數</div>
                  <div className="text-2xl font-bold text-gray-800">{totalUsers}</div>
                </div>
                <div className="bg-white p-3 rounded-xl shadow-sm border">
                  <div className="text-xs text-gray-500">24h 活躍人數</div>
                  <div className="text-2xl font-bold text-green-600">{activeUsers24h}</div>
                </div>
                <div className="bg-white p-3 rounded-xl shadow-sm border">
                  <div className="text-xs text-gray-500">平均完成回合</div>
                  <div className="text-2xl font-bold text-blue-600">{avgRound}</div>
                </div>
                <div className="bg-white p-3 rounded-xl shadow-sm border">
                  <div className="text-xs text-gray-500">作廢/超時次數</div>
                  <div className="text-2xl font-bold text-red-500">{invalidRecords}</div>
                </div>
              </div>
            )}

            {!loading && activeTab === 'users' && (
              <div className="space-y-3">
                {allUsers.map(u => {
                  const userRecords = allRecords.filter(r => r.user_id === (u as any).uid);
                  const waitingRecord = userRecords.find(r => r.status === 'waiting');
                  let statusText = '可進行新回合';
                  let statusColor = 'text-green-600 bg-green-50';
                  
                  if (waitingRecord) {
                    const elapsed = Date.now() - new Date(waitingRecord.immediate_timestamp).getTime();
                    if (elapsed >= 11 * 60 * 60 * 1000) {
                      statusText = '可進行延遲測驗';
                      statusColor = 'text-purple-600 bg-purple-50';
                    } else {
                      statusText = '等待 12 小時中';
                      statusColor = 'text-orange-600 bg-orange-50';
                    }
                  }

                  return (
                    <div key={(u as any).uid} className="bg-white p-3 rounded-xl shadow-sm border text-sm">
                      <div className="font-bold text-gray-800">{u.name}</div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-gray-500 text-xs">第 {u.current_round} 回合</span>
                        <span className={`text-xs px-2 py-1 rounded-full font-bold ${statusColor}`}>{statusText}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!loading && activeTab === 'announcement' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">公告內容</label>
                  <textarea 
                    value={announcementMsg}
                    onChange={(e) => setAnnouncementMsg(e.target.value)}
                    className="w-full border rounded-lg p-2 text-sm h-24 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="輸入要廣播給所有受試者的訊息..."
                  />
                </div>
                <div className="flex items-center justify-between bg-white p-3 rounded-lg border">
                  <span className="text-sm font-bold text-gray-700">啟用公告</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={isAnnouncementActive} onChange={(e) => setIsAnnouncementActive(e.target.checked)} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <button 
                  onClick={handleSaveAnnouncement}
                  className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  儲存並發布
                </button>
              </div>
            )}

            {!loading && activeTab === 'tools' && (
              <div className="space-y-2">
                <button 
                  onClick={handleClearData}
                  disabled={loading}
                  className={`w-full flex items-center gap-2 py-3 px-3 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 ${
                    confirmClear ? 'bg-orange-600 text-white hover:bg-orange-700' : 'bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200'
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                  {confirmClear ? '確定刪除？(再次點擊)' : '清除我的所有紀錄與進度'}
                </button>

                <button 
                  onClick={handleClearAllData}
                  disabled={loading}
                  className="w-full flex items-center gap-2 py-3 px-3 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                >
                  <Trash2 className="w-4 h-4" />
                  危險：清除「所有人」的紀錄與進度
                </button>
                
                <button 
                  onClick={handleFastForward}
                  disabled={loading || !activeRecord}
                  className="w-full flex items-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 py-3 px-3 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                >
                  <FastForward className="w-4 h-4" />
                  快轉 12 小時 (延遲測驗)
                </button>

                <button 
                  onClick={handleSkipToReport}
                  disabled={loading}
                  className="w-full flex items-center gap-2 bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-200 py-3 px-3 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                >
                  <SkipForward className="w-4 h-4" />
                  跳至完賽報告
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-gray-800 text-white shadow-lg rounded-full p-4 hover:bg-gray-700 transition-transform hover:scale-110 active:scale-95 flex items-center justify-center"
          title="實驗戰情室"
        >
          <Settings className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
