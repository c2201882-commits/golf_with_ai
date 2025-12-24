
import React, { useState, useEffect, useCallback } from 'react';
import { useGame } from '../context/GameContext';
import { Friend } from '../types';
import { UserPlus, Share2, Check, Trash2, Calendar, ChevronRight, X, Trophy, AlertCircle, RefreshCw, Clock, ClipboardCheck, Zap } from 'lucide-react';

export const Social: React.FC = () => {
  const { state, dispatch, t } = useGame();
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [showToast, setShowToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [viewingFriend, setViewingFriend] = useState<Friend | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncId, setLastSyncId] = useState<string | null>(null);

  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setShowToast({ msg, type });
    setTimeout(() => setShowToast(null), 3000);
  };

  const b64_to_utf8 = (str: string) => {
    try {
      const cleaned = str.replace(/[^A-Za-z0-9+/=]/g, "");
      return decodeURIComponent(escape(window.atob(cleaned)));
    } catch (e) {
      throw new Error('Base64 decoding failed');
    }
  };

  const handleAddFriend = useCallback((manualCode?: string) => {
    const rawInput = manualCode || friendCodeInput.trim();
    if (!rawInput) return;

    setIsSyncing(true);
    // Simulate a bit of network delay for "feel"
    setTimeout(() => {
        try {
          const base64Regex = /[A-Za-z0-9+/]{30,}/g;
          const matches = rawInput.match(base64Regex);
          const codeToDecode = matches ? matches.reduce((a, b) => a.length > b.length ? a : b) : rawInput;

          const decodedStr = b64_to_utf8(codeToDecode);
          const decoded = JSON.parse(decodedStr);
          
          if (decoded.id && decoded.name) {
            const newFriend: Friend = {
              id: decoded.id,
              name: decoded.name,
              lastUpdated: Date.now(),
              rounds: decoded.rounds || []
            };
            dispatch({ type: 'ADD_FRIEND', payload: newFriend });
            setFriendCodeInput('');
            setLastSyncId(decoded.id);
            
            const isUpdate = state.friends.some(f => f.id === decoded.id);
            triggerToast(isUpdate ? `Successfully synced ${decoded.name}!` : t('friendAdded'));
            
            // Clear highlighted sync after 5s
            setTimeout(() => setLastSyncId(null), 5000);
          } else {
            throw new Error('Invalid structure');
          }
        } catch (e) {
          triggerToast(t('invalidCode'), 'error');
        } finally {
          setIsSyncing(false);
        }
    }, 800);
  }, [friendCodeInput, dispatch, state.friends, t]);

  // --- 1. Real-time URL Sync Listener ---
  useEffect(() => {
    const checkUrl = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      if (code) {
        const newurl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.pushState({ path: newurl }, '', newurl);
        handleAddFriend(code);
      }
    };

    checkUrl();
    window.addEventListener('popstate', checkUrl);
    return () => window.removeEventListener('popstate', checkUrl);
  }, [handleAddFriend]);

  // --- 2. Clipboard Smart Sync ---
  useEffect(() => {
    const handleFocus = async () => {
      // Small delay to ensure clipboard is ready
      if (state.view !== 'SOCIAL') return;
      
      try {
        // Only trigger if browser supports and user has interacted
        if (navigator.clipboard && navigator.clipboard.readText) {
          const text = await navigator.clipboard.readText();
          // Check if it's a golf code (contains our specific base64 pattern)
          if (text.includes('GF-') || (text.length > 50 && text.match(/[A-Za-z0-9+/]{30,}/))) {
             if (text !== friendCodeInput) {
                // If it looks like a code, we can auto-fill or just toast
                // To avoid being annoying, we just toast a hint
                triggerToast("Detected golf code in clipboard. Click 'Add' to sync!", "success");
             }
          }
        }
      } catch (e) {
        // Clipboard access might be denied, ignore silently
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [state.view, friendCodeInput]);

  const utf8_to_b64 = (str: string) => {
    return window.btoa(unescape(encodeURIComponent(str)));
  };

  const generateMyCode = () => {
    const profile = {
      id: state.golferId,
      name: state.userName,
      rounds: state.pastRounds.slice(0, 10) 
    };
    return utf8_to_b64(JSON.stringify(profile));
  };

  const handleShare = async () => {
    const code = generateMyCode();
    const baseUrl = window.location.origin + window.location.pathname;
    const deepLink = `${baseUrl}?code=${code}`;
    const shareMessage = `${t('shareText')}\n\nTap to sync with ${state.userName}:\n${deepLink}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: t('shareTitle'),
          text: shareMessage,
        });
        return;
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(deepLink);
      triggerToast(t('copySuccess'));
    } catch (err) {
      triggerToast('Copy failed', 'error');
    }
  };

  const getRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 10000) return 'Just now';
    if (diff < 60000) return 'Seconds ago';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="px-4 pt-4 pb-24 max-w-2xl mx-auto space-y-6 relative">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-gray-900 leading-none">{t('socialHub')}</h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 tracking-widest">Connect & Sync Rounds</p>
        </div>
        <div className="flex items-center gap-2">
           {isSyncing && <div className="flex items-center gap-1 text-[10px] font-bold text-primary animate-pulse"><RefreshCw size={12} className="animate-spin"/> SYNCING...</div>}
        </div>
      </div>

      {showToast && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-bounce-short text-white font-bold text-sm ${showToast.type === 'success' ? 'bg-indigo-600' : 'bg-red-600'}`}>
          {showToast.type === 'success' ? <Zap size={18} fill="currentColor"/> : <AlertCircle size={18}/>}
          {showToast.msg}
        </div>
      )}

      {/* My Profile Sharing Card */}
      <div className="bg-indigo-600 rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-1">{t('myId')}</div>
                    <div className="text-3xl font-black tracking-tighter">{state.golferId}</div>
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 bg-white/10 rounded-full text-[10px] font-bold border border-white/10">
                       <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                       LIVE SYNC ACTIVE
                    </div>
                </div>
                <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md border border-white/10">
                    <Trophy size={28} className="text-yellow-300" />
                </div>
            </div>
            
            <button 
                onClick={handleShare}
                className="w-full bg-white text-indigo-600 font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg group"
            >
                <Share2 size={18} className="group-hover:rotate-12 transition-transform" />
                {t('shareMyCode')}
            </button>
            <p className="text-[10px] text-center mt-3 opacity-60 font-bold uppercase tracking-widest">Share this link to let friends sync your latest rounds</p>
        </div>
        {/* Decorative Circles */}
        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/5 rounded-full"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-32 h-32 bg-indigo-400/20 rounded-full blur-2xl"></div>
      </div>

      {/* Add Friend Input */}
      <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{t('addFriend')} / Sync</div>
              <ClipboardCheck size={14} className="text-gray-300" />
          </div>
          <div className="flex flex-col gap-3">
              <textarea 
                  value={friendCodeInput}
                  onChange={(e) => setFriendCodeInput(e.target.value)}
                  placeholder={t('pasteFriendCode')}
                  className="w-full h-24 bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm focus:outline-none focus:border-primary no-scrollbar resize-none text-gray-700 font-medium placeholder:text-gray-300"
              />
              <button 
                  onClick={() => handleAddFriend()}
                  disabled={!friendCodeInput.trim() || isSyncing}
                  className="bg-gray-900 text-white py-4 rounded-2xl font-black shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                  {isSyncing ? <RefreshCw size={20} className="animate-spin" /> : <UserPlus size={20} />}
                  SYNC NOW
              </button>
          </div>
      </div>

      {/* Friends List */}
      <div className="space-y-4 pb-12">
          <div className="flex justify-between items-center px-2">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{t('friends')} ({state.friends.length})</div>
            <div className="text-[10px] font-bold text-primary flex items-center gap-1"><Zap size={10} fill="currentColor"/> P2P SYNC</div>
          </div>
          
          {state.friends.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-[2rem] border border-dashed border-gray-200 text-gray-400">
                  <UserPlus size={40} className="mx-auto mb-3 opacity-10" />
                  <p className="text-sm font-bold">{t('noFriends')}</p>
                  <p className="text-[10px] mt-1 uppercase tracking-widest font-bold">Ask a friend for their sync link</p>
              </div>
          ) : (
              state.friends.map(friend => {
                  const isJustUpdated = lastSyncId === friend.id;
                  return (
                    <div key={friend.id} className={`bg-white rounded-[2rem] border transition-all overflow-hidden flex flex-col group ${isJustUpdated ? 'border-indigo-500 ring-4 ring-indigo-50 shadow-xl' : 'border-gray-100 shadow-sm hover:shadow-md'}`}>
                        <div 
                            onClick={() => setViewingFriend(friend)}
                            className="p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50/50 transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl border-2 shadow-inner transition-colors ${isJustUpdated ? 'bg-indigo-600 text-white border-indigo-400' : 'bg-gray-50 text-indigo-600 border-white'}`}>
                                        {friend.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-4 border-white shadow-sm flex items-center justify-center">
                                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="font-black text-gray-900 text-lg tracking-tight">{friend.name}</div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[9px] text-indigo-600 font-black uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                                            {friend.rounds.length} {t('roundsArchived')}
                                        </span>
                                        <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold">
                                            <Clock size={10} /> {getRelativeTime(friend.lastUpdated)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {isJustUpdated && <div className="text-[9px] font-black text-indigo-600 uppercase animate-pulse">Updated</div>}
                                <ChevronRight size={20} className="text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                            </div>
                        </div>
                        <div className="bg-gray-50/50 px-6 py-3 flex justify-between items-center border-t border-gray-100">
                            <span className="text-[9px] text-gray-300 font-mono">HASH: {friend.id.split('-')[1]}</span>
                            <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if(confirm(t('confirmDelete'))) {
                                    dispatch({ type: 'REMOVE_FRIEND', payload: friend.id });
                                  }
                                }}
                                className="text-[10px] text-red-300 font-black uppercase tracking-widest flex items-center gap-1 hover:text-red-500 transition-colors"
                            >
                                <Trash2 size={12}/> {t('removeFriend')}
                            </button>
                        </div>
                    </div>
                  );
              })
          )}
      </div>

      {/* Friend Detail Modal */}
      {viewingFriend && (
          <div className="fixed inset-0 z-[110] bg-white animate-fade-in flex flex-col">
              <div className="bg-primary text-white pt-safe-top pb-8 px-6 flex items-center justify-between shadow-lg rounded-b-[3rem]">
                  <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center font-black text-xl backdrop-blur-md border border-white/20 shadow-inner">
                          {viewingFriend.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                          <div className="font-black text-2xl tracking-tighter">{viewingFriend.name}</div>
                          <div className="text-[10px] font-black opacity-70 uppercase tracking-[0.2em] flex items-center gap-1 mt-0.5">
                              <RefreshCw size={10} /> SYNCED {getRelativeTime(viewingFriend.lastUpdated).toUpperCase()}
                          </div>
                      </div>
                  </div>
                  <button onClick={() => setViewingFriend(null)} className="p-2 bg-white/10 rounded-full backdrop-blur-md border border-white/10"><X size={24} /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 pt-8 space-y-4 bg-gray-50/30 no-scrollbar">
                  {viewingFriend.rounds.length === 0 ? (
                      <div className="text-center py-24 text-gray-300">
                          <Trophy size={64} className="mx-auto mb-4 opacity-10" />
                          <p className="font-black uppercase tracking-widest">{t('noHistory')}</p>
                      </div>
                  ) : (
                      viewingFriend.rounds.map(round => (
                          <div key={round.id} className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-6 transition-all hover:shadow-md">
                              <div className="flex justify-between items-start mb-6">
                                  <div>
                                      <h3 className="text-xl font-black text-gray-900 tracking-tight">{round.courseName}</h3>
                                      <div className="flex items-center gap-2 text-xs text-gray-400 mt-1 font-bold">
                                          <Calendar size={14} /> {round.date}
                                      </div>
                                  </div>
                                  <div className="text-right">
                                      <div className={`text-3xl font-black leading-none tracking-tighter ${round.totalScore - round.totalPar > 0 ? 'text-red-500' : 'text-indigo-600'}`}>
                                          {round.totalScore}
                                      </div>
                                      <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">
                                          {round.totalScore - round.totalPar > 0 ? `+${round.totalScore - round.totalPar}` : round.totalScore - round.totalPar === 0 ? 'PAR' : round.totalScore - round.totalPar}
                                      </div>
                                  </div>
                              </div>
                              <div className="grid grid-cols-6 gap-2 mt-4">
                                  {round.holes.slice(0, 18).map(h => (
                                      <div key={h.holeNumber} className="flex flex-col items-center">
                                          <div className="text-[8px] font-black text-gray-300 uppercase mb-1">H{h.holeNumber}</div>
                                          <div className={`w-full aspect-square rounded-xl flex items-center justify-center text-xs font-black border transition-colors ${h.score < h.par ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : h.score > h.par ? 'bg-red-50 border-red-100 text-red-600' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                                              {h.score}
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      ))
                  )}
              </div>
              <div className="p-6 bg-white border-t pb-safe-bottom">
                  <button onClick={() => setViewingFriend(null)} className="w-full bg-gray-900 text-white py-5 rounded-[1.5rem] font-black shadow-xl active:scale-[0.98] transition-all tracking-widest uppercase text-sm">
                      {t('close')}
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};
