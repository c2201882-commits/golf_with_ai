
import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { Friend } from '../types';
import { UserPlus, Share2, Check, Trash2, Calendar, ChevronRight, X, Trophy, AlertCircle, RefreshCw, Clock } from 'lucide-react';

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

  // --- AUTO-DETECT CODE FROM URL ---
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
        // Clear the URL parameter without refreshing
        const newurl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.pushState({ path: newurl }, '', newurl);
        
        // Trigger friend add logic
        setFriendCodeInput(code);
        triggerToast("Detected link! Adding friend...", "success");
        setTimeout(() => handleAddFriend(code), 500);
    }
  }, []);

  // Robust UTF-8 to Base64
  const utf8_to_b64 = (str: string) => {
    return window.btoa(unescape(encodeURIComponent(str)));
  };

  const b64_to_utf8 = (str: string) => {
    try {
      const cleaned = str.replace(/[^A-Za-z0-9+/=]/g, "");
      return decodeURIComponent(escape(window.atob(cleaned)));
    } catch (e) {
      throw new Error('Base64 decoding failed');
    }
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
    // Create a deep link if hosted
    const baseUrl = window.location.origin + window.location.pathname;
    const deepLink = `${baseUrl}?code=${code}`;
    const shareMessage = `${t('shareText')}\n\nClick link to sync with me:\n${deepLink}`;
    
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
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(deepLink);
        triggerToast(t('copySuccess'));
      } else {
        throw new Error('Clipboard API unavailable');
      }
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = deepLink;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        triggerToast(t('copySuccess'));
      } catch (e) {
        triggerToast('Copy failed', 'error');
      }
      document.body.removeChild(textArea);
    }
  };

  const handleAddFriend = (manualCode?: string) => {
    const rawInput = manualCode || friendCodeInput.trim();
    if (!rawInput) return;

    setIsSyncing(true);
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
            
            const isUpdate = state.friends.some(f => f.id === decoded.id);
            triggerToast(isUpdate ? "Friend updated!" : t('friendAdded'));
          } else {
            throw new Error('Missing ID or Name');
          }
        } catch (e) {
          triggerToast(t('invalidCode'), 'error');
        } finally {
          setIsSyncing(false);
        }
    }, 600);
  };

  const getRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="px-4 pt-4 pb-24 max-w-2xl mx-auto space-y-6 relative">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">{t('socialHub')}</h2>
        {isSyncing && <RefreshCw size={20} className="text-primary animate-spin" />}
      </div>

      {showToast && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-bounce-short text-white font-bold text-sm ${showToast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {showToast.type === 'success' ? <Check size={18}/> : <AlertCircle size={18}/>}
          {showToast.msg}
        </div>
      )}

      {/* My Profile Sharing Card */}
      <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <div className="text-xs font-black uppercase tracking-widest opacity-70 mb-1">{t('myId')}</div>
                    <div className="text-3xl font-black">{state.golferId}</div>
                </div>
                <div className="bg-white/20 p-2 rounded-2xl backdrop-blur-md">
                    <Trophy size={24} className="text-yellow-300" />
                </div>
            </div>
            
            <button 
                onClick={handleShare}
                className="w-full bg-white text-indigo-600 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg"
            >
                <Share2 size={18} />
                {t('shareMyCode')}
            </button>
            <p className="text-[10px] text-center mt-3 opacity-60 font-medium">Click to generate a sync link for your friends</p>
        </div>
        <div className="absolute top-[-40px] right-[-40px] w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      {/* Add Friend Input */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{t('addFriend')}</div>
          <div className="flex flex-col gap-2">
              <textarea 
                  value={friendCodeInput}
                  onChange={(e) => setFriendCodeInput(e.target.value)}
                  placeholder={t('pasteFriendCode')}
                  className="w-full h-24 bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm focus:outline-none focus:border-primary no-scrollbar resize-none text-gray-700 font-medium"
              />
              <button 
                  onClick={() => handleAddFriend()}
                  disabled={!friendCodeInput.trim() || isSyncing}
                  className="bg-primary text-white py-4 rounded-2xl font-bold shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                  {isSyncing ? <RefreshCw size={18} className="animate-spin" /> : <UserPlus size={18} />}
                  {t('addFriend')} / Sync
              </button>
          </div>
      </div>

      {/* Friends List */}
      <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('friends')} ({state.friends.length})</div>
          </div>
          
          {state.friends.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200 text-gray-400 text-sm">
                  {t('noFriends')}
              </div>
          ) : (
              state.friends.map(friend => (
                  <div key={friend.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col group transition-all hover:shadow-md">
                      <div 
                          onClick={() => setViewingFriend(friend)}
                          className="p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50/50 transition-colors"
                      >
                          <div className="flex items-center gap-4">
                              <div className="relative">
                                  <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-2xl border-2 border-white shadow-inner">
                                      {friend.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
                              </div>
                              <div>
                                  <div className="font-bold text-gray-900 text-lg">{friend.name}</div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter bg-gray-100 px-1.5 py-0.5 rounded">
                                          {friend.rounds.length} {t('roundsArchived')}
                                      </span>
                                      <div className="flex items-center gap-1 text-[10px] text-indigo-400 font-bold">
                                          <Clock size={10} /> {getRelativeTime(friend.lastUpdated)}
                                      </div>
                                  </div>
                              </div>
                          </div>
                          <ChevronRight size={20} className="text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
                      <div className="bg-gray-50/50 px-5 py-3 flex justify-between items-center border-t border-gray-50">
                          <span className="text-[10px] text-gray-400 italic">ID: {friend.id}</span>
                          <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                if(confirm(t('confirmDelete'))) {
                                  dispatch({ type: 'REMOVE_FRIEND', payload: friend.id });
                                }
                              }}
                              className="text-[10px] text-red-400 font-black uppercase tracking-widest flex items-center gap-1 hover:text-red-600 transition-colors"
                          >
                              <Trash2 size={12}/> {t('removeFriend')}
                          </button>
                      </div>
                  </div>
              ))
          )}
      </div>

      {/* Friend Detail Modal */}
      {viewingFriend && (
          <div className="fixed inset-0 z-[110] bg-white animate-fade-in flex flex-col">
              <div className="bg-primary text-white pt-safe-top pb-6 px-4 flex items-center justify-between shadow-lg">
                  <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center font-black text-lg backdrop-blur-md">
                          {viewingFriend.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                          <div className="font-bold text-lg">{viewingFriend.name}</div>
                          <div className="text-[10px] font-bold opacity-70 uppercase tracking-widest flex items-center gap-1">
                              <RefreshCw size={10} /> Updated {getRelativeTime(viewingFriend.lastUpdated)}
                          </div>
                      </div>
                  </div>
                  <button onClick={() => setViewingFriend(null)} className="p-2 bg-white/10 rounded-full backdrop-blur-md"><X size={24} /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                  {viewingFriend.rounds.length === 0 ? (
                      <div className="text-center py-24 text-gray-400">
                          <Trophy size={64} className="mx-auto mb-4 opacity-10" />
                          <p className="font-bold">{t('noHistory')}</p>
                          <p className="text-xs mt-1">Tell your friend to finish a round!</p>
                      </div>
                  ) : (
                      viewingFriend.rounds.map(round => (
                          <div key={round.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 transition-all hover:shadow-md">
                              <div className="flex justify-between items-start mb-4">
                                  <div>
                                      <h3 className="text-xl font-bold text-gray-800">{round.courseName}</h3>
                                      <div className="flex items-center gap-2 text-xs text-gray-400 mt-1 font-medium">
                                          <Calendar size={14} /> {round.date}
                                      </div>
                                  </div>
                                  <div className="text-right">
                                      <div className={`text-3xl font-black leading-none ${round.totalScore - round.totalPar > 0 ? 'text-red-500' : 'text-blue-500'}`}>
                                          {round.totalScore}
                                      </div>
                                      <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">
                                          {round.totalScore - round.totalPar > 0 ? `+${round.totalScore - round.totalPar}` : round.totalScore - round.totalPar === 0 ? 'EVEN' : round.totalScore - round.totalPar}
                                      </div>
                                  </div>
                              </div>
                              <div className="grid grid-cols-6 gap-2 mt-4">
                                  {round.holes.slice(0, 18).map(h => (
                                      <div key={h.holeNumber} className="flex flex-col items-center">
                                          <div className="text-[8px] font-black text-gray-300 uppercase">H{h.holeNumber}</div>
                                          <div className={`w-full aspect-square rounded-xl flex items-center justify-center text-xs font-black border ${h.score < h.par ? 'bg-blue-50 border-blue-100 text-blue-600 shadow-sm' : h.score > h.par ? 'bg-red-50 border-red-100 text-red-600' : 'bg-gray-50 border-gray-100 text-gray-500'}`}>
                                              {h.score}
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      ))
                  )}
              </div>
              <div className="p-4 bg-white border-t pb-safe-bottom">
                  <button onClick={() => setViewingFriend(null)} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold shadow-xl active:scale-[0.98] transition-all">
                      {t('close')}
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};
