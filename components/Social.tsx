import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Friend, FinishedRound } from '../types';
import { UserPlus, Share2, Copy, Check, Trash2, Calendar, User, ChevronRight, X, Trophy } from 'lucide-react';

export const Social: React.FC = () => {
  const { state, dispatch, t } = useGame();
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [viewingFriend, setViewingFriend] = useState<Friend | null>(null);

  const generateMyCode = () => {
    const profile = {
      id: state.golferId,
      name: state.userName,
      rounds: state.pastRounds.slice(0, 10) // Only share last 10 rounds to keep code manageable
    };
    return btoa(JSON.stringify(profile));
  };

  const handleCopyCode = () => {
    const code = generateMyCode();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddFriend = () => {
    try {
      const decoded = JSON.parse(atob(friendCodeInput.trim()));
      if (decoded.id && decoded.name) {
        const newFriend: Friend = {
          id: decoded.id,
          name: decoded.name,
          lastUpdated: Date.now(),
          rounds: decoded.rounds || []
        };
        dispatch({ type: 'ADD_FRIEND', payload: newFriend });
        setFriendCodeInput('');
        alert('Friend added successfully!');
      }
    } catch (e) {
      alert(t('invalidCode'));
    }
  };

  return (
    <div className="px-4 pt-4 pb-24 max-w-2xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">{t('socialHub')}</h2>
      </div>

      {/* My Profile Sharing Card */}
      <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
            <div className="text-xs font-black uppercase tracking-widest opacity-70 mb-1">{t('myId')}</div>
            <div className="text-2xl font-black mb-4">{state.golferId}</div>
            
            <button 
                onClick={handleCopyCode}
                className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
            >
                {copied ? <Check size={18} /> : <Share2 size={18} />}
                {copied ? t('copied') : t('shareMyCode')}
            </button>
        </div>
        <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      {/* Add Friend Input */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{t('addFriend')}</div>
          <div className="flex flex-col gap-2">
              <textarea 
                  value={friendCodeInput}
                  onChange={(e) => setFriendCodeInput(e.target.value)}
                  placeholder={t('pasteFriendCode')}
                  className="w-full h-20 bg-gray-50 border border-gray-100 rounded-xl p-3 text-xs focus:outline-none focus:border-primary no-scrollbar resize-none"
              />
              <button 
                  onClick={handleAddFriend}
                  disabled={!friendCodeInput.trim()}
                  className="bg-primary text-white py-3 rounded-xl font-bold shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                  <UserPlus size={18} /> {t('addFriend')}
              </button>
          </div>
      </div>

      {/* Friends List */}
      <div className="space-y-4">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('friends')} ({state.friends.length})</div>
          
          {state.friends.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200 text-gray-400 text-sm">
                  {t('noFriends')}
              </div>
          ) : (
              state.friends.map(friend => (
                  <div key={friend.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                      <div 
                          onClick={() => setViewingFriend(friend)}
                          className="p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                          <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-xl">
                                  {friend.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                  <div className="font-bold text-gray-900">{friend.name}</div>
                                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                                      {friend.rounds.length} {t('roundsArchived')}
                                  </div>
                              </div>
                          </div>
                          <ChevronRight size={20} className="text-gray-300" />
                      </div>
                      <div className="bg-gray-50 px-5 py-2 flex justify-end">
                          <button 
                              onClick={() => dispatch({ type: 'REMOVE_FRIEND', payload: friend.id })}
                              className="text-[10px] text-red-400 font-black uppercase tracking-widest flex items-center gap-1 hover:text-red-600"
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
          <div className="fixed inset-0 z-50 bg-white animate-fade-in flex flex-col">
              <div className="bg-primary text-white pt-safe-top pb-4 px-4 flex items-center justify-between shadow-md">
                  <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center font-bold">
                          {viewingFriend.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-bold">{viewingFriend.name} - {t('friendRounds')}</span>
                  </div>
                  <button onClick={() => setViewingFriend(null)} className="p-2"><X size={24} /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {viewingFriend.rounds.length === 0 ? (
                      <div className="text-center py-20 text-gray-400">
                          <Trophy size={48} className="mx-auto mb-4 opacity-20" />
                          {t('noHistory')}
                      </div>
                  ) : (
                      viewingFriend.rounds.map(round => (
                          <div key={round.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                              <div className="flex justify-between items-start mb-2">
                                  <div>
                                      <h3 className="text-lg font-bold text-gray-800">{round.courseName}</h3>
                                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                          <Calendar size={12} /> {round.date}
                                      </div>
                                  </div>
                                  <div className="text-right">
                                      <div className={`text-2xl font-black leading-none ${round.totalScore - round.totalPar > 0 ? 'text-red-500' : 'text-blue-500'}`}>
                                          {round.totalScore}
                                      </div>
                                      <div className="text-[10px] text-gray-400 font-bold uppercase">
                                          Total Score
                                      </div>
                                  </div>
                              </div>
                              <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar">
                                  {round.holes.slice(0, 9).map(h => (
                                      <div key={h.holeNumber} className="shrink-0 flex flex-col items-center">
                                          <div className="text-[9px] font-bold text-gray-300">H{h.holeNumber}</div>
                                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold border ${h.score < h.par ? 'bg-blue-50 border-blue-200 text-blue-600' : h.score > h.par ? 'bg-red-50 border-red-200 text-red-600' : 'bg-gray-50 border-gray-100 text-gray-600'}`}>
                                              {h.score}
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      ))
                  )}
              </div>
              <div className="p-4 bg-gray-50 border-t pb-safe-bottom">
                  <button onClick={() => setViewingFriend(null)} className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold">
                      {t('close')}
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};