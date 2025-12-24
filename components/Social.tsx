
import React, { useState, useEffect, useCallback } from 'react';
import { useGame } from '../context/GameContext';
import { Friend } from '../types';
import { UserPlus, Share2, Check, Trash2, ChevronRight, X, RefreshCw, Clock, Zap, Globe, ShieldCheck, Link as LinkIcon, Copy } from 'lucide-react';

export const Social: React.FC = () => {
  const { state, dispatch, t } = useGame();
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [showToast, setShowToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [viewingFriend, setViewingFriend] = useState<Friend | null>(null);

  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setShowToast({ msg, type });
    setTimeout(() => setShowToast(null), 3000);
  };

  // 穩定的 Unicode Base64
  const safeBtoa = (str: string) => {
    try {
        return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode(parseInt(p1, 16))));
    } catch (e) { return ""; }
  };

  const safeAtob = (str: string) => {
    try {
        return decodeURIComponent(atob(str).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    } catch (e) { return null; }
  };

  const handleAddFriend = useCallback((manualCode?: string) => {
    let rawInput = (manualCode || friendCodeInput).trim();
    if (!rawInput) return;

    // URL 辨識
    if (rawInput.includes('code=')) {
        const urlParams = new URLSearchParams(rawInput.substring(rawInput.indexOf('?')));
        const code = urlParams.get('code');
        if (code) rawInput = code;
    }

    try {
      const decodedStr = safeAtob(rawInput.replace(/[^A-Za-z0-9+/=]/g, ""));
      const data = decodedStr ? JSON.parse(decodedStr) : JSON.parse(rawInput);
      
      if (data.id && data.name) {
        dispatch({ type: 'ADD_FRIEND', payload: data });
        setFriendCodeInput('');
        triggerToast(t('friendAdded'));
        if (manualCode) window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (e) {
      triggerToast(t('invalidCode'), 'error');
    }
  }, [friendCodeInput, dispatch, t]);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code');
    if (code) setTimeout(() => handleAddFriend(code), 500);
  }, [handleAddFriend]);

  const generateMyCode = () => {
    return safeBtoa(JSON.stringify({ id: state.golferId, name: state.userName }));
  };

  const handleShareToFriend = async () => {
    const code = generateMyCode();
    const link = `${window.location.origin}${window.location.pathname}?code=${code}`;
    
    // 優先使用原生分享功能，若不支援則複製到剪貼簿
    if (navigator.share) {
      try {
        await navigator.share({ 
          title: t('shareTitle'), 
          text: t('shareText'), 
          url: link 
        });
      } catch (e) {
        // 如果使用者取消分享，不執行任何動作
      }
    } else {
      await navigator.clipboard.writeText(link);
      triggerToast(t('copySuccess'));
    }
  };

  const getRelativeTime = (time: number) => {
    const diff = Date.now() - time;
    if (diff < 60000) return 'Just now';
    return new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
             <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">Real-time P2P active</span>
          </div>
        </div>
        <button onClick={() => window.location.reload()} className="p-2 text-gray-400 bg-white rounded-xl shadow-sm border border-gray-100 active:rotate-180 transition-transform duration-500"><RefreshCw size={20}/></button>
      </div>

      {showToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 text-sm font-bold border border-white/10 animate-bounce-short">
          <ShieldCheck size={16} className="text-green-400" /> {showToast.msg}
        </div>
      )}

      {/* Profile Card - Simplified */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
        <div className="relative z-10">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <div className="text-[10px] font-black opacity-50 uppercase tracking-widest mb-1">{t('myId')}</div>
                    <div className="text-3xl font-black tracking-tighter">{state.userName}</div>
                </div>
                <div className="bg-white/10 p-4 rounded-3xl backdrop-blur-md border border-white/10">
                  <Globe size={32} className="text-indigo-200" />
                </div>
            </div>
            
            <button 
              onClick={handleShareToFriend} 
              className="w-full bg-white text-indigo-700 font-black py-5 rounded-2xl flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all text-lg"
            >
              <Share2 size={24} /> 
              {t('copy')}
            </button>
        </div>
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
      </div>

      {/* Friends Section */}
      <div className="space-y-4">
          <div className="flex justify-between items-center px-2">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('friends')} ({state.friends.length})</div>
            <div className="text-[10px] font-bold text-indigo-500 uppercase flex items-center gap-1"><Zap size={10} className="text-yellow-400 animate-pulse" /> Auto-Sync Active</div>
          </div>
          
          {state.friends.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100 text-gray-400">
                  <UserPlus size={48} className="mx-auto mb-4 opacity-10" />
                  <p className="font-bold text-sm">{t('noFriends')}</p>
              </div>
          ) : (
              state.friends.map(friend => (
                  <div key={friend.id} className="bg-white rounded-[2rem] p-1 shadow-sm border border-gray-100 hover:shadow-lg transition-all">
                      <div onClick={() => setViewingFriend(friend)} className="p-5 flex items-center justify-between cursor-pointer">
                          <div className="flex items-center gap-4">
                              <div className="relative">
                                  <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-3xl border-2 border-white shadow-inner">{friend.name.charAt(0)}</div>
                                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-white shadow-sm flex items-center justify-center">
                                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                                  </div>
                              </div>
                              <div>
                                  <div className="font-black text-gray-900 text-xl tracking-tight">{friend.name}</div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-[9px] text-white font-black uppercase tracking-widest bg-indigo-500 px-2 py-0.5 rounded-full">{friend.rounds.length} ROUNDS</span>
                                      <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold"><Clock size={12} /> {getRelativeTime(friend.lastUpdated)}</div>
                                  </div>
                              </div>
                          </div>
                          <ChevronRight size={24} className="text-gray-200" />
                      </div>
                  </div>
              ))
          )}
      </div>

      {/* Manual Input */}
      <div className="bg-gray-900 rounded-[2rem] p-6 text-white shadow-xl">
          <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4">{t('addFriend')}</div>
          <div className="flex flex-col gap-3">
              <textarea value={friendCodeInput} onChange={(e) => setFriendCodeInput(e.target.value)} placeholder={t('pasteFriendCode')} className="w-full h-20 bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:border-indigo-500 no-scrollbar text-white font-medium resize-none" />
              <button onClick={() => handleAddFriend()} className="bg-indigo-500 hover:bg-indigo-400 py-4 rounded-xl font-black transition-all flex items-center justify-center gap-2"><UserPlus size={18} /> {t('addFriend')}</button>
          </div>
      </div>

      {/* Friend Detail */}
      {viewingFriend && (
          <div className="fixed inset-0 z-[110] bg-white animate-fade-in flex flex-col">
              <div className="bg-indigo-600 text-white pt-safe-top pb-8 px-6 flex items-center justify-between shadow-xl rounded-b-[3rem]">
                  <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center font-black text-2xl backdrop-blur-md border border-white/10">{viewingFriend.name.charAt(0)}</div>
                      <div>
                          <div className="font-black text-3xl tracking-tighter">{viewingFriend.name}</div>
                          <div className="text-[10px] font-black opacity-60 uppercase tracking-widest">Live Synced {getRelativeTime(viewingFriend.lastUpdated)}</div>
                      </div>
                  </div>
                  <button onClick={() => setViewingFriend(null)} className="p-2 bg-white/10 rounded-full"><X size={28} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50 no-scrollbar pb-24">
                  {viewingFriend.rounds.length === 0 ? (
                      <div className="text-center py-20 text-gray-300 font-bold italic">No records for this friend.</div>
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
                                      <div key={h.holeNumber} className={`w-full aspect-square rounded-xl flex items-center justify-center text-xs font-black border ${h.score < h.par ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>{h.score}</div>
                                  ))}
                              </div>
                          </div>
                      ))
                  )}
                  <button onClick={() => { if(confirm("Remove friend?")) { dispatch({ type: 'REMOVE_FRIEND', payload: viewingFriend.id }); setViewingFriend(null); } }} className="w-full py-4 text-red-500 font-bold text-sm uppercase tracking-widest mt-8">Remove Friend</button>
              </div>
          </div>
      )}
    </div>
  );
};
