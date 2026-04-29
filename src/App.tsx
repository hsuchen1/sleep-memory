import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc, deleteField, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { AppState, UserProfile, TestRecord, TaskType } from './types';
import { getWordSet } from './wordSets';
import { handleFirestoreError, OperationType, shuffleArray } from './utils';
import { motion, AnimatePresence } from 'motion/react';

import Landing from './components/Landing';
import Setup from './components/Setup';
import Dashboard from './components/Dashboard';
import Learning from './components/Learning';
import Distractor from './components/Distractor';
import Testing from './components/Testing';
import Survey from './components/Survey';
import RuleModal from './components/RuleModal';
import DevPanel from './components/DevPanel';

export default function App() {
  const [appState, setAppState] = useState<AppState>('landing');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeRecord, setActiveRecord] = useState<TestRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRules, setShowRules] = useState(false);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  
  // For the current session
  const [currentTaskType, setCurrentTaskType] = useState<TaskType | null>(null);
  const [immediateScore, setImmediateScore] = useState<number | null>(null);
  const [initialLearningTime, setInitialLearningTime] = useState<number>(5 * 60);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [immediateTestWords, setImmediateTestWords] = useState<any[]>([]);
  const [delayedTestWords, setDelayedTestWords] = useState<any[]>([]);

  // Session Storage Persistence
  const SESSION_KEY = 'experiment_progress';
  const APP_VERSION = '1.0';

  useEffect(() => {
    if (appState !== 'landing' && appState !== 'setup' && appState !== 'dashboard') {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        version: APP_VERSION,
        timestamp: Date.now(),
        uid: auth.currentUser?.uid,
        appState,
        currentTaskType,
        immediateScore,
        initialLearningTime,
        immediateTestWords,
        delayedTestWords
      }));
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }, [appState, currentTaskType, immediateScore, initialLearningTime]);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'system', 'config'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.isActive && data.message) {
          setAnnouncement(data.message);
        } else {
          setAnnouncement(null);
        }
      } else {
        setAnnouncement(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const checkLearningState = async (profile: UserProfile, uid: string) => {
    if (profile.learning_start_time && profile.learning_task_type) {
      const startTime = new Date(profile.learning_start_time).getTime();
      const now = Date.now();
      const elapsed = now - startTime;
      const fiveMinutes = 5 * 60 * 1000;

      if (elapsed < fiveMinutes) {
        setCurrentTaskType(profile.learning_task_type);
        setInitialLearningTime(Math.floor((fiveMinutes - elapsed) / 1000));
        setAppState('learning');
      } else {
        // Expired
        alert('您上次的學習已中斷/超時，該次數據作廢。將進入下一回合。');
        const newRound = profile.current_round + 1;
        try {
          await updateDoc(doc(db, 'users', uid), {
            learning_start_time: deleteField(),
            learning_task_type: deleteField(),
            current_round: newRound
          });
          const updatedProfile = { ...profile, current_round: newRound };
          delete updatedProfile.learning_start_time;
          delete updatedProfile.learning_task_type;
          setUserProfile(updatedProfile);
          setAppState('dashboard');
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, 'users');
        }
      }
    } else {
      setAppState('dashboard');
    }
  };

  const reloadUserState = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const profile = userSnap.data() as UserProfile;
        setUserProfile(profile);
        const record = await loadActiveRecord(auth.currentUser.uid);
        if (record) {
          setAppState('dashboard');
        } else {
          // Check Session Storage first
          const savedSession = sessionStorage.getItem(SESSION_KEY);
          if (savedSession) {
            try {
              const parsed = JSON.parse(savedSession);
              const isExpired = Date.now() - parsed.timestamp > 15 * 60 * 1000; // 15 mins max for session recovery
              if (parsed.version === APP_VERSION && !isExpired && parsed.uid === auth.currentUser.uid) {
                setCurrentTaskType(parsed.currentTaskType);
                setImmediateScore(parsed.immediateScore);
                setInitialLearningTime(parsed.initialLearningTime);
                if (parsed.immediateTestWords) setImmediateTestWords(parsed.immediateTestWords);
                if (parsed.delayedTestWords) setDelayedTestWords(parsed.delayedTestWords);
                setAppState(parsed.appState);
                return; // Skip normal checkLearningState
              } else {
                sessionStorage.removeItem(SESSION_KEY);
              }
            } catch (e) {
              console.error("Session parse error", e);
            }
          }
          await checkLearningState(profile, auth.currentUser.uid);
        }
      } else {
        setAppState('setup');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (appState === 'learning' || appState === 'distractor' || appState === 'testing' || appState === 'survey') {
        const msg = '您正在進行測驗，重新整理或離開頁面可能會導致資料遺失或測驗中斷，確定要離開嗎？';
        e.preventDefault();
        e.returnValue = msg;
        return msg;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [appState]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const profile = userSnap.data() as UserProfile;
            setUserProfile(profile);
            const record = await loadActiveRecord(user.uid);
            if (record) {
              setAppState('dashboard');
            } else {
              // Check Session Storage first
              const savedSession = sessionStorage.getItem(SESSION_KEY);
              if (savedSession) {
                try {
                  const parsed = JSON.parse(savedSession);
                  const isExpired = Date.now() - parsed.timestamp > 15 * 60 * 1000; // 15 mins
                  if (parsed.version === APP_VERSION && !isExpired && parsed.uid === user.uid) {
                    setCurrentTaskType(parsed.currentTaskType);
                    setImmediateScore(parsed.immediateScore);
                    setInitialLearningTime(parsed.initialLearningTime);
                    if (parsed.immediateTestWords) setImmediateTestWords(parsed.immediateTestWords);
                    if (parsed.delayedTestWords) setDelayedTestWords(parsed.delayedTestWords);
                    setAppState(parsed.appState);
                    return; // Skip normal checkLearningState
                  } else {
                    sessionStorage.removeItem(SESSION_KEY);
                  }
                } catch (e) {
                  console.error("Session parse error", e);
                }
              }
              await checkLearningState(profile, user.uid);
            }
          } else {
            setAppState('setup');
          }
        } else {
          setAppState('landing');
          setUserProfile(null);
          setActiveRecord(null);
        }
      } catch (error) {
        console.error(error);
        // We don't want to throw here and stop the UI, just log it
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loadActiveRecord = async (uid: string) => {
    try {
      const q = query(
        collection(db, 'TestRecords'),
        where('user_id', '==', uid),
        where('status', '==', 'waiting')
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        const record = { id: doc.id, ...doc.data() } as TestRecord;
        setActiveRecord(record);
        return record;
      } else {
        setActiveRecord(null);
        return null;
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'TestRecords');
      return null;
    }
  };

  const handleSetupComplete = async () => {
    if (!auth.currentUser) return;
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const userSnap = await getDoc(userRef);
    setUserProfile(userSnap.data() as UserProfile);
    setAppState('dashboard');
  };

  const handleStartTask = async (type: TaskType) => {
    if (!auth.currentUser || !userProfile) return;
    const startTime = new Date().toISOString();
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        learning_start_time: startTime,
        learning_task_type: type
      });
      setCurrentTaskType(type);
      setInitialLearningTime(5 * 60);
      setUserProfile({ ...userProfile, learning_start_time: startTime, learning_task_type: type });
      setAppState('learning');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const handleLearningComplete = () => {
    setAppState('distractor');
  };

  const handleDistractorComplete = () => {
    // Shuffle the 30 words and split into immediate and delayed lists
    const currentWords = userProfile ? getWordSet(userProfile.current_round) : [];
    const shuffled = shuffleArray([...currentWords]);
    setImmediateTestWords(shuffled.slice(0, 15));
    setDelayedTestWords(shuffled.slice(15, 30));
    setAppState('testing');
  };

  const handleImmediateTestComplete = async (score: number) => {
    if (!auth.currentUser || !userProfile || !currentTaskType || isSubmitting) return;
    setIsSubmitting(true);
    
    const newRecord: TestRecord = {
      user_id: auth.currentUser.uid,
      user_name: userProfile.name,
      round_number: userProfile.current_round,
      task_type: currentTaskType,
      immediate_score: score,
      immediate_timestamp: new Date().toISOString(),
      delayed_words: delayedTestWords,
      is_valid: true,
      status: 'waiting'
    };

    try {
      const recordId = `${auth.currentUser.uid}_${userProfile.current_round}`;
      const newDocRef = doc(db, 'TestRecords', recordId);
      await setDoc(newDocRef, newRecord);
      
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        learning_start_time: deleteField(),
        learning_task_type: deleteField()
      });
      
      const updatedProfile = { ...userProfile };
      delete updatedProfile.learning_start_time;
      delete updatedProfile.learning_task_type;
      setUserProfile(updatedProfile);

      setActiveRecord({ id: newDocRef.id, ...newRecord });
      sessionStorage.removeItem(SESSION_KEY);
      setAppState('dashboard');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'TestRecords');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelayedTestComplete = (score: number) => {
    setImmediateScore(score); // temporarily store the delayed score here
    setAppState('survey');
  };

  const handleSurveyComplete = async (extraVariable: number) => {
    if (!auth.currentUser || !userProfile || !activeRecord || immediateScore === null || isSubmitting) return;
    setIsSubmitting(true);

    const delayedTimestamp = new Date().toISOString();
    const immediateTime = new Date(activeRecord.immediate_timestamp).getTime();
    const delayedTime = new Date(delayedTimestamp).getTime();
    const intervalHours = (delayedTime - immediateTime) / (1000 * 60 * 60);

    // Check if valid (e.g. between 11 and 14 hours)
    const is_valid = intervalHours >= 11 && intervalHours <= 14;

    try {
      // Update record
      const recordRef = doc(db, 'TestRecords', activeRecord.id!);
      await updateDoc(recordRef, {
        delayed_score: immediateScore,
        delayed_timestamp: delayedTimestamp,
        interval_hours: intervalHours,
        extra_variable: extraVariable,
        is_valid: is_valid,
        status: 'completed'
      });

      // Update user current_round
      const newRound = userProfile.current_round + 1;
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        current_round: newRound
      });

      setUserProfile({ ...userProfile, current_round: newRound });
      setActiveRecord(null);
      setImmediateScore(null);
      sessionStorage.removeItem(SESSION_KEY);
      setAppState('dashboard');
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 5000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'TestRecords');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTimeout = async () => {
    if (!auth.currentUser || !userProfile || !activeRecord) return;
    try {
      const recordRef = doc(db, 'TestRecords', activeRecord.id!);
      await updateDoc(recordRef, {
        is_valid: false,
        status: 'completed'
      });

      const newRound = userProfile.current_round + 1;
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        current_round: newRound
      });

      alert('您已超過 14 小時的有效測驗窗口，本次任務作廢。');
      setUserProfile({ ...userProfile, current_round: newRound });
      setActiveRecord(null);
      setAppState('dashboard');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'TestRecords');
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">載入中...</div>;
  }

  const currentWords = userProfile ? getWordSet(userProfile.current_round) : [];

  return (
    <>
      <AnimatePresence>
        {isSubmitting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center"
          >
            <div className="w-16 h-16 border-4 border-[#FFB4A2] border-t-[#6B5B95] rounded-full animate-spin"></div>
            <p className="mt-6 text-xl font-bold text-[#6B5B95] animate-pulse">送出中...請確保網路通暢</p>
          </motion.div>
        )}
        {announcement && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-0 left-0 right-0 z-[100] bg-[#D49A00] text-white font-bold text-center py-3 px-4 shadow-md"
          >
            📢 {announcement}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.div
          key={appState}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={`min-h-screen ${announcement ? 'pt-12' : ''}`}
        >
          {appState === 'landing' && <Landing />}
          {appState === 'setup' && <Setup onComplete={handleSetupComplete} />}
          {appState === 'dashboard' && userProfile && (
            <Dashboard 
              userProfile={userProfile} 
              activeRecord={activeRecord} 
              onStartTask={handleStartTask}
              onStartTest={() => setAppState('testing')}
              onTimeout={handleTimeout}
            />
          )}
          {appState === 'learning' && (
            <Learning words={currentWords} initialTimeLeft={initialLearningTime} hasAnnouncement={!!announcement} onComplete={handleLearningComplete} />
          )}
          {appState === 'distractor' && (
            <Distractor hasAnnouncement={!!announcement} onComplete={handleDistractorComplete} />
          )}
          {appState === 'testing' && (
            <Testing 
              words={activeRecord ? (activeRecord.delayed_words ? activeRecord.delayed_words as any[] : currentWords) : immediateTestWords} 
              onComplete={activeRecord ? handleDelayedTestComplete : handleImmediateTestComplete} 
            />
          )}
          {appState === 'survey' && activeRecord && (
            <Survey taskType={activeRecord.task_type} onComplete={handleSurveyComplete} />
          )}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {showCelebration && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none"
          >
            <div className="bg-white/90 backdrop-blur-md p-10 rounded-[3rem] shadow-2xl border-4 border-[#FFB4A2] text-center space-y-4">
              <div className="text-8xl animate-bounce">🎉</div>
              <h2 className="text-4xl font-bold text-gray-800">回合完成！</h2>
              <p className="text-xl text-[#FFB4A2] font-bold">太棒了，您又完成了一次挑戰 ✨</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FABs */}
      {appState !== 'learning' && appState !== 'testing' && appState !== 'survey' && appState !== 'distractor' && (
        <div className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 flex flex-col space-y-3 z-50">
          <button 
            className="bg-white/90 backdrop-blur-sm shadow-lg border-2 sm:border-4 border-[#FFE4A0]/30 rounded-full py-2 px-4 sm:py-3 sm:px-6 flex items-center space-x-2 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 active:scale-90"
            onClick={() => setShowRules(true)}
          >
            <span className="text-lg sm:text-xl">📖</span>
            <span className="text-sm sm:text-base font-bold text-gray-700">規則說明</span>
          </button>
          <button 
            className="bg-white/90 backdrop-blur-sm shadow-lg border-2 sm:border-4 border-[#FFE4A0]/30 rounded-full py-2 px-4 sm:py-3 sm:px-6 flex items-center space-x-2 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 active:scale-90"
            onClick={() => alert('聯絡信箱: hsuchen1@g.ncu.edu.tw')}
          >
            <span className="text-lg sm:text-xl">❓</span>
            <span className="text-sm sm:text-base font-bold text-gray-700">聯絡我們</span>
          </button>
        </div>
      )}

      {showRules && <RuleModal onClose={() => setShowRules(false)} />}
      
      {/* Developer Panel */}
      <DevPanel 
        userProfile={userProfile} 
        activeRecord={activeRecord}
        onDataCleared={() => {
          setImmediateScore(null);
          setCurrentTaskType(null);
          reloadUserState();
        }}
        onFastForwarded={() => {
          if (auth.currentUser) {
            loadActiveRecord(auth.currentUser.uid);
          }
        }}
      />
    </>
  );
}
