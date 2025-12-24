
import React, { useState, useEffect, useCallback } from 'react';
import { useGame } from '../context/GameContext';
import { Friend } from '../types';
import { UserPlus, Share2, Check, Trash2, Calendar, ChevronRight, X, Trophy, AlertCircle, RefreshCw, Clock, Zap, Globe, ShieldCheck } from 'lucide-react';

export const Social: React.FC = () => {
  const { state, dispatch, t } = useGame();
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [showToast, setShowToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [viewingFriend, setViewingFriend] = useState<Friend | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setShowToast({ msg, type });
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleAddFriend = useCallback((manualCode?: string) => {
    const rawInput = manualCode || friendCodeInput.trim();
    if (!rawInput) return;

    setIsSyncing(true);
    try {
      // 嘗試解析代碼 (Base64 或 直接 JSON)
      let decoded;
      try {
        const cleaned = rawInput.replace(/[^A-Za-z0-9+/=]/g, "");
        const decodedStr = decodeURIComponent(escape(window.atob(cleaned)));
        decoded = JSON.parse(decodedStr);
      } catch (e) {
        decoded = JSON.parse(rawInput);
      }
      
      if (decoded.id && decoded.name) {
        const newFriend: Friend = {
          id: decoded.id,
          name: decoded.name,
          lastUpdated: Date.now(),
          rounds: decoded.rounds || []
        };
        dispatch({ type: 'ADD_FRIEND', payload: newFriend });
        setFriendCodeInput('');
        triggerToast(t('friendAdded'));
      }
    } catch (e) {
      triggerToast(t('invalidCode'), 'error');
    } finally {
      setIsSyncing(false);
    }
  }, [friendCodeInput, dispatch, t]);

  const handleShare = async () => {
    const profile = { id: state.golferId, name: state.userName, rounds: state.pastRounds.slice(0, 10) };
    const code = window.btoa(unescape(encodeURIComponent(JSON.stringify(profile))));
    const deepLink = `${window.location.origin}${window.location.pathname}?code=${code}`;
    
    if (navigator.share) {
      await navigator.share({ title: t('shareTitle'), text: `${t('shareText')}\n${deepLink}` });
    } else {
      await navigator.clipboard.writeText(deepLink);
      triggerToast(t('copySuccess'));
    }
  };

  const getRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="px-4 pt-4 pb-24 max-w-2xl mx-auto space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tighter">{t('socialHub')}</h2>
          <div className="flex items-center gap-1.5 mt-1">
             <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
             </div>
             <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">Auto-Sync Active</span>
          </div>
        </div>
        <button 
          onClick={() => window.location.reload()} 
          className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 text-gray-400 active:rotate-180 transition-transform duration-500"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      {showToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-bounce-short text-sm font-bold">
          <ShieldCheck size={16} className="text-green-400" /> {showToast.msg}
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
        <div className="relative z-10">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50 mb-1">{t('myId')}</div>
                    <div className="text-4xl font-black tracking-tighter select-all">{state.golferId}</div>
                </div>
                <div className="bg-white/10 p-4 rounded-3xl backdrop-blur-md border border-white/10">
                    <Globe size={32} className="text-indigo-200" />
                </div>
            </div>
            <button 
                onClick={handleShare}
                className="w-full bg-white text-indigo-700 font-black py-5 rounded-2xl flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all"
            >
                <Share2 size={20} />
                {t('shareMyCode')}
            </button>
        </div>
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors"></div>
      </div>

      {/* Friends Section */}
      <div className="space-y-4">
          <div className="flex justify-between items-center px-2">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('friends')} ({state.friends.length})</div>
            <div className="text-[10px] font-bold text-indigo-500 uppercase flex items-center gap-1">
                <RefreshCw size={10} className="animate-spin" />
                Background Scanning...
            </div>
          </div>
          
          {state.friends.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100 text-gray-400">
                  <UserPlus size={48} className="mx-auto mb-4 opacity-10" />
                  <p className="font-bold text-sm">{t('noFriends')}</p>
              </div>
          ) : (
              state.friends.map(friend => (
                  <div key={friend.id} className="bg-white rounded-[2rem] p-1 shadow-sm border border-gray-100 hover:shadow-lg transition-all">
                      <div 
                          onClick={() => setViewingFriend(friend)}
                          className="p-5 flex items-center justify-between cursor-pointer"
                      >
                          <div className="flex items-center gap-4">
                              <div className="relative">
                                  <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-3xl border-2 border-white shadow-inner">
                                      {friend.name.charAt(0)}
                                  </div>
                                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-white shadow-sm flex items-center justify-center">
                                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                                  </div>
                              </div>
                              <div>
                                  <div className="font-black text-gray-900 text-xl tracking-tight">{friend.name}</div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-[9px] text-white font-black uppercase tracking-widest bg-indigo-500 px-2 py-0.5 rounded-full">
                                          {friend.rounds.length} ROUNDS
                                      </span>
                                      <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold">
                                          <Clock size={12} /> {getRelativeTime(friend.lastUpdated)}
                                      </div>
                                  </div>
                              </div>
                          </div>
                          <ChevronRight size={24} className="text-gray-200" />
                      </div>
                  </div>
              ))
          )}
      </div>

      {/* Manually Add */}
      <div className="bg-gray-900 rounded-[2rem] p-6 text-white shadow-xl">
          <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4">{t('addFriend')}</div>
          <div className="flex flex-col gap-3">
              <textarea 
                  value={friendCodeInput}
                  onChange={(e) => setFriendCodeInput(e.target.value)}
                  placeholder={t('pasteFriendCode')}
                  className="w-full h-20 bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:border-indigo-500 no-scrollbar resize-none text-white font-medium"
              />
              <button 
                  onClick={() => handleAddFriend()}
                  className="bg-indigo-500 hover:bg-indigo-400 py-4 rounded-xl font-black transition-all flex items-center justify-center gap-2"
              >
                  <UserPlus size={18} /> {t('addFriend')}
              </button>
          </div>
          <p className="mt-4 text-[10px] text-gray-500 leading-relaxed italic">
            * Once added, synchronization will happen automatically whenever both you and your friend have the app open. No more link sharing required.
          </p>
      </div>

      {/* Friend Detail Modal */}
      {viewingFriend && (
          <div className="fixed inset-0 z-[110] bg-white animate-fade-in flex flex-col">
              <div className="bg-indigo-600 text-white pt-safe-top pb-8 px-6 flex items-center justify-between shadow-xl rounded-b-[3rem]">
                  <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center font-black text-2xl backdrop-blur-md border border-white/10">
                          {viewingFriend.name.charAt(0)}
                      </div>
                      <div>
                          <div className="font-black text-3xl tracking-tighter">{viewingFriend.name}</div>
                          <div className="text-[10px] font-black opacity-60 uppercase tracking-widest">Synced {getRelativeTime(viewingFriend.lastUpdated)}</div>
                      </div>
                  </div>
                  <button onClick={() => setViewingFriend(null)} className="p-2 bg-white/10 rounded-full"><X size={28} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50 no-scrollbar">
                  {viewingFriend.rounds.length === 0 ? (
                      <div className="text-center py-20 text-gray-400 font-bold">No records found for this player.</div>
                  ) : (
                      viewingFriend.rounds.map(round => (
                          <div key={round.id} className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm animate-slide-up">
                              <div className="flex justify-between items-start mb-6">
                                  <div>
                                      <h3 className="text-xl font-black text-gray-900">{round.courseName}</h3>
                                      <div className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-widest">{round.date}</div>
                                  </div>
                                  <div className="text-4xl font-black text-indigo-600">{round.totalScore}</div>
                              </div>
                              <div className="grid grid-cols-6 gap-2">
                                  {round.holes.slice(0, 18).map(h => (
                                      <div key={h.holeNumber} className="flex flex-col items-center">
                                          <div className="text-[8px] font-black text-gray-300 uppercase mb-1">H{h.holeNumber}</div>
                                          <div className={`w-full aspect-square rounded-xl flex items-center justify-center text-xs font-black border ${h.score < h.par ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                                              {h.score}
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      ))
                  )}
                  <button 
                    onClick={() => {
                        if(confirm("Are you sure you want to remove this friend?")) {
                            dispatch({ type: 'REMOVE_FRIEND', payload: viewingFriend.id });
                            setViewingFriend(null);
                        }
                    }}
                    className="w-full py-4 text-red-500 font-bold text-sm uppercase tracking-widest mt-8"
                  >
                    {t('removeFriend')}
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};
