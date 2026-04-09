import { Sun, Moon, Download, LogOut } from 'lucide-react';
import { UserProfile, TestRecord, TaskType } from '../types';
import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils';
import { signOut } from 'firebase/auth';
import { getTotalRounds } from '../wordSets';

interface DashboardProps {
  userProfile: UserProfile;
  activeRecord: TestRecord | null;
  onStartTask: (type: TaskType) => void;
  onStartTest: () => void;
  onTimeout: () => void;
}

export default function Dashboard({ userProfile, activeRecord, onStartTask, onStartTest, onTimeout }: DashboardProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [testState, setTestState] = useState<'waiting' | 'ready' | 'timeout'>('waiting');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [confirmTask, setConfirmTask] = useState<TaskType | null>(null);
  const [stats, setStats] = useState<{ waiting: number; timeout: number; completed: number } | null>(null);
  const [report, setReport] = useState<{ sleepBonus: number } | null>(null);
  const [userTaskCounts, setUserTaskCounts] = useState<{ daytime: number; sleep: number }>({ daytime: 0, sleep: 0 });
  
  const adminEmails = ['dyes101184@gmail.com', 'hsuchen1@g.ncu.edu.tw'];
  const isAdmin = userProfile.role === 'admin' || (auth.currentUser?.email && adminEmails.includes(auth.currentUser.email));

  const totalRounds = getTotalRounds();

  useEffect(() => {
    const fetchUserData = async () => {
      if (!auth.currentUser) return;
      try {
        const q = query(
          collection(db, 'TestRecords'),
          where('user_id', '==', auth.currentUser.uid),
          where('is_valid', '==', true),
          where('status', '==', 'completed')
        );
        const snapshot = await getDocs(q);
        const records = snapshot.docs.map(d => d.data() as TestRecord);
        
        let daytimeCount = 0;
        let sleepCount = 0;
        let sleepTotalImmediate = 0;
        let sleepTotalDelayed = 0;
        let daytimeTotalImmediate = 0;
        let daytimeTotalDelayed = 0;

        records.forEach(r => {
          if (r.task_type === 'sleep') {
            sleepCount++;
            sleepTotalImmediate += r.immediate_score;
            sleepTotalDelayed += (r.delayed_score || 0);
          } else if (r.task_type === 'daytime') {
            daytimeCount++;
            daytimeTotalImmediate += r.immediate_score;
            daytimeTotalDelayed += (r.delayed_score || 0);
          }
        });

        setUserTaskCounts({ daytime: daytimeCount, sleep: sleepCount });

        if (userProfile.current_round > totalRounds) {
          const sleepRetention = sleepTotalImmediate > 0 ? (sleepTotalDelayed / sleepTotalImmediate) : 0;
          const daytimeRetention = daytimeTotalImmediate > 0 ? (daytimeTotalDelayed / daytimeTotalImmediate) : 0;
          
          let bonus = 0;
          if (sleepTotalImmediate > 0 && daytimeTotalImmediate > 0) {
            bonus = Math.round((sleepRetention - daytimeRetention) * 100);
          }
          
          setReport({ sleepBonus: bonus });
        }
      } catch (error) {
        console.error("Failed to fetch user data:", error);
      }
    };
    fetchUserData();
  }, [userProfile.current_round]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      const fetchStats = async () => {
        try {
          const q = query(collection(db, 'TestRecords'));
          const snapshot = await getDocs(q);
          const records = snapshot.docs.map(d => d.data() as TestRecord);
          setStats({
            waiting: records.filter(r => r.status === 'waiting' && r.is_valid).length,
            timeout: records.filter(r => !r.is_valid && r.status === 'completed').length,
            completed: records.filter(r => r.status === 'completed' && r.is_valid).length
          });
        } catch (error) {
          console.error('Stats error:', error);
        }
      };
      fetchStats();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!activeRecord) return;

    const updateTimer = () => {
      const immediateTime = new Date(activeRecord.immediate_timestamp).getTime();
      const now = Date.now();
      const diff11h = (immediateTime + 11 * 60 * 60 * 1000) - now;
      const diff14h = (immediateTime + 14 * 60 * 60 * 1000) - now;

      if (diff14h < 0) {
        setTestState('timeout');
        setTimeLeft('00:00:00');
      } else if (diff11h <= 0) {
        setTestState('ready');
        setTimeLeft('00:00:00');
      } else {
        setTestState('waiting');
        const h = Math.floor(diff11h / (1000 * 60 * 60));
        const m = Math.floor((diff11h % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff11h % (1000 * 60)) / 1000);
        setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeRecord]);

  const handleAddToCalendar = () => {
    if (!activeRecord) return;
    
    // Calculate 12 hours after immediate test
    const startTime = new Date(new Date(activeRecord.immediate_timestamp).getTime() + 12 * 60 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000); // 30 mins duration
    
    const formatTime = (date: Date) => date.toISOString().replace(/-|:|\.\d+/g, '');
    
    const title = encodeURIComponent('🧠 睡眠與記憶實驗：延遲測驗提醒');
    const details = encodeURIComponent('請點擊連結回到實驗網站進行測驗：' + window.location.origin);
    const dates = `${formatTime(startTime)}/${formatTime(endTime)}`;
    
    const gCalUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${dates}`;
    
    window.open(gCalUrl, '_blank');
  };

  const handleExport = async () => {
    try {
      const q = query(collection(db, 'TestRecords'), where('is_valid', '==', true));
      const snapshot = await getDocs(q);
      const records = snapshot.docs.map(doc => doc.data() as TestRecord);
      
      if (records.length === 0) {
        alert('沒有可匯出的數據');
        return;
      }

      const headers = ['user_id', 'user_name', 'round_number', 'task_type', 'immediate_score', 'delayed_score', 'immediate_timestamp', 'delayed_timestamp', 'interval_hours', 'extra_variable', 'is_valid'];
      const csvContent = [
        headers.join(','),
        ...records.map(r => headers.map(h => {
          const val = r[h as keyof TestRecord];
          // Escape quotes and wrap in quotes if contains comma
          if (typeof val === 'string' && val.includes(',')) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        }).join(','))
      ].join('\n');

      // Add BOM (Byte Order Mark) for UTF-8 so Excel on Windows recognizes the encoding correctly
      const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
      const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'experiment_data.csv';
      link.click();
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'TestRecords');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start sm:justify-center p-4 pt-24 pb-40 relative">
      <div className="absolute top-6 left-6 z-10">
        <button 
          onClick={() => setShowLogoutConfirm(true)}
          className="flex items-center space-x-2 text-gray-400 hover:text-red-400 transition-colors bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-gray-100"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-bold">登出</span>
        </button>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl max-w-xs w-full text-center space-y-6 border-4 border-white">
            <div className="text-5xl">👋</div>
            <h3 className="text-2xl font-bold text-gray-800">確定要登出嗎？</h3>
            <div className="flex flex-col space-y-3">
              <button 
                onClick={handleLogout}
                className="w-full bg-red-400 text-white py-3 rounded-full font-bold hover:bg-red-500 transition-colors active:scale-90"
              >
                確定登出
              </button>
              <button 
                onClick={() => setShowLogoutConfirm(false)}
                className="w-full bg-gray-100 text-gray-500 py-3 rounded-full font-bold hover:bg-gray-200 transition-colors active:scale-90"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="absolute top-6 right-6 z-10 flex flex-col items-end space-y-2">
          <button 
            onClick={handleExport}
            className="flex items-center space-x-2 text-gray-400 hover:text-[#FFB4A2] transition-colors bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-gray-100"
          >
            <Download className="w-5 h-5" />
            <span className="font-bold">匯出數據</span>
          </button>
          {stats && (
            <div className="bg-white/80 backdrop-blur-sm p-3 rounded-2xl shadow-sm border border-gray-100 text-[10px] grid grid-cols-3 gap-2 font-bold">
              <div className="text-blue-400">⏳ 等待: {stats.waiting}</div>
              <div className="text-red-400">⚠️ 逾期: {stats.timeout}</div>
              <div className="text-green-400">✅ 完成: {stats.completed}</div>
            </div>
          )}
        </div>
      )}

      <div className="max-w-md w-full text-center space-y-10">
        <div className="bg-white/60 backdrop-blur-md p-8 rounded-[3rem] shadow-xl border-4 border-white">
          <h2 className="text-3xl font-bold text-gray-800 leading-relaxed">
            嗨，{userProfile.name}！<br/>
            <span className="text-[#FFB4A2]">
              {userProfile.current_round > totalRounds ? '恭喜完成所有挑戰！' : `目前進度：第 ${userProfile.current_round} 回挑戰`}
            </span>
          </h2>
          
          <div className="flex justify-center gap-4 mt-6">
            <div className="bg-[#FFF1CC] text-[#D49A00] px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 shadow-sm">
              <span>☀️</span> 白日已完成: {userTaskCounts.daytime}
            </div>
            <div className="bg-[#E5E0FF] text-[#6B5B95] px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 shadow-sm">
              <span>🌙</span> 睡眠已完成: {userTaskCounts.sleep}
            </div>
          </div>
        </div>

        {userProfile.current_round > totalRounds && report && (
          <div className="bg-gradient-to-br from-[#FFF1CC] to-[#FFE4A0] p-8 rounded-[3rem] shadow-xl border-4 border-white text-left space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-4xl mb-2">🏆</div>
            <h3 className="text-2xl font-bold text-[#D49A00]">大腦記憶力診斷報告</h3>
            <p className="text-[#B38000] font-medium text-lg leading-relaxed">
              恭喜你完成了所有 {totalRounds} 回的記憶挑戰！
            </p>
            <div className="bg-white/80 p-6 rounded-2xl">
              <p className="text-gray-800 font-bold text-xl">
                你的睡眠記憶紅利是 <span className="text-[#FFB4A2] text-3xl">{report.sleepBonus > 0 ? '+' : ''}{report.sleepBonus}%</span>！
              </p>
              <p className="text-gray-600 mt-2 font-medium">
                {report.sleepBonus > 0 
                  ? '看來你是一顆需要充足睡眠的大腦！睡眠對你的記憶鞏固非常有幫助。'
                  : '你的大腦在白天也能保持很好的記憶力！不過充足的睡眠依然對健康很重要喔。'}
              </p>
            </div>
          </div>
        )}

        {userProfile.current_round <= totalRounds && (
          <>
            {!activeRecord ? (
              <div className="space-y-6">
                <button
                  onClick={() => setConfirmTask('daytime')}
                  className="w-full flex items-center justify-center space-x-4 bg-[#FFF1CC] text-[#D49A00] border-4 border-white shadow-lg py-8 rounded-[3rem] hover:bg-[#FFE4A0] hover:-translate-y-1 hover:shadow-xl transition-all duration-300 active:scale-90"
                >
                  <span className="text-4xl">☀️</span>
                  <span className="text-2xl font-bold">白日任務</span>
                </button>
                <button
                  onClick={() => setConfirmTask('sleep')}
                  className="w-full flex items-center justify-center space-x-4 bg-[#E5E0FF] text-[#6B5B95] border-4 border-white shadow-lg py-8 rounded-[3rem] hover:bg-[#D4CEFF] hover:-translate-y-1 hover:shadow-xl transition-all duration-300 active:scale-90"
                >
                  <span className="text-4xl">🌙</span>
                  <span className="text-2xl font-bold">睡眠任務</span>
                </button>
              </div>
            ) : testState === 'waiting' ? (
              <div className="space-y-6 bg-white/60 backdrop-blur-md p-10 rounded-[3rem] shadow-xl border-4 border-white">
                <div className="text-6xl mb-4">💤</div>
                <div className="text-5xl font-mono font-bold tracking-tighter text-[#B5E2FA]">
                  {timeLeft}
                </div>
                <p className="text-xl text-gray-500 font-medium mt-4">
                  大腦正在存檔中...<br/>請在 11~14 小時後回來進行測驗！
                </p>
                
                <button
                  onClick={handleAddToCalendar}
                  className="mt-6 w-full flex items-center justify-center space-x-2 bg-white border-2 border-[#B5E2FA] text-[#B5E2FA] py-4 rounded-2xl font-bold hover:bg-[#B5E2FA] hover:text-white transition-all duration-300 active:scale-95 shadow-sm"
                >
                  <span>📅</span>
                  <span>設定 12 小時後的提醒</span>
                </button>
              </div>
            ) : testState === 'ready' ? (
              <button
                onClick={onStartTest}
                className="w-full bg-[#FFB4A2] text-white py-8 rounded-[3rem] shadow-xl border-4 border-white hover:bg-[#FF9F8A] hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 active:scale-90 animate-pulse"
              >
                <span className="text-3xl font-bold">🚨 時間到！進入延遲測驗</span>
              </button>
            ) : (
              <button
                onClick={onTimeout}
                className="w-full bg-gray-200 text-gray-500 py-8 rounded-[3rem] border-4 border-white shadow-lg hover:bg-gray-300 hover:-translate-y-1 transition-all duration-300 active:scale-90"
              >
                <span className="text-3xl font-bold">❌ 已超過有效測驗時間</span>
              </button>
            )}
          </>
        )}
      </div>

      {confirmTask && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl max-w-xs w-full text-center space-y-6 border-4 border-white">
            <div className="text-5xl">{confirmTask === 'daytime' ? '☀️' : '🌙'}</div>
            <h3 className="text-2xl font-bold text-gray-800">
              確定要開始<br/>
              <span className={confirmTask === 'daytime' ? 'text-[#D49A00]' : 'text-[#6B5B95]'}>
                {confirmTask === 'daytime' ? '白日任務' : '睡眠任務'}
              </span>嗎？
            </h3>
            <p className="text-sm text-gray-500 font-medium">
              開始後將進入 5 分鐘的學習階段，中途請勿離開。
            </p>
            <div className="flex flex-col space-y-3">
              <button 
                onClick={() => {
                  onStartTask(confirmTask);
                  setConfirmTask(null);
                }}
                className={`w-full text-white py-3 rounded-full font-bold transition-colors active:scale-90 ${confirmTask === 'daytime' ? 'bg-[#D49A00] hover:bg-[#B38000]' : 'bg-[#6B5B95] hover:bg-[#524576]'}`}
              >
                確定開始
              </button>
              <button 
                onClick={() => setConfirmTask(null)}
                className="w-full bg-gray-100 text-gray-500 py-3 rounded-full font-bold hover:bg-gray-200 transition-colors active:scale-90"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
